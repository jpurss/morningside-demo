import type {
  ScopeGuardBucket,
  ScopeGuardClauseCitation,
  ScopeGuardDiplomatResponse,
  ScopeGuardEstimate,
  ScopeGuardExtraction,
  ScopeGuardResponse,
  ScopeGuardTshirtSize,
  ScopeGuardVerdict,
} from "@shared/types";

import { extractSowContext } from "./extract";
import { runScopeGuardAnalysis } from "./openrouter";
import { readSowText } from "./sow";

function normalizeEstimate(size: ScopeGuardTshirtSize): ScopeGuardEstimate {
  if (size === "small") return { size, hours: 2, rationale: "Small change (≈2 hours)." };
  if (size === "medium") return { size, hours: 8, rationale: "Moderate change (≈1 day)." };
  return { size, hours: 20, rationale: "Large change (20+ hours)." };
}

function guessBucket(request: string): ScopeGuardBucket {
  const text = request.toLowerCase();
  if (
    /\b(bug|broken|error|exception|crash|500|fails?)\b/.test(text) ||
    /\b(not working|doesn't work|unable to)\b/.test(text)
  ) {
    return "bug_defect";
  }
  if (
    /\b(how do i|how to|can you clarify|clarify|what does|where do i)\b/.test(text)
  ) {
    return "clarification";
  }
  return "change_request";
}

function keywordOverlapScore(haystack: string, needle: string) {
  const words = needle
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4);
  const set = new Set(words);
  let score = 0;
  for (const w of set) {
    if (haystack.includes(w)) score += 1;
  }
  return score;
}

function isVagueClauseCitation(args: { quote: string; request: string }) {
  const quote = args.quote.trim();
  if (!quote) return true;

  const genericPatterns: RegExp[] = [
    /\bthis document defines\b/i,
    /\bdefines what is included\b/i,
    /\b(in\s+scope)\b/i,
    /\b(out\s+of\s+scope)\b/i,
    /\bmvp\b/i,
  ];

  const isGeneric = genericPatterns.some((re) => re.test(quote));
  const overlap = keywordOverlapScore(quote.toLowerCase(), args.request.toLowerCase());

  // If the quote doesn't overlap the request at all, it's usually not actionable.
  if (overlap <= 0) return true;

  // If it's generic AND only weakly overlaps (e.g. just "export" or "reporting"), prefer a better clause.
  if (isGeneric && overlap <= 1) return true;

  return false;
}

function pickCitation(args: {
  request: string;
  extracted: ScopeGuardExtraction;
  verdict: ScopeGuardVerdict;
}): ScopeGuardClauseCitation {
  const request = args.request.toLowerCase();
  const deliverablesText = args.extracted.deliverables.join("\n").toLowerCase();
  const exclusionsText = args.extracted.exclusions.join("\n").toLowerCase();

  const candidates =
    args.verdict === "out_of_scope" ? args.extracted.exclusions : args.extracted.deliverables;

  let best: string | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const score = keywordOverlapScore(c.toLowerCase(), request);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  if (!best) {
    const fallback =
      args.verdict === "out_of_scope"
        ? args.extracted.exclusions[0]
        : args.extracted.deliverables[0];
    return {
      section: null,
      quote:
        fallback ??
        (args.verdict === "out_of_scope"
          ? "Exclusions section does not explicitly cover this request."
          : "Deliverables section does not explicitly cover this request."),
    };
  }

  // Quick special-case: export-to-CSV vs PDF-only, common demo scenario.
  if (request.includes("csv") && !deliverablesText.includes("csv") && exclusionsText.includes("csv")) {
    const csvClause =
      args.extracted.exclusions.find((x) => x.toLowerCase().includes("csv")) ?? best;
    return { section: null, quote: csvClause };
  }

  return { section: null, quote: best };
}

function fallbackAnalysis(args: {
  request: string;
  extracted: ScopeGuardExtraction;
}): Omit<ScopeGuardResponse, "generatedAt" | "model" | "extracted"> & {
  extracted: ScopeGuardExtraction;
} {
  const bucket = guessBucket(args.request);

  const hasContext = args.extracted.deliverables.length > 0 || args.extracted.exclusions.length > 0;
  const verdict: ScopeGuardVerdict =
    !hasContext
      ? "grey_area"
      : bucket === "change_request"
        ? "out_of_scope"
        : "in_scope";

  const estimate = normalizeEstimate(
    verdict === "out_of_scope" ? "medium" : bucket === "bug_defect" ? "small" : "small",
  );

  const clauseCitation = pickCitation({
    request: args.request,
    extracted: args.extracted,
    verdict,
  });

  const diplomatResponse: ScopeGuardDiplomatResponse =
    verdict === "out_of_scope"
      ? {
          subject: "Re: Feature request — scope review",
          body: [
            "Hi [Client Name],",
            "",
            "Thanks for the request — I reviewed it against our agreed Statement of Work.",
            "This looks like new functionality that isn’t included in the current scope.",
            "",
            `Reference: ${clauseCitation.quote}`,
            "",
            "Happy to put together a quick change order with an updated estimate and timeline. Would you like us to proceed?",
            "",
            "Best,",
            "[Your Name]",
          ].join("\n"),
        }
      : verdict === "grey_area"
        ? {
            subject: "Re: Request — quick scope clarification",
            body: [
              "Hi [Client Name],",
              "",
              "Thanks — I want to make sure we align this with the SOW before we commit engineering time.",
              "Could you confirm the expected behavior and where this fits in the workflow?",
              "",
              "Once confirmed, we’ll advise whether it’s in scope or needs a change order.",
              "",
              "Best,",
              "[Your Name]",
            ].join("\n"),
          }
        : {
            subject: "Re: Request received",
            body: [
              "Hi [Client Name],",
              "",
              "Thanks — this appears to be covered by our current scope. We’ll proceed and share an update once it’s in progress.",
              "",
              "Best,",
              "[Your Name]",
            ].join("\n"),
          };

  return {
    verdict,
    bucket,
    estimate,
    clauseCitation,
    diplomatResponse,
    extracted: args.extracted,
  };
}

export async function analyzeScopeGuard(args: {
  sowFile: File;
  request: string;
  projectPhase?: string | null;
  requestId?: string | null;
}): Promise<ScopeGuardResponse> {
  const startedAt = Date.now();
  const { text } = await readSowText(args.sowFile);
  const extracted = extractSowContext(text);

  try {
    const llm = await runScopeGuardAnalysis({
      sowExcerpt: extracted.excerpt,
      extractedDeliverables: extracted.deliverables,
      extractedExclusions: extracted.exclusions,
      clientRequest: args.request,
      projectPhase: args.projectPhase ?? null,
      requestId: args.requestId ?? null,
    });

    if (llm) {
      const llmExtracted = llm.result.extracted ?? {
        deliverables: [],
        exclusions: [],
      };

      const mergedExtracted: ScopeGuardExtraction = {
        deliverables:
          llmExtracted.deliverables.length > 0
            ? llmExtracted.deliverables
            : extracted.deliverables,
        exclusions:
          llmExtracted.exclusions.length > 0
            ? llmExtracted.exclusions
            : extracted.exclusions,
      };

      const clauseCitation = isVagueClauseCitation({
        quote: llm.result.clauseCitation.quote,
        request: args.request,
      })
        ? pickCitation({
            request: args.request,
            extracted: mergedExtracted,
            verdict: llm.result.verdict as ScopeGuardVerdict,
          })
        : (llm.result.clauseCitation as ScopeGuardClauseCitation);

      return {
        generatedAt: new Date().toISOString(),
        model: llm.model,
        verdict: llm.result.verdict as ScopeGuardVerdict,
        bucket: llm.result.bucket as ScopeGuardBucket,
        estimate: llm.result.estimate as ScopeGuardEstimate,
        clauseCitation,
        diplomatResponse: llm.result.diplomatResponse as ScopeGuardDiplomatResponse,
        extracted: mergedExtracted,
      };
    }

    console.warn("[scope-guard] LLM unavailable; falling back to heuristics.", {
      requestId: args.requestId ?? null,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.warn(
      "[scope-guard] LLM analysis failed; falling back to heuristics:",
      {
        requestId: args.requestId ?? null,
        elapsedMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      },
    );
  }

  const fallback = fallbackAnalysis({ request: args.request, extracted });
  return {
    generatedAt: new Date().toISOString(),
    model: null,
    verdict: fallback.verdict,
    bucket: fallback.bucket,
    estimate: fallback.estimate,
    clauseCitation: fallback.clauseCitation,
    diplomatResponse: fallback.diplomatResponse,
    extracted: fallback.extracted,
  };
}
