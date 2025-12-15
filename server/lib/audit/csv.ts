import os from "node:os";
import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import Papa from "papaparse";

import { scanPii } from "./pii";
import { analyzeTextStructure } from "./heuristics";
import type { Finding, FileAuditReport } from "./types";
import { maskPiiInText, maskedExamples } from "./mask";
import { colorFrom, scoreFromFindings } from "./scoring";
import { AUDIT_CONFIG } from "../../../shared/config";

type PandasAudit = {
  row_count: number;
  column_count: number;
  header_issues: string[];
  duplicate_headers: string[];
  missing_row_ratio: number;
  missing_cell_ratio: number;
  sample_rows: Array<Record<string, unknown>>;
};

async function runPandasAudit(tempPath: string): Promise<PandasAudit> {
  const scriptPath = path.resolve(import.meta.dir, "..", "..", "python", "csv_audit.py");

  const pythonCandidates = ["python3", "python"];
  let lastError: string | null = null;

  for (const cmd of pythonCandidates) {
    const proc = Bun.spawn([cmd, scriptPath, tempPath], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    if (exitCode === 0) return JSON.parse(stdout) as PandasAudit;
    lastError = `${cmd} exited ${exitCode}: ${stderr}`.slice(0, 800);
  }

  throw new Error(lastError ?? "Unable to run python for pandas audit.");
}

async function runFallbackAudit(file: File): Promise<PandasAudit> {
  const raw = await file.text();
  const parsed = Papa.parse<Record<string, string>>(raw, {
    header: true,
    dynamicTyping: false,
    preview: 5000,
    skipEmptyLines: "greedy",
  });

  const headers = (parsed.meta.fields ?? []).map((h) => String(h ?? ""));
  const header_issues = headers.filter(
    (h) => h.trim() === "" || h.trim().startsWith("Unnamed:"),
  );

  const counts = new Map<string, number>();
  for (const h of headers) counts.set(h, (counts.get(h) ?? 0) + 1);
  const duplicate_headers = Array.from(counts.entries())
    .filter(([, n]) => n > 1)
    .map(([h]) => h);

  const row_count = parsed.data.length;
  const column_count = headers.length;

  let empty_rows = 0;
  let missing_cells = 0;
  const total_cells = Math.max(1, row_count * Math.max(1, column_count));

  for (const row of parsed.data) {
    let filled = 0;
    for (const h of headers) {
      const val = row?.[h] ?? "";
      if (String(val).trim() === "") {
        missing_cells += 1;
      } else {
        filled += 1;
      }
    }
    if (filled === 0) empty_rows += 1;
  }

  const missing_row_ratio = row_count === 0 ? 1 : empty_rows / row_count;
  const missing_cell_ratio = missing_cells / total_cells;

  const sample_rows = parsed.data.slice(0, 50) as Array<Record<string, unknown>>;

  return {
    row_count,
    column_count,
    header_issues,
    duplicate_headers,
    missing_row_ratio,
    missing_cell_ratio,
    sample_rows,
  };
}

export async function analyzeCsv(file: File): Promise<FileAuditReport> {
  const sizeBytes = file.size;
  const filename = file.name || "uploaded.csv";

  const tmpDir = path.join(os.tmpdir(), "deal-shield");
  await mkdir(tmpDir, { recursive: true });
  const tempPath = path.join(tmpDir, `${Date.now()}-${Math.random().toString(16).slice(2)}.csv`);
  await Bun.write(tempPath, file);

  const findings: Finding[] = [];
  let stats: PandasAudit | null = null;
  let sampleText = "";

  try {
    try {
      stats = await runPandasAudit(tempPath);
    } catch {
      stats = await runFallbackAudit(file);
      findings.push({
        id: "csv.pandas_fallback",
        severity: "info",
        title: "Pandas Unavailable (Fallback Parser)",
        detail:
          "Using a lightweight CSV parser for MVP. Install pandas for the full audit pipeline.",
        penalty: 0,
        errorUnits: 0,
      });
    }

    if (stats.missing_row_ratio > AUDIT_CONFIG.thresholds.sparseRowRatio) {
      findings.push({
        id: "csv.low_quality",
        severity: "warn",
        title: "Low Quality: Sparse Rows",
        detail: `~${Math.round(stats.missing_row_ratio * 100)}% of sampled rows are empty.`,
        penalty: AUDIT_CONFIG.penalties.csvSparseRows,
        errorUnits: Math.min(
          AUDIT_CONFIG.errorUnits.csvSparseRowsMax,
          Math.ceil(stats.missing_row_ratio * 100)
        ),
      });
    }

    if (stats.header_issues.length > 0) {
      findings.push({
        id: "csv.header_issues",
        severity: "warn",
        title: "Headers: Inconsistent",
        detail: `Found suspicious headers: ${stats.header_issues.slice(0, 4).join(", ")}.`,
        penalty: AUDIT_CONFIG.penalties.csvHeaderIssues,
        errorUnits: AUDIT_CONFIG.errorUnits.csvHeaderIssuesBase + stats.header_issues.length,
      });
    }

    if (stats.duplicate_headers.length > 0) {
      findings.push({
        id: "csv.duplicate_headers",
        severity: "warn",
        title: "Headers: Duplicate Columns",
        detail: `Duplicate headers detected: ${stats.duplicate_headers.slice(0, 4).join(", ")}.`,
        penalty: AUDIT_CONFIG.penalties.csvDuplicateHeaders,
        errorUnits: AUDIT_CONFIG.errorUnits.csvDuplicateHeadersBase + stats.duplicate_headers.length,
      });
    }

    if (stats.missing_cell_ratio > AUDIT_CONFIG.thresholds.missingCellRatio) {
      findings.push({
        id: "csv.missing_cells",
        severity: "warn",
        title: "Missing Values: High",
        detail: `~${Math.round(stats.missing_cell_ratio * 100)}% of sampled cells are empty.`,
        penalty: AUDIT_CONFIG.penalties.csvMissingCells,
        errorUnits: Math.min(
          AUDIT_CONFIG.errorUnits.csvMissingCellsMax,
          Math.ceil(stats.missing_cell_ratio * 100)
        ),
      });
    }

    const sampleRows = stats.sample_rows ?? [];
    sampleText = JSON.stringify(sampleRows.slice(0, 50), null, 2);
  } catch (error) {
    findings.push({
      id: "csv.pandas_unavailable",
      severity: "critical",
      title: "CSV Parsing Failed (Pandas)",
      detail:
        error instanceof Error
          ? error.message
          : "Unable to run the pandas CSV audit.",
      penalty: AUDIT_CONFIG.penalties.csvPandasFailed,
      errorUnits: AUDIT_CONFIG.errorUnits.csvPandasFailed,
    });
    sampleText = "";
  } finally {
    await rm(tempPath, { force: true }).catch(() => undefined);
  }

  const pii = scanPii(sampleText);
  if (pii.emails.length > 0 || pii.ssns.length > 0 || pii.creditCards.length > 0) {
    const examples = maskedExamples(pii);
    findings.push({
      id: "pii.detected",
      severity: "critical",
      title: "CRITICAL ALERT: PII Detected",
      detail: `Requires scrubbing. Emails: ${pii.emails.length}, SSNs: ${pii.ssns.length}, Credit cards: ${pii.creditCards.length}. Examples: ${[
        ...examples.emails,
        ...examples.ssns,
        ...examples.creditCards,
      ].slice(0, 3).join(", ")}`,
      penalty: AUDIT_CONFIG.penalties.piiDetected,
      errorUnits: AUDIT_CONFIG.errorUnits.piiDetected,
    });
  }

  const structure = analyzeTextStructure(sampleText);
  if (structure.mixedDateFormats) {
    findings.push({
      id: "structure.mixed_dates",
      severity: "warn",
      title: "Formatting: Mixed Date Formats",
      detail: "Detected multiple date patterns (DD/MM vs MM/DD) in the sample.",
      penalty: AUDIT_CONFIG.penalties.mixedDateFormats,
      errorUnits: AUDIT_CONFIG.errorUnits.mixedDateFormats,
    });
  }
  if (structure.currencySymbols.length > 1) {
    findings.push({
      id: "structure.mixed_currency",
      severity: "warn",
      title: "Formatting: Inconsistent Currency",
      detail: `Detected multiple currency markers: ${structure.currencySymbols.join(", ")}.`,
      penalty: AUDIT_CONFIG.penalties.mixedCurrency,
      errorUnits: AUDIT_CONFIG.errorUnits.mixedCurrency,
    });
  }

  const score = scoreFromFindings(findings);
  const hasCritical = findings.some((f) => f.severity === "critical");
  const color = colorFrom(score, hasCritical);

  const maskedSample = maskPiiInText(sampleText, pii);
  const maskedRowsPreview = (stats?.sample_rows?.slice(0, 10) ?? []).map(
    (row) => {
      const maskedRow: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        maskedRow[key] =
          typeof value === "string" ? maskPiiInText(value, pii) : value;
      }
      return maskedRow;
    },
  );

  return {
    filename,
    kind: "csv",
    sizeBytes,
    stats: stats
      ? {
          rowCount: stats.row_count,
          columnCount: stats.column_count,
          missingRowRatio: stats.missing_row_ratio,
          missingCellRatio: stats.missing_cell_ratio,
          headerIssues: stats.header_issues,
          duplicateHeaders: stats.duplicate_headers,
        }
      : {},
    findings,
    score,
    color,
    sample: {
      rowsPreview: maskedRowsPreview,
      textPreview: maskedSample.slice(0, 5000),
    },
  };
}
