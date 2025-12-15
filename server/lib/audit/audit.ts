import { analyzeCsv } from "./csv";
import { analyzePdf } from "./pdf";
import { analyzeTxt } from "./text";
import { estimateErrorUnits, headlineFrom } from "./scoring";
import { runAuditHoursEstimate, runThreePointRiskAnalysis } from "./openrouter";
import { createLlmError } from "./errors";
import { AUDIT_CONFIG } from "@shared/config";
import type {
  AuditResponse,
  FileAuditKind,
  FileAuditReport,
  VerdictColor,
} from "./types";

function kindFromFilename(name: string): FileAuditKind {
  const lower = name.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".txt")) return "txt";
  return "unknown";
}

function worstColor(colors: VerdictColor[]): VerdictColor {
  if (colors.includes("red")) return "red";
  if (colors.includes("yellow")) return "yellow";
  return "green";
}

function clauseFromLlm(reports: FileAuditReport[]) {
  const candidates = reports
    .filter((r) => typeof r.llm?.generated_clause === "string")
    .sort((a, b) => {
      const weight = (c: VerdictColor) => (c === "yellow" ? 0 : c === "red" ? 1 : 2);
      return weight(a.color) - weight(b.color);
    });

  for (const r of candidates) {
    const clause = r.llm?.generated_clause;
    if (typeof clause === "string" && clause.trim().length > 0) return clause;
  }

  return null;
}

export async function analyzeAssets(files: File[]): Promise<AuditResponse> {
  const total = files.reduce((sum, f) => sum + f.size, 0);
  if (total > AUDIT_CONFIG.maxUploadBytes) {
    const maxMB = Math.round(AUDIT_CONFIG.maxUploadBytes / 1024 / 1024);
    throw new Error(`Upload too large (max ${maxMB}MB total for MVP).`);
  }

  const reports: FileAuditReport[] = [];

  for (const file of files) {
    const kind = kindFromFilename(file.name);
    let report: FileAuditReport;

    if (kind === "csv") report = await analyzeCsv(file);
    else if (kind === "pdf") report = await analyzePdf(file);
    else if (kind === "txt") report = await analyzeTxt(file);
    else {
      report = {
        filename: file.name || "uploaded",
        kind: "unknown",
        sizeBytes: file.size,
        stats: {},
        findings: [
          {
            id: "file.unsupported",
            severity: "warn",
            title: "Unsupported File Type",
            detail: "Supported types: CSV, PDF, TXT.",
            penalty: AUDIT_CONFIG.penalties.unsupportedFileType,
            errorUnits: AUDIT_CONFIG.errorUnits.unsupportedFileType,
          },
        ],
        score: 100 - AUDIT_CONFIG.penalties.unsupportedFileType,
        color: "yellow",
        sample: {},
      };
    }

    // LLM pass: always send masked sample, plus deterministic scan signals.
    const maskedSample =
      (report.sample.textPreview ?? "").trim() ||
      (report.sample.rowsPreview
        ? JSON.stringify(report.sample.rowsPreview.slice(0, 20), null, 2)
        : "");

    try {
      const llm = await runThreePointRiskAnalysis({
        filename: report.filename,
        kind: report.kind,
        maskedSample: maskedSample.slice(0, AUDIT_CONFIG.llmSampleMaxChars),
        deterministicSignals: {
          score: report.score,
          color: report.color,
          findings: report.findings.map((f) => ({
            severity: f.severity,
            title: f.title,
          })),
          stats: report.stats,
        },
      });
      report.llm = llm?.result ?? null;
    } catch (error) {
      report.llm = null;
      report.findings.push(createLlmError(error));
    }

    // If LLM provides a cleanup hour estimate, translate into margin warning units.
    const llmCleanup = report.llm?.structure_consistency?.cleanup_hours;
    if (typeof llmCleanup === "number" && Number.isFinite(llmCleanup) && llmCleanup > 0) {
      report.stats = { ...report.stats, llmCleanupHours: llmCleanup };
    }

    reports.push(report);
  }

  const overallScore = Math.min(...reports.map((r) => r.score));
  const overallColor = worstColor(reports.map((r) => r.color));

  const totalErrorUnits = reports.reduce(
    (sum, r) => sum + estimateErrorUnits(r.findings),
    0,
  );

  const hourlyRate = Number(process.env.HOURLY_RATE_USD ?? AUDIT_CONFIG.defaultHourlyRate);
  const heuristicExtraHours =
    Math.round((totalErrorUnits * AUDIT_CONFIG.errorUnitsToHoursMultiplier) * 10) /
    10;

  let estimatedExtraHours = heuristicExtraHours;
  try {
    const ai = await runAuditHoursEstimate({
      heuristicExtraHours,
      fileSummaries: reports.map((r) => ({
        filename: r.filename,
        kind: r.kind,
        score: r.score,
        color: r.color,
        findings: r.findings.map((f) => ({ severity: f.severity, title: f.title })),
        llm: r.llm ?? null,
      })),
    });
    if (ai && Number.isFinite(ai.estimatedExtraHours)) {
      estimatedExtraHours = ai.estimatedExtraHours;
    }
  } catch (error) {
    console.warn("[audit] LLM hours estimate failed; using heuristic fallback:", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Apply minimum estimate for non-green audits (consultancy standard)
  if (overallColor !== "green" && estimatedExtraHours > 0) {
    estimatedExtraHours = Math.max(
      AUDIT_CONFIG.minimumEstimateHours,
      Math.round(estimatedExtraHours * 2) / 2 // Round to nearest 0.5
    );
  }

  // Calculate client-facing estimate with buffer for scope creep
  let clientEstimateHours =
    estimatedExtraHours > 0
      ? Math.round(estimatedExtraHours * AUDIT_CONFIG.clientEstimateMultiplier * 2) / 2
      : 0;

  let estimatedExtraCost = Math.round(estimatedExtraHours * hourlyRate * 100) / 100;
  let clientEstimateCost = Math.round(clientEstimateHours * hourlyRate * 100) / 100;

  // Check if primary issue is unfixable RAG context
  const hasUnfixablePrimary = reports.some((r) =>
    r.findings.some((f) => f.unfixable && f.id === "rag.low_context"),
  );

  // Calculate fixable error units (excluding unfixable issues)
  const fixableErrorUnits = reports.reduce(
    (sum, r) =>
      sum + r.findings.filter((f) => !f.unfixable).reduce((s, f) => s + f.errorUnits, 0),
    0,
  );

  // If the ONLY significant issue is unfixable, offer consultation instead
  const requiresConsultation = hasUnfixablePrimary && fixableErrorUnits === 0;

  let consultation: {
    type: "rag_architecture";
    baseFee: number;
    hourlyRate: number;
    estimatedHours: number;
    totalCost: number;
    description: string;
  } | null = null;

  if (requiresConsultation) {
    const config = AUDIT_CONFIG.ragConsultation;
    consultation = {
      type: "rag_architecture",
      baseFee: config.baseFee,
      hourlyRate: config.hourlyRate,
      estimatedHours: config.initialConsultationHours,
      totalCost: config.baseFee + config.hourlyRate * config.initialConsultationHours,
      description: config.description,
    };
    // Zero out hour estimates for consultation mode
    estimatedExtraHours = 0;
    clientEstimateHours = 0;
    estimatedExtraCost = 0;
    clientEstimateCost = 0;
  }

  const generatedClause = clauseFromLlm(reports);
  const headline = headlineFrom(overallColor);
  const rationale =
    overallColor === "green"
      ? "Audit indicates minimal risk and high asset readiness."
      : overallColor === "yellow"
        ? "Audit indicates moderate risk or cleanup effort; sign with caveats."
        : "Audit indicates critical risk or significant cleanup; standardize before signing.";

  return {
    generatedAt: new Date().toISOString(),
    model: process.env.OPENROUTER_MODEL ?? null,
    overall: {
      score: overallScore,
      color: overallColor,
      headline,
      rationale,
      estimatedExtraHours,
      estimatedExtraCost,
      clientEstimateHours,
      clientEstimateCost,
      hourlyRate,
      generatedClause: overallColor === "yellow" ? generatedClause : null,
      requiresConsultation,
      consultation,
    },
    files: reports,
  };
}
