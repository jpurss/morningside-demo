import { z } from "zod";

import type { LlmThreePointRisk } from "./types";
import type { AuditClientNoteType, AuditDiplomatResponse } from "@shared/types";

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

/**
 * Zod schema for validating LLM three-point risk analysis response
 * Ensures the LLM returns properly structured data
 */
const LlmThreePointRiskSchema = z.object({
  pii_compliance: z.object({
    risk: z.enum(["low", "medium", "high", "critical"]),
    output: z.string(),
  }),
  structure_consistency: z.object({
    quality: z.enum(["clean", "mixed", "chaotic"]),
    output: z.string(),
    cleanup_hours: z.number().optional(),
  }),
  context_richness: z.object({
    rag_readiness: z.enum(["high", "medium", "low"]),
    output: z.string(),
  }),
  generated_clause: z.string().nullable().optional(),
});

const AuditClientNoteSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});

const AuditHoursEstimateSchema = z.object({
  estimated_extra_hours: z.preprocess((value) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const match = value.match(/(\d+(?:\.\d+)?)/);
      const parsed = match?.[1] ? Number.parseFloat(match[1]) : Number.NaN;
      return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
  }, z.number()),
});

function extractJsonObject(text: string) {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return text.slice(first, last + 1);
}

export async function runThreePointRiskAnalysis(args: {
  filename: string;
  kind: string;
  maskedSample: string;
  deterministicSignals: Record<string, unknown>;
}): Promise<{ model: string; result: LlmThreePointRisk } | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";
  const system = [
    "You are Deal Shield, a pre-SOW data auditor for an engineering consultancy.",
    "Analyze the provided SAMPLE of a client dataset and return JSON only.",
    "",
    "Return a single JSON object with keys:",
    "- pii_compliance: { risk: low|medium|high|critical, output: string }",
    "- structure_consistency: { quality: clean|mixed|chaotic, output: string, cleanup_hours?: number }",
    "- context_richness: { rag_readiness: high|medium|low, output: string }",
    "- generated_clause?: string|null  (only when risk is yellow-worthy; otherwise null)",
    "",
    "Strict requirements:",
    "- Use exactly these keys (no extras) and use double-quoted JSON.",
    "- All `output` fields must be short strings (<= 240 chars).",
    "- If you include cleanup_hours, it must be a number (hours).",
    "- Always include pii_compliance, structure_consistency, context_richness. Set generated_clause to null if not applicable.",
    "",
    "Rules:",
    "- Be conservative. If any emails/SSNs/credit card numbers are present, set pii_compliance.risk=critical.",
    "- If the sample appears non-machine readable or very low text, set context_richness.rag_readiness=low.",
    "- If dates/currency appear inconsistent, set structure_consistency.quality=chaotic or mixed and estimate cleanup_hours.",
    "- Output valid JSON only (no markdown fences).",
  ].join("\n");

  const user = [
    `Filename: ${args.filename}`,
    `Type: ${args.kind}`,
    "",
    "Deterministic signals (from local scan):",
    JSON.stringify(args.deterministicSignals, null, 2),
    "",
    "Masked sample (PII patterns preserved but redacted):",
    args.maskedSample,
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
      temperature: 0,
      max_tokens: 900,
      include_reasoning: false,
      reasoning: { effort: "low" },
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
  if (!parsed.success) {
    throw new Error("OpenRouter response shape unexpected.");
  }

  const message = parsed.data.choices[0]?.message;
  const outputText = (message?.content ?? "").trim() || (message?.reasoning ?? "").trim();
  const jsonText = extractJsonObject(outputText) ?? outputText;

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(jsonText);
  } catch {
    throw new Error("LLM response is not valid JSON");
  }

  const validated = LlmThreePointRiskSchema.safeParse(rawJson);
  if (!validated.success) {
    console.warn("[openrouter] LLM response validation failed:", validated.error.issues);
    throw new Error(`LLM response validation failed: ${validated.error.issues.map(i => i.message).join(", ")}`);
  }

  return { model, result: validated.data as LlmThreePointRisk };
}

export async function runAuditHoursEstimate(args: {
  heuristicExtraHours: number;
  fileSummaries: Array<{
    filename: string;
    kind: string;
    score: number;
    color: string;
    findings: Array<{ severity: string; title: string }>;
    llm?: LlmThreePointRisk | null;
  }>;
}): Promise<{ model: string; estimatedExtraHours: number } | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";

  const system = [
    "You are Deal Shield, a pre-SOW data auditor for an engineering consultancy.",
    "Estimate the additional engineering hours needed to make the provided data assets ingestion-ready.",
    "Return JSON only (no markdown, no extra keys).",
    "",
    "Return a single JSON object with key:",
    "- estimated_extra_hours: number",
    "",
    "Rules:",
    "- Base your estimate on the issues described in the findings and summaries.",
    "- If the data looks clean, return 0.",
    "- Estimate realistically for an experienced data engineer using scripted/automated solutions.",
    "- Most data transformations (date normalization, currency conversion, PII removal) are batch script operations taking 0.5-1.5 hours each.",
    "- Do not pad estimates - the system will add appropriate buffer for client communication.",
    "- Round to a sensible fraction (e.g. 0.5h).",
  ].join("\n");

  const user = [
    "Heuristic baseline (for calibration only):",
    `- heuristic_extra_hours: ${args.heuristicExtraHours}`,
    "",
    "Files (summaries):",
    JSON.stringify(args.fileSummaries, null, 2),
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
      temperature: 0,
      max_tokens: 300,
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

  const outputText = (parsed.data.choices[0]?.message.content ?? "").trim();
  const jsonText = extractJsonObject(outputText) ?? outputText;

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(jsonText);
  } catch {
    throw new Error("LLM response is not valid JSON");
  }

  const validated = AuditHoursEstimateSchema.safeParse(rawJson);
  if (!validated.success) {
    console.warn("[openrouter] audit-hours validation failed:", validated.error.issues);
    throw new Error(
      `LLM response validation failed: ${validated.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  const estimated = validated.data.estimated_extra_hours;
  const normalized = Math.max(0, Math.round(estimated * 2) / 2);
  return { model, estimatedExtraHours: normalized };
}

export async function runAuditClientNoteDraft(args: {
  noteType: AuditClientNoteType;
  overallHeadline: string;
  overallRationale: string;
  topIssues: string[];
  estimatedExtraHours: number;
  hourlyRateUsd: number;
  consultation?: {
    description: string;
    totalCost: number;
    estimatedHours: number;
  };
}): Promise<{ model: string; result: AuditDiplomatResponse } | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";

  const estimatedCost =
    Math.round(args.estimatedExtraHours * args.hourlyRateUsd * 100) / 100;

  const system = [
    "You are a senior consultant at a premium engineering consultancy writing to a valued client.",
    "Draft a polished, client-ready email based on a data audit summary.",
    "Return JSON only (no markdown, no extra keys).",
    "",
    "Return a single JSON object with keys:",
    '- subject: string (professional, specific, no ALL CAPS or technical jargon)',
    '- body: string',
    "",
    "Voice and tone requirements:",
    "- Write as a trusted advisor, not a vendor.",
    "- Be warm but professional - this is a relationship, not a transaction.",
    "- Avoid technical jargon (no 'RAG', 'ingestion', 'context density', 'chunking').",
    "- Never use phrases like 'SAFE TO SIGN', 'green light', or 'red flag'.",
    "- Use 'we' language to show partnership ('we reviewed', 'we recommend').",
    "- Use placeholders: [Client Name], [Your Name].",
    "",
    "Structure requirements:",
    "- Subject line: Brief, professional, hints at outcome without technical terms.",
    "- Opening: Acknowledge the review is complete, set a positive or neutral tone.",
    "- Body: Clear, scannable, no bullet points unless listing specific items.",
    "- Closing: Clear next step, professional sign-off.",
    "- Length: 8-15 lines of body text (not including signature).",
    "",
    "If noteType=confirmation:",
    "- Lead with good news - the data is well-structured and ready to use.",
    "- Briefly mention what makes it suitable (clean formatting, consistent structure).",
    "- Confirm you're ready to move forward with the next phase.",
    "- Invite them to reach out with any questions.",
    "",
    "If noteType=needs_changes:",
    "- Open neutrally - review complete, found some items to address.",
    "- Explain what needs attention in plain language (avoid technical terms).",
    "- Give 1-2 specific examples from the issues list to make it concrete.",
    "- Present two clear options:",
    "  1. They can address it on their end (briefly explain what that means).",
    "  2. We can handle it as part of the engagement (include exact cost provided).",
    "- Make it easy to respond - ask which option they'd prefer.",
    "",
    "If noteType=needs_consultation:",
    "- Open by acknowledging the review is complete.",
    "- Frame the situation positively: the data has value, but needs a strategic approach.",
    "- Explain in plain language: the content structure means a standard approach won't get the best results.",
    "- Position the consultation as 'designing the right approach for your specific data'.",
    "- Describe what they'll get: a clear strategy, understanding of options, roadmap.",
    "- Include the consultation investment (use exact cost provided).",
    "- Offer a brief call to discuss before committing.",
    "- Tone: this is an opportunity for a better outcome, not a setback.",
  ].join("\n");

  const user = [
    `Email type: ${args.noteType}`,
    "",
    "Review summary (internal - translate to client-friendly language):",
    `- Status: ${args.overallHeadline}`,
    `- Assessment: ${args.overallRationale}`,
    "",
    "Issues found (rephrase in plain language for client):",
    args.topIssues.length > 0
      ? args.topIssues.map((x) => `- ${x}`).join("\n")
      : "- None - data is ready to use",
    "",
    args.consultation
      ? [
          "Recommended next step: Strategy consultation",
          `- Investment: $${args.consultation.totalCost}`,
          `- Duration: ${args.consultation.estimatedHours}-hour working session`,
          "- Deliverable: Custom approach designed for their specific data and goals",
          "- Value: Ensures we build the right solution rather than forcing a generic approach",
        ].join("\n")
      : [
          "Transformation work (if we handle it):",
          `- Estimated effort: ${args.estimatedExtraHours} hours`,
          `- Rate: $${args.hourlyRateUsd}/hour`,
          `- Total investment: $${estimatedCost}`,
        ].join("\n"),
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
      max_tokens: 700,
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

  const outputText = (parsed.data.choices[0]?.message.content ?? "").trim();
  const jsonText = extractJsonObject(outputText) ?? outputText;

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(jsonText);
  } catch {
    throw new Error("LLM response is not valid JSON");
  }

  const validated = AuditClientNoteSchema.safeParse(rawJson);
  if (!validated.success) {
    console.warn("[openrouter] client-note validation failed:", validated.error.issues);
    throw new Error(
      `LLM response validation failed: ${validated.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  return { model, result: validated.data as AuditDiplomatResponse };
}
