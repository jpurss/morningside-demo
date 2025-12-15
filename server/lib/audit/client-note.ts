import { z } from "zod";

import type {
  AuditClientNoteResponse,
  AuditClientNoteType,
  AuditDiplomatResponse,
} from "@shared/types";

import { runAuditClientNoteDraft } from "./openrouter";

export const AuditClientNoteRequestSchema = z.object({
  noteType: z.enum(["confirmation", "needs_changes", "needs_consultation"]),
  overallHeadline: z.string().min(1),
  overallRationale: z.string().min(1),
  topIssues: z.array(z.string()).default([]),
  estimatedExtraHours: z.number(),
  hourlyRateUsd: z.number(),
  consultation: z
    .object({
      description: z.string(),
      totalCost: z.number(),
      estimatedHours: z.number(),
    })
    .optional(),
});

function formatMoneyUsd(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function fallbackDraft(args: {
  noteType: AuditClientNoteType;
  overallHeadline: string;
  topIssues: string[];
  estimatedExtraHours: number;
  hourlyRateUsd: number;
  consultation?: {
    description: string;
    totalCost: number;
    estimatedHours: number;
  };
}): AuditDiplomatResponse {
  const cost = Math.round(args.estimatedExtraHours * args.hourlyRateUsd * 100) / 100;

  if (args.noteType === "confirmation") {
    return {
      subject: "Re: Data assets — ready to proceed",
      body: [
        "Hi [Client Name],",
        "",
        "Thanks for sending the data assets over — they look consistent and ready for the next step.",
        "We'll keep progressing and share an update once ingestion/mapping is underway.",
        "",
        "Best,",
        "[Your Name]",
      ].join("\n"),
    };
  }

  if (args.noteType === "needs_consultation" && args.consultation) {
    return {
      subject: "Re: Data assets — RAG architecture discussion",
      body: [
        "Hi [Client Name],",
        "",
        "Thanks for sending the data assets. After reviewing them, we found that the current structure",
        "isn't well-suited for automated cleanup — the data lacks the contextual richness needed for",
        "effective RAG-based retrieval.",
        "",
        "Rather than standard data transformation, we recommend a brief RAG Architecture Consultation",
        "to explore the best approach for leveraging this data in your workflows.",
        "",
        `Investment: ${formatMoneyUsd(args.consultation.totalCost)} (${args.consultation.estimatedHours}h consultation)`,
        "",
        "This isn't a setback — it's an opportunity to design the right architecture from the start.",
        "Would you like to schedule a brief call to discuss your data strategy?",
        "",
        "Best,",
        "[Your Name]",
      ].join("\n"),
    };
  }

  const issues = args.topIssues.filter((x) => x.trim()).slice(0, 3);
  const issueLines =
    issues.length > 0
      ? issues.map((x) => `- ${x}`).join("\n")
      : "- Some fields and formats are inconsistent across files/rows.";

  return {
    subject: "Re: Data assets — quick structure fixes needed",
    body: [
      "Hi [Client Name],",
      "",
      "Thanks for sending the data assets — we reviewed the current structure and found a few issues that will affect ingestion.",
      "",
      "Top items to address:",
      issueLines,
      "",
      "You can either (1) adjust the structure on your side, or (2) we can add the data transformation work to the SOW.",
      `Estimate: ${args.estimatedExtraHours} hours × ${formatMoneyUsd(args.hourlyRateUsd)}/hr = ${formatMoneyUsd(cost)}.`,
      "",
      "Which option would you prefer — handle it internally, or add it to the SOW for us to implement?",
      "",
      "Best,",
      "[Your Name]",
    ].join("\n"),
  };
}

export async function draftAuditClientNote(args: {
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
}): Promise<AuditClientNoteResponse> {
  const startedAt = Date.now();

  try {
    const llm = await runAuditClientNoteDraft(args);
    if (llm) {
      return {
        generatedAt: new Date().toISOString(),
        model: llm.model,
        noteType: args.noteType,
        diplomatResponse: llm.result,
      };
    }
  } catch (error) {
    console.warn("[audit] client-note LLM failed; falling back to template:", {
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    model: null,
    noteType: args.noteType,
    diplomatResponse: fallbackDraft(args),
  };
}
