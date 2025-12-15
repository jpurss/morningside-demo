import { z } from "zod";

import type { ScopeGuardTshirtSize } from "@shared/types";

const OpenRouterMessage = z.object({
  content: z.union([z.string(), z.array(z.unknown())]).nullable().optional(),
  reasoning: z.string().nullable().optional(),
});

const OpenRouterResponse = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  choices: z.array(z.object({ message: OpenRouterMessage })).min(1),
});

const ScopeGuardLlmSchema = z.object({
  verdict: z.enum(["in_scope", "grey_area", "out_of_scope"]),
  bucket: z.enum(["bug_defect", "clarification", "change_request"]),
  estimate: z.object({
    size: z.enum(["small", "medium", "large"]),
    hours: z.preprocess((value) => {
      if (typeof value === "number") return value;
      if (typeof value === "string") {
        const match = value.match(/(\d+(?:\.\d+)?)/);
        const parsed = match?.[1] ? Number.parseFloat(match[1]) : Number.NaN;
        return Number.isFinite(parsed) ? parsed : value;
      }
      return value;
    }, z.number()),
    rationale: z.string(),
  }),
  clauseCitation: z.object({
    section: z.string().nullable().optional(),
    quote: z.string().min(1),
  }),
  diplomatResponse: z.object({
    subject: z.string().min(1),
    body: z.string().min(1),
  }),
  extracted: z
    .object({
      deliverables: z.array(z.string()).default([]),
      exclusions: z.array(z.string()).default([]),
    })
    .optional(),
});

type ScopeGuardLlmResult = z.infer<typeof ScopeGuardLlmSchema>;

const ScopeGuardEngagementSchema = z.enum([
  "investigate",
  "decline_unrelated",
  "proceed",
  "clarify",
  "propose_change_order",
  "new_project_offer",
]);
type ScopeGuardEngagement = z.infer<typeof ScopeGuardEngagementSchema>;

const ScopeGuardRelatednessSchema = z.enum([
  "in_project",
  "unknown",
  "explicitly_unrelated",
]);
type ScopeGuardRelatedness = z.infer<typeof ScopeGuardRelatednessSchema>;

type ScopeGuardProjectPhase = "design" | "development" | "uat" | "unknown";

const ScopeGuardStageASchema = ScopeGuardLlmSchema.omit({
  diplomatResponse: true,
}).extend({
  engagement: ScopeGuardEngagementSchema,
  relatedness: ScopeGuardRelatednessSchema,
  triageQuestions: z.array(z.string()).default([]),
});

type ScopeGuardStageAResult = z.infer<typeof ScopeGuardStageASchema>;

const ScopeGuardDiplomatSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});

function extractJsonObject(text: string) {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return text.slice(first, last + 1);
}

function repairJsonStringLiterals(text: string) {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i] ?? "";
    if (!inString) {
      if (ch === "\"") inString = true;
      out += ch;
      continue;
    }

    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      out += ch;
      escaped = true;
      continue;
    }

    if (ch === "\"") {
      out += ch;
      inString = false;
      continue;
    }

    // JSON forbids raw newlines in string literals; LLMs sometimes emit them anyway.
    if (ch === "\n") {
      out += "\\n";
      continue;
    }
    if (ch === "\r") {
      out += "\\r";
      continue;
    }
    if (ch === "\t") {
      out += "\\t";
      continue;
    }

    out += ch;
  }

  return out;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(repairJsonStringLiterals(text));
  }
}

function topKeywords(text: string, limit = 10) {
  const words = text
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4);
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, limit);
}

function sizeFromHours(hours: number): ScopeGuardTshirtSize {
  if (!Number.isFinite(hours) || hours <= 0) return "medium";
  if (hours <= 6) return "small";
  if (hours <= 16) return "medium";
  return "large";
}

function defaultEstimate(size: ScopeGuardTshirtSize) {
  if (size === "small") return { size, hours: 2, rationale: "Small change (≈2 hours)." };
  if (size === "medium") return { size, hours: 8, rationale: "Moderate change (≈1 day)." };
  return { size, hours: 20, rationale: "Large change (20+ hours)." };
}

function normalizeProjectPhase(phase?: string | null): ScopeGuardProjectPhase {
  const p = String(phase ?? "").trim().toLowerCase();
  if (!p) return "unknown";
  if (p.startsWith("des")) return "design";
  if (p.startsWith("dev")) return "development";
  if (p.startsWith("uat")) return "uat";
  return "unknown";
}

const POLICY = {
  smallMaxHours: 10,
  changeOrderMaxHours: 20,
  designLargeMaxHours: 40,
} as const;

function applyPhasePolicy(args: {
  phase: ScopeGuardProjectPhase;
  bucket: ScopeGuardLlmResult["bucket"];
  relatedness: ScopeGuardRelatedness;
  estimatedHours: number;
}): { verdict: ScopeGuardLlmResult["verdict"]; engagement: ScopeGuardEngagement } {
  if (args.relatedness === "explicitly_unrelated") {
    return { verdict: "out_of_scope", engagement: "decline_unrelated" };
  }

  if (args.bucket === "bug_defect") {
    return { verdict: "in_scope", engagement: "investigate" };
  }

  if (args.bucket === "clarification") {
    return { verdict: "in_scope", engagement: "clarify" };
  }

  const hours = args.estimatedHours;

  if (args.phase === "design") {
    if (hours > POLICY.designLargeMaxHours) {
      return { verdict: "out_of_scope", engagement: "new_project_offer" };
    }
    return {
      verdict: "grey_area",
      engagement: hours <= POLICY.smallMaxHours ? "clarify" : "propose_change_order",
    };
  }

  // Development/UAT: red unless small; distinguish “change order” vs “new project” by size.
  if (hours <= POLICY.smallMaxHours) {
    return { verdict: "grey_area", engagement: "propose_change_order" };
  }
  if (hours <= POLICY.changeOrderMaxHours) {
    return { verdict: "out_of_scope", engagement: "propose_change_order" };
  }
  return { verdict: "out_of_scope", engagement: "new_project_offer" };
}

function defaultSubjectForVerdict(verdict: ScopeGuardLlmResult["verdict"]) {
  if (verdict === "out_of_scope") return "Re: Feature request — scope review";
  if (verdict === "grey_area") return "Re: Request — quick scope clarification";
  return "Re: Request received";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeUnderscored(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "_")
    .replaceAll(/^_+|_+$/g, "");
}

function normalizeEngagement(value: unknown): ScopeGuardEngagement | null {
  if (typeof value !== "string") return null;
  const normalized = normalizeUnderscored(value);
  if (normalized === "investigate") return "investigate";
  if (normalized === "decline_unrelated" || normalized === "unrelated") return "decline_unrelated";
  if (normalized === "proceed" || normalized === "ship" || normalized === "do_it") return "proceed";
  if (normalized === "clarify" || normalized === "clarification") return "clarify";
  if (
    normalized === "propose_change_order" ||
    normalized === "change_order" ||
    normalized === "estimate" ||
    normalized === "quote"
  ) {
    return "propose_change_order";
  }
  if (
    normalized === "new_project_offer" ||
    normalized === "new_project" ||
    normalized === "separate_project" ||
    normalized === "new_scope"
  ) {
    return "new_project_offer";
  }
  return null;
}

function normalizeRelatedness(value: unknown): ScopeGuardRelatedness | null {
  if (typeof value !== "string") return null;
  const normalized = normalizeUnderscored(value);
  if (normalized === "in_project" || normalized === "related") return "in_project";
  if (normalized === "unknown" || normalized === "unclear") return "unknown";
  if (
    normalized === "explicitly_unrelated" ||
    normalized === "unrelated" ||
    normalized === "out_of_project"
  ) {
    return "explicitly_unrelated";
  }
  return null;
}

function normalizeVerdict(value: unknown): ScopeGuardLlmResult["verdict"] | null {
  if (typeof value !== "string") return null;
  const normalized = normalizeUnderscored(value);
  if (normalized === "in_scope" || normalized.startsWith("in_scope")) return "in_scope";
  if (normalized.includes("in_scope")) return "in_scope";
  if (normalized === "out_of_scope" || normalized.startsWith("out_of_scope")) return "out_of_scope";
  if (normalized.includes("out_of_scope")) return "out_of_scope";
  if (
    normalized === "grey_area" ||
    normalized === "gray_area" ||
    normalized.startsWith("grey_area") ||
    normalized.startsWith("gray_area")
  ) {
    return "grey_area";
  }
  if (normalized.includes("grey_area") || normalized.includes("gray_area")) return "grey_area";
  return null;
}

function normalizeBucket(value: unknown): ScopeGuardLlmResult["bucket"] | null {
  if (typeof value !== "string") return null;
  const normalized = normalizeUnderscored(value);
  if (
    normalized === "bug_defect" ||
    normalized === "clarification" ||
    normalized === "change_request"
  ) {
    return normalized;
  }
  if (normalized.includes("bug") || normalized.includes("defect")) return "bug_defect";
  if (normalized.includes("clarif")) return "clarification";
  if (normalized.includes("change") || normalized.includes("feature") || normalized.includes("new")) {
    return "change_request";
  }
  return null;
}

function normalizeTshirtSize(value: unknown): ScopeGuardTshirtSize | null {
  if (typeof value !== "string") return null;
  const normalized = normalizeUnderscored(value);
  if (normalized === "small") return "small";
  if (normalized === "medium") return "medium";
  if (normalized === "large") return "large";
  if (normalized === "s") return "small";
  if (normalized === "m") return "medium";
  if (normalized === "l") return "large";
  if (normalized.startsWith("sm")) return "small";
  if (normalized.startsWith("med")) return "medium";
  if (normalized.startsWith("lg")) return "large";
  const hasSmall = normalized.includes("small") || normalized.includes("sm");
  const hasMedium = normalized.includes("medium") || normalized.includes("med");
  const hasLarge = normalized.includes("large") || normalized.includes("lg");
  if (hasLarge) return "large";
  if (hasSmall && hasMedium) return "medium";
  if (hasMedium) return "medium";
  if (hasSmall) return "small";
  return null;
}

function parseNumberLike(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.match(/(\d+(?:\.\d+)?)/);
    if (!match?.[1]) return null;
    const parsed = Number.parseFloat(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function messageToText(message: z.infer<typeof OpenRouterMessage> | undefined) {
  if (!message) return "";
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    const parts = message.content
      .map((part) => {
        if (typeof part === "string") return part;
        if (isRecord(part)) {
          const text = part.text ?? part.content ?? part.value;
          if (typeof text === "string") return text;
        }
        return "";
      })
      .filter((p) => p.trim().length > 0);
    if (parts.length > 0) return parts.join("\n");
  }
  if (typeof message.reasoning === "string") return message.reasoning;
  return "";
}

function coerceScopeGuardResult(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;

  const verdict = normalizeVerdict(raw.verdict);
  const bucket = normalizeBucket(raw.bucket ?? raw.classification);

  const estimateLike = raw.estimate ?? raw.estimation;
  const estimateRecord = isRecord(estimateLike) ? estimateLike : null;
  const estimateSize = normalizeTshirtSize(
    estimateRecord?.size ?? estimateRecord?.tshirt ?? estimateLike,
  );
  const estimateHours = parseNumberLike(estimateRecord?.hours);
  const estimateRationale =
    typeof estimateRecord?.rationale === "string" ? estimateRecord.rationale : null;

  const citationLike = raw.clauseCitation ?? raw.clause_citation;
  const citationRecord = isRecord(citationLike) ? citationLike : null;
  const citationQuote =
    typeof citationRecord?.quote === "string"
      ? citationRecord.quote
      : typeof citationLike === "string"
        ? citationLike
        : null;
  const citationSection =
    typeof citationRecord?.section === "string" ? citationRecord.section : null;

  const diplomatLike = raw.diplomatResponse ?? raw.diplomat_response;
  const diplomatRecord = isRecord(diplomatLike) ? diplomatLike : null;
  const diplomatBody =
    typeof diplomatRecord?.body === "string"
      ? diplomatRecord.body
      : typeof diplomatLike === "string"
        ? diplomatLike
        : null;
  const diplomatSubject =
    typeof diplomatRecord?.subject === "string"
      ? diplomatRecord.subject
      : verdict
        ? defaultSubjectForVerdict(verdict)
        : null;

  const extractedLike = raw.extracted;
  const extractedRecord = isRecord(extractedLike) ? extractedLike : null;

  return {
    verdict,
    bucket,
    estimate: estimateSize
      ? {
          ...defaultEstimate(estimateSize),
          hours: estimateHours ?? defaultEstimate(estimateSize).hours,
          rationale: estimateRationale ?? defaultEstimate(estimateSize).rationale,
          size: estimateSize,
        }
      : undefined,
    clauseCitation: citationQuote ? { section: citationSection, quote: citationQuote } : undefined,
    diplomatResponse: diplomatBody
      ? { subject: diplomatSubject ?? "Re: Request", body: diplomatBody }
      : undefined,
    extracted: extractedRecord
      ? {
          deliverables: Array.isArray(extractedRecord.deliverables)
            ? extractedRecord.deliverables.filter((x): x is string => typeof x === "string")
            : [],
          exclusions: Array.isArray(extractedRecord.exclusions)
            ? extractedRecord.exclusions.filter((x): x is string => typeof x === "string")
            : [],
        }
      : undefined,
  };
}

function coerceStageAResult(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;

  const base = coerceScopeGuardResult(raw);
  const baseRecord = isRecord(base) ? base : {};

  const bucket =
    "bucket" in baseRecord && typeof baseRecord.bucket === "string"
      ? normalizeBucket(baseRecord.bucket) ?? null
      : null;
  const verdict =
    "verdict" in baseRecord && typeof baseRecord.verdict === "string"
      ? normalizeVerdict(baseRecord.verdict) ?? null
      : null;

  const engagementInput = normalizeEngagement(
    raw.engagement ?? raw.action ?? raw.nextStep ?? raw.next_step ?? raw.recommendation,
  );
  const relatednessInput = normalizeRelatedness(
    raw.relatedness ?? raw.related_to_project ?? raw.related,
  );

  const triageRaw =
    raw.triageQuestions ?? raw.triage_questions ?? raw.questions ?? raw.details_needed ?? [];
  const triageQuestions = Array.isArray(triageRaw)
    ? triageRaw.filter((x): x is string => typeof x === "string").slice(0, 8)
    : typeof triageRaw === "string"
      ? triageRaw
          .split(/\r?\n+/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
          .slice(0, 8)
      : [];

  const engagementFallback: ScopeGuardEngagement =
    bucket === "bug_defect"
      ? "investigate"
      : bucket === "change_request"
        ? verdict === "in_scope"
          ? "proceed"
          : "propose_change_order"
        : bucket === "clarification"
          ? "clarify"
          : "clarify";

  const relatednessFallback: ScopeGuardRelatedness = bucket === "bug_defect" ? "unknown" : "in_project";

  return {
    ...baseRecord,
    engagement: engagementInput ?? engagementFallback,
    relatedness: relatednessInput ?? relatednessFallback,
    triageQuestions,
  };
}

function parseStageAResult(rawJson: unknown): {
  result: ScopeGuardStageAResult;
  coerced: boolean;
} {
  const strict = ScopeGuardStageASchema.safeParse(rawJson);
  if (strict.success) return { result: strict.data, coerced: false };

  const coerced = coerceStageAResult(rawJson);
  const validated = ScopeGuardStageASchema.safeParse(coerced);
  if (!validated.success) {
    const keys = isRecord(rawJson) ? Object.keys(rawJson) : [];
    console.warn("[openrouter] Scope Guard stage-A validation failed:", {
      keys,
      issues: validated.error.issues,
    });
    throw new Error(
      `LLM response validation failed: ${validated.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  return { result: validated.data, coerced: true };
}

function bugTriageDefaults() {
  return [
    "What browser/device are you using?",
    "Rough time of occurrence (and timezone)?",
    "Steps to reproduce (if known)?",
    "Any screenshots or console/network errors?",
    "Whether it happens for all users or specific accounts?",
  ];
}

function bugSubjectFromRequest(request: string) {
  const text = request.toLowerCase();
  if (text.includes("login")) return "Regarding the reported login issue";
  if (/\b500\b/.test(text)) return "Regarding the reported 500 error";
  if (text.includes("error") || text.includes("fails") || text.includes("crash")) {
    return "Regarding the reported issue";
  }
  return "Regarding your report";
}

export async function runScopeGuardAnalysis(args: {
  sowExcerpt: string;
  extractedDeliverables: string[];
  extractedExclusions: string[];
  clientRequest: string;
  projectPhase?: string | null;
  requestId?: string | null;
}): Promise<{ model: string; result: ScopeGuardLlmResult } | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn(
      "[scope-guard] LLM disabled (missing OPENROUTER_API_KEY)",
      args.requestId ? { requestId: args.requestId } : undefined,
    );
    return null;
  }

  const model = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";

	const stageASystem = [
	    "You are Scope Guard, an impartial arbiter between a signed Statement of Work (SOW) and a new client request.",
	    "Classify the request and produce a traffic-light verdict based only on the provided SOW excerpt.",
	    "",
	    "Return JSON only (no markdown fences).",
	    "",
	    "Output schema (keys must match exactly; no snake_case):",
	    JSON.stringify(
	      {
	        engagement:
	          "investigate | decline_unrelated | proceed | clarify | propose_change_order | new_project_offer",
	        relatedness: "in_project | unknown | explicitly_unrelated",
	        verdict: "in_scope | grey_area | out_of_scope",
	        bucket: "bug_defect | clarification | change_request",
	        estimate: { size: "small | medium | large", hours: 12, rationale: "string" },
	        clauseCitation: { section: null, quote: "verbatim SOW quote" },
	        extracted: { deliverables: ["..."], exclusions: ["..."] },
	        triageQuestions: ["optional strings (bugs only)"],
	      },
	      null,
	      2,
	    ),
	    "Rules:",
	    "- Use the exact key names above (camelCase).",
	    "- Always include all keys except `extracted` (optional).",
	    "- `estimate.hours` must be a single NUMBER of engineering hours (no ranges, no strings). Round to a whole number.",
	    "- `estimate.size` must be exactly one of: small|medium|large (no combined sizes).",
	    "- `clauseCitation.quote` must be a short verbatim snippet from the excerpt that directly supports the verdict.",
	    "- The quote must be specific: it should mention the feature/domain in question (or the closest relevant deliverable/exclusion).",
	    "- Never use generic preamble text as the quote (e.g. 'This document defines…', 'In Scope/Out of Scope…').",
	    "- If the excerpt does not explicitly mention the request, set verdict=grey_area and cite the closest relevant language.",
	    "",
	    "Engagement policy:",
	    "- If the request is a bug/defect report: set bucket=bug_defect.",
	    "- For bugs: set engagement=investigate unless it is explicitly unrelated to the project you are building.",
	    "- Only set engagement=decline_unrelated when the request clearly concerns a different system/vendor/unrelated work.",
	    "- Keep triageQuestions short and practical when bucket=bug_defect (max 5).",
	    "",
	    "Avoid duplication across cards:",
	    "- `estimate.rationale` is for Engineering Impact ONLY (what work drives the size, assumptions/risks).",
	    "- Do NOT restate the clause citation or re-litigate scope in `estimate.rationale`.",
	    "",
	    "Effort rubric (examples):",
	    "- In Development/UAT phases, include QA/regression, release overhead, and risk buffers (estimates should generally be higher than in Design).",
	    "- CSV export button (new endpoint + formatting + permissions + testing): often 6–16h depending on data size and requirements.",
	    "- Slack notifications (webhook/app auth + event triggers + configuration + retries + security + testing): often 16–40h unless very narrowly scoped.",
	    "- Minor UI tweaks or copy changes: often 1–4h.",
	    "",
	    "Buckets:",
	    "- bug_defect: existing functionality promised in-scope is not working as described.",
	    "- clarification: questions about how an in-scope feature works.",
	    "- change_request: new feature / new deliverable / scope change (out of scope).",
    "",
    "Verdict:",
    "- in_scope: proceed",
    "- out_of_scope: requires change order",
    "- grey_area: insufficient SOW clarity or ambiguous; requires manager review",
    "",
    "Estimation (t-shirt):",
    "- small ≈ 2h, medium ≈ 8h, large ≈ 20h+",
    "",
    "Clause citation rules:",
    "- Quote a short, verbatim snippet from the SOW excerpt that justifies your verdict.",
    "- If you cannot find a supporting quote, set verdict=grey_area and cite the closest relevant language.",
    "- Prefer an explicit exclusion/deliverable line over a general section header.",
    "- Keep the quote under 240 characters.",
  ].join("\n");

  const user = [
    args.projectPhase ? `Project phase: ${args.projectPhase}` : "Project phase: (not provided)",
    "",
    "Incoming client request:",
    args.clientRequest,
    "",
    `Request keywords: ${topKeywords(args.clientRequest).join(", ")}`,
    "",
    "Heuristic extraction (may be incomplete):",
    `Deliverables: ${JSON.stringify(args.extractedDeliverables, null, 2)}`,
    `Exclusions: ${JSON.stringify(args.extractedExclusions, null, 2)}`,
    "",
    "SOW excerpt (quote from THIS text only):",
    args.sowExcerpt,
  ].join("\n");

  const startedAt = Date.now();
  const resA = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost",
      "X-Title": process.env.OPENROUTER_APP_NAME ?? "Deal Shield",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: stageASystem },
        { role: "user", content: user },
      ],
    }),
  });

  if (!resA.ok) {
    const text = await resA.text().catch(() => "");
    throw new Error(
      `OpenRouter request failed (${resA.status}): ${text.slice(0, 400)}`,
    );
  }

  const rawResponseA: unknown = await resA.json();
  const parsedA = OpenRouterResponse.safeParse(rawResponseA);
  if (!parsedA.success) {
    throw new Error("OpenRouter response shape unexpected.");
  }

  const messageA = parsedA.data.choices[0]?.message;
  const contentA = messageToText(messageA).trim();
  const jsonTextA = extractJsonObject(contentA) ?? contentA;

  let rawJson: unknown;
  try {
    rawJson = safeJsonParse(jsonTextA);
  } catch {
    throw new Error("LLM response is not valid JSON");
  }

  const { result: stageA, coerced: coercedA } = parseStageAResult(rawJson);
  if (coercedA) {
    console.warn("[scope-guard] LLM stage-A response coerced to expected schema.", {
      requestId: args.requestId ?? null,
      openrouterId: parsedA.data.id ?? null,
    });
  }

  const phase = normalizeProjectPhase(args.projectPhase);
  const estimatedHoursRaw = stageA.estimate.hours;
  const estimatedHours =
    Number.isFinite(estimatedHoursRaw) && estimatedHoursRaw > 0
      ? Math.round(estimatedHoursRaw)
      : defaultEstimate(stageA.estimate.size as ScopeGuardTshirtSize).hours;

  const derivedSize = sizeFromHours(estimatedHours);
  const policy = applyPhasePolicy({
    phase,
    bucket: stageA.bucket,
    relatedness: stageA.relatedness,
    estimatedHours,
  });

  const stageAWithPolicy: ScopeGuardStageAResult = {
    ...stageA,
    verdict: policy.verdict,
    engagement: policy.engagement,
    estimate: {
      ...stageA.estimate,
      size: derivedSize,
      hours: estimatedHours,
    },
  };

  const triageQuestions =
    stageAWithPolicy.triageQuestions.length > 0
      ? stageAWithPolicy.triageQuestions
      : bugTriageDefaults();

  let diplomatResponse: z.infer<typeof ScopeGuardDiplomatSchema>;
  if (stageAWithPolicy.bucket === "bug_defect" && stageAWithPolicy.engagement === "investigate") {
    diplomatResponse = {
      subject: bugSubjectFromRequest(args.clientRequest),
      body: [
        "Thanks for flagging this.",
        "",
        "We’ll look into it and follow up once we’ve reproduced the issue or have clear next steps.",
        "",
        "In the meantime, could you share:",
        ...triageQuestions.map((q) => `- ${q}`),
      ].join("\n"),
    };
  } else {
    const stageBSystem = [
      "You are Scope Guard. Write a client-facing response email based on the provided internal assessment JSON.",
      "Return JSON only (no markdown fences).",
      "",
      "Output schema:",
      JSON.stringify({ subject: "string", body: "string" }, null, 2),
      "",
      "Hard constraints:",
      "- Keep the tone soft, practical, and concise. No hard ETAs. Avoid words like 'immediately'.",
      "- Never include internal fields, verdicts, or confidence levels in the email.",
      "",
      "Phase-aware guidance for change requests:",
      "- If bucket=change_request and projectPhase=design: collaborative; ask 1-2 clarifying questions; explain we can likely incorporate during design and will reflect impact in an updated plan/SOW if needed.",
      "- If bucket=change_request and projectPhase=development or uat and engagement=propose_change_order: explain it’s not in the current scope/timeline; propose a change order with updated estimate.",
      "- If bucket=change_request and engagement=new_project_offer: explain it’s too large/late-stage for the current engagement; offer to scope it as a separate project.",
      "",
      "Guidance:",
      "- If engagement=propose_change_order: cite the clauseCitation quote briefly (1 sentence), then propose a change order discussion and ask 1-2 scoping questions.",
      "- If engagement=clarify: answer concisely and ask any missing detail. You may cite the quote briefly if helpful.",
      "- If engagement=decline_unrelated: explain why unrelated and suggest who should own it.",
      "- If engagement=new_project_offer: offer a brief scoping call and suggest next steps; avoid sounding dismissive.",
    ].join("\n");

    const stageBUser = [
      `Project phase: ${phase}`,
      "Internal assessment JSON (do not copy verbatim):",
      JSON.stringify(stageAWithPolicy, null, 2),
    ].join("\n");

    const resB = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost",
        "X-Title": process.env.OPENROUTER_APP_NAME ?? "Deal Shield",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: stageBSystem },
          { role: "user", content: stageBUser },
        ],
      }),
    });

    if (!resB.ok) {
      const text = await resB.text().catch(() => "");
      throw new Error(
        `OpenRouter request failed (${resB.status}): ${text.slice(0, 400)}`,
      );
    }

    const rawResponseB: unknown = await resB.json();
    const parsedB = OpenRouterResponse.safeParse(rawResponseB);
    if (!parsedB.success) {
      throw new Error("OpenRouter response shape unexpected.");
    }

    const messageB = parsedB.data.choices[0]?.message;
    const contentB = messageToText(messageB).trim();
    const jsonTextB = extractJsonObject(contentB) ?? contentB;

  let rawJsonB: unknown;
  try {
    rawJsonB = safeJsonParse(jsonTextB);
  } catch {
    throw new Error("LLM response is not valid JSON");
  }

    const diplomatParsed = ScopeGuardDiplomatSchema.safeParse(rawJsonB);
    if (!diplomatParsed.success) {
      console.warn(
        "[openrouter] Scope Guard stage-B validation failed:",
        diplomatParsed.error.issues,
      );
      throw new Error(
        `LLM response validation failed: ${diplomatParsed.error.issues.map((i) => i.message).join(", ")}`,
      );
    }

    diplomatResponse = diplomatParsed.data;
  }

  const elapsedMs = Date.now() - startedAt;
  console.info("[scope-guard] LLM analysis ok.", {
    requestId: args.requestId ?? null,
    openrouterId: parsedA.data.id ?? null,
    model,
    elapsedMs,
    phase,
    policyVerdict: policy.verdict,
    policyEngagement: policy.engagement,
    estimatedHours,
  });

  return {
    model,
    result: {
      ...stageAWithPolicy,
      diplomatResponse,
    },
  };
}
