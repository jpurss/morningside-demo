/**
 * Standardized error handling utilities for audit operations
 * Provides consistent error finding creation across all file type analyzers
 */

import type { Finding, Severity } from "./types";
import { AUDIT_CONFIG } from "@shared/config";

export type AuditErrorContext = {
  operation: string;
  fileType: "csv" | "pdf" | "txt" | "unknown";
  error: unknown;
};

/**
 * Extracts a human-readable message from an error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred";
}

/**
 * Creates a standardized error finding for audit failures
 */
export function createErrorFinding(
  id: string,
  severity: Severity,
  title: string,
  error: unknown,
  penalty: number,
  errorUnits: number
): Finding {
  return {
    id,
    severity,
    title,
    detail: getErrorMessage(error),
    penalty,
    errorUnits,
  };
}

/**
 * Creates a CSV parsing error finding
 */
export function createCsvParseError(error: unknown): Finding {
  return createErrorFinding(
    "csv.pandas_unavailable",
    "critical",
    "CSV Parsing Failed (Pandas)",
    error,
    AUDIT_CONFIG.penalties.csvPandasFailed,
    AUDIT_CONFIG.errorUnits.csvPandasFailed
  );
}

/**
 * Creates a PDF parsing error finding
 */
export function createPdfParseError(error: unknown): Finding {
  return createErrorFinding(
    "pdf.parse_failed",
    "critical",
    "PDF Parsing Failed",
    error,
    AUDIT_CONFIG.penalties.pdfNonReadableCritical,
    AUDIT_CONFIG.errorUnits.pdfNonReadable
  );
}

/**
 * Creates a text file reading error finding
 */
export function createTxtReadError(error: unknown): Finding {
  return createErrorFinding(
    "txt.read_failed",
    "critical",
    "Text File Reading Failed",
    error,
    AUDIT_CONFIG.penalties.txtGarbage,
    AUDIT_CONFIG.errorUnits.txtGarbage
  );
}

/**
 * Creates an LLM analysis error finding (non-critical, optional feature)
 */
export function createLlmError(error: unknown): Finding {
  return createErrorFinding(
    "llm.failed",
    "warn",
    "LLM Analysis Unavailable",
    error,
    0, // No penalty - LLM is optional
    0
  );
}

/**
 * Creates a PII detection finding
 */
export function createPiiFinding(
  emailCount: number,
  ssnCount: number,
  ccCount: number,
  examples: string[]
): Finding {
  return {
    id: "pii.detected",
    severity: "critical",
    title: "CRITICAL ALERT: PII Detected",
    detail: `Requires scrubbing. Emails: ${emailCount}, SSNs: ${ssnCount}, Credit cards: ${ccCount}. Examples: ${examples.slice(0, 3).join(", ")}`,
    penalty: AUDIT_CONFIG.penalties.piiDetected,
    errorUnits: AUDIT_CONFIG.errorUnits.piiDetected,
  };
}

/**
 * Wraps an async operation with standardized error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: AuditErrorContext
): Promise<{ result: T; error: null } | { result: null; error: Finding }> {
  try {
    const result = await operation();
    return { result, error: null };
  } catch (error) {
    console.error(`[audit] ${context.operation} failed for ${context.fileType}:`, error);

    const finding = createErrorFinding(
      `${context.fileType}.${context.operation}_failed`,
      "critical",
      `${context.operation} Failed`,
      error,
      AUDIT_CONFIG.penalties.csvPandasFailed, // Default penalty
      AUDIT_CONFIG.errorUnits.csvPandasFailed
    );

    return { result: null, error: finding };
  }
}
