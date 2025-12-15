import { z } from "zod";

import { AUDIT_CONFIG } from "@shared/config";
import type {
  ChangeOrderPack,
  ChangeOrderPackResponse,
  ScopeGuardBucket,
  ScopeGuardClauseCitation,
  ScopeGuardEstimate,
  ScopeGuardVerdict,
} from "@shared/types";

import { readSowText } from "./sow";

const OpenRouterResponse = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string(),
          reasoning: z.string().nullable().optional(),
        }),
      }),
    )
    .min(1),
});

const ChangeOrderPackDraftSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  scope: z.object({
    inclusions: z.array(z.string()).default([]),
    exclusions: z.array(z.string()).default([]),
    assumptions: z.array(z.string()).default([]),
  }),
  timeline: z.object({
    duration: z.string().min(1),
    milestones: z.array(z.string()).default([]),
  }),
  nextQuestions: z.array(z.string()).default([]),
  signature: z.object({
    clientLine: z.string().min(1),
    morningsideLine: z.string().min(1),
  }),
});

function extractJsonObject(text: string) {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return text.slice(first, last + 1);
}

function escapeForPrompt(text: string, limit = 80_000) {
  return String(text ?? "").slice(0, limit);
}

function titleFromRequest(request: string, maxLen = 60) {
  const firstLine = String(request ?? "")
    .trim()
    .split(/\n+/)[0]
    ?.replace(/\s+/g, " ")
    .trim();
  if (!firstLine) return "Change Order";
  if (firstLine.length <= maxLen) return `Change Order: ${firstLine}`;
  return `Change Order: ${firstLine.slice(0, maxLen - 1).trimEnd()}…`;
}

function durationFromHours(hours: number) {
  if (hours <= 4) return "1–2 business days";
  if (hours <= 10) return "2–4 business days";
  if (hours <= 20) return "1–2 weeks";
  if (hours <= 40) return "2–3 weeks";
  return "3–5 weeks";
}

function defaultMilestones() {
  return [
    "Confirm scope + acceptance criteria",
    "Implement + QA",
    "UAT support + rollout",
  ];
}

function fallbackPack(args: {
  client: string;
  projectPhase: string | null;
  request: string;
  clauseCitation: ScopeGuardClauseCitation;
  estimate: { engineeringHours: number; hourlyRateUsd: number; totalUsd: number };
}): Omit<ChangeOrderPack, "client" | "projectPhase" | "estimate" | "clauseCitation"> {
  const title = titleFromRequest(args.request);
  const summary = [
    "This addendum covers a client-requested change that is not included in the current SOW.",
    "It outlines the proposed scope, estimate, and timeline for approval.",
  ].join(" ");

  const scopeInclusions = [
    "Implement the requested change as described in the client request",
    "Update affected API/UI flows and validations",
    "Add automated tests + regression coverage",
    "Coordinate deployment and post-release verification",
  ];

  const scopeExclusions = [
    "Does not include unrelated feature requests discovered during implementation",
    "Third‑party vendor contracts or paid tooling not included unless approved",
  ];

  const assumptions = [
    "Client provides timely access to required systems and stakeholders",
    "Acceptance criteria confirmed before build starts",
  ];

  const nextQuestions = [
    "Who is the primary approver for this change order?",
    "Are there any deadline constraints or release windows we should plan around?",
    "What edge cases or permissions rules should be considered?",
  ];

  return {
    title,
    summary,
    scope: {
      inclusions: scopeInclusions,
      exclusions: scopeExclusions,
      assumptions,
    },
    timeline: {
      duration: durationFromHours(args.estimate.engineeringHours),
      milestones: defaultMilestones(),
    },
    nextQuestions,
    signature: {
      clientLine: "Client Authorized Signer: __________________  Date: __________",
      morningsideLine: "Morningside Authorized Signer: _____________  Date: __________",
    },
  };
}

async function runChangeOrderPackDraft(args: {
  sowText: string;
  request: string;
  client: string;
  projectPhase: string | null;
  analysis: {
    verdict: ScopeGuardVerdict;
    bucket: ScopeGuardBucket;
    estimate: ScopeGuardEstimate;
    clauseCitation: ScopeGuardClauseCitation;
  };
  estimate: { engineeringHours: number; hourlyRateUsd: number; totalUsd: number };
}): Promise<{ model: string; result: z.infer<typeof ChangeOrderPackDraftSchema> } | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";

  const system = [
    "You are Morningside’s senior commercial counsel and deal desk lead.",
    "Draft a one-page SOW addendum (change order pack) that a client can review and sign.",
    "Return JSON only (no markdown, no extra keys).",
    "",
    "Tone: crisp, professional, non-adversarial. Avoid legalese. This is a draft for review (not legal advice).",
    "",
    "Output schema (keys must match exactly):",
    JSON.stringify(
      {
        title: "string",
        summary: "string (2–3 sentences)",
        scope: {
          inclusions: ["bullet strings"],
          exclusions: ["bullet strings"],
          assumptions: ["bullet strings"],
        },
        timeline: {
          duration: "string (e.g., 1–2 weeks)",
          milestones: ["bullet strings"],
        },
        nextQuestions: ["bullet strings"],
        signature: {
          clientLine: "string",
          morningsideLine: "string",
        },
      },
      null,
      2,
    ),
    "",
    "Constraints:",
    "- Keep it approximately one page when rendered: short bullets, no long paragraphs.",
    "- Use the provided estimate numbers exactly; do not invent pricing.",
    "- Reference the provided clauseCitation in scope positioning (but do not paste large SOW sections).",
    "- If key information is missing, use placeholders (e.g., [Client Name], [Effective Date]).",
    "- Prefer 3–6 bullets per list. Keep milestones <= 4 items.",
  ].join("\n");

  const user = [
    `Client: ${args.client}`,
    `Project phase: ${args.projectPhase ?? "(not provided)"}`,
    "",
    "Incoming client request:",
    escapeForPrompt(args.request, 6_000),
    "",
    "Scope Guard analysis (internal):",
    JSON.stringify(
      {
        verdict: args.analysis.verdict,
        bucket: args.analysis.bucket,
        estimate: args.analysis.estimate,
        clauseCitation: args.analysis.clauseCitation,
      },
      null,
      2,
    ),
    "",
    "Commercials (use exactly):",
    JSON.stringify(args.estimate, null, 2),
    "",
    "Original SOW (verbatim; use only as reference):",
    escapeForPrompt(args.sowText, 80_000),
  ].join("\n");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
      max_tokens: 1200,
      include_reasoning: false,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `OpenRouter request failed (${res.status}): ${text.slice(0, 400)}`,
    );
  }

  const parsed = OpenRouterResponse.safeParse(await res.json());
  if (!parsed.success) throw new Error("OpenRouter response shape unexpected.");

  const message = parsed.data.choices[0]?.message;
  const outputText = (message?.content ?? "").trim() || (message?.reasoning ?? "").trim();
  const jsonText = extractJsonObject(outputText) ?? outputText;

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(jsonText);
  } catch {
    throw new Error("LLM response is not valid JSON");
  }

  const validated = ChangeOrderPackDraftSchema.safeParse(rawJson);
  if (!validated.success) {
    console.warn("[openrouter] change-order validation failed:", validated.error.issues);
    throw new Error(
      `LLM response validation failed: ${validated.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  return { model, result: validated.data };
}

export async function draftChangeOrderPack(args: {
  sowFile: File;
  request: string;
  client: string;
  projectPhase: string | null;
  analysis: {
    verdict: ScopeGuardVerdict;
    bucket: ScopeGuardBucket;
    estimate: ScopeGuardEstimate;
    clauseCitation: ScopeGuardClauseCitation;
  };
}): Promise<ChangeOrderPackResponse> {
  const startedAt = Date.now();
  const sow = await readSowText(args.sowFile);

  const hourlyRateUsd = Number(
    process.env.HOURLY_RATE_USD ?? AUDIT_CONFIG.defaultHourlyRate,
  );
  const engineeringHours = Math.max(0, Math.round(args.analysis.estimate.hours));
  const totalUsd = Math.round(engineeringHours * hourlyRateUsd);
  const estimate = { engineeringHours, hourlyRateUsd, totalUsd };

  try {
    const llm = await runChangeOrderPackDraft({
      sowText: sow.text,
      request: args.request,
      client: args.client,
      projectPhase: args.projectPhase,
      analysis: args.analysis,
      estimate,
    });

    if (llm) {
      return {
        generatedAt: new Date().toISOString(),
        model: llm.model,
        pack: {
          client: args.client,
          projectPhase: args.projectPhase,
          title: llm.result.title,
          summary: llm.result.summary,
          scope: llm.result.scope,
          estimate,
          timeline: llm.result.timeline.milestones.length
            ? llm.result.timeline
            : { ...llm.result.timeline, milestones: defaultMilestones() },
          clauseCitation: args.analysis.clauseCitation,
          nextQuestions: llm.result.nextQuestions,
          signature: llm.result.signature,
        } satisfies ChangeOrderPack,
      };
    }
  } catch (error) {
    console.warn("[scope-guard] change-order LLM failed; falling back to template:", {
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const fallback = fallbackPack({
    client: args.client,
    projectPhase: args.projectPhase,
    request: args.request,
    clauseCitation: args.analysis.clauseCitation,
    estimate,
  });

  return {
    generatedAt: new Date().toISOString(),
    model: null,
    pack: {
      client: args.client,
      projectPhase: args.projectPhase,
      ...fallback,
      estimate,
      timeline: fallback.timeline,
      clauseCitation: args.analysis.clauseCitation,
    },
  };
}

