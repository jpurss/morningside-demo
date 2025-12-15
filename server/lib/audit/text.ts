import {
  analyzeTextStructure,
  computeContextRichness,
  computeReadability,
} from "./heuristics";
import { maskPiiInText, maskedExamples } from "./mask";
import { scanPii } from "./pii";
import { colorFrom, scoreFromFindings } from "./scoring";
import type { Finding, FileAuditReport } from "./types";
import { AUDIT_CONFIG } from "../../../shared/config";

export async function analyzeTxt(file: File): Promise<FileAuditReport> {
  const sizeBytes = file.size;
  const filename = file.name || "uploaded.txt";

  const text = await file.text();
  const preview = text.slice(0, 8000);
  const findings: Finding[] = [];

  const readability = computeReadability(preview);
  const context = computeContextRichness(preview);
  if (readability.garbageRatio > 0.22) {
    findings.push({
      id: "txt.garbage",
      severity: "warn",
      title: "Non‑Machine Readable Text",
      detail: "Text appears corrupted (high garbage-character ratio).",
      penalty: AUDIT_CONFIG.penalties.txtGarbage,
      errorUnits: AUDIT_CONFIG.errorUnits.txtGarbage,
    });
  }

  const pii = scanPii(preview);
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

  const structure = analyzeTextStructure(preview);
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

  if (context.wordCount < 200 || context.alphaRatio < 0.22) {
    findings.push({
      id: "rag.low_context",
      severity: "warn",
      title: "RAG Readiness: Low Context Density",
      detail: "Sample text is short; retrieval answers may lack context.",
      penalty: AUDIT_CONFIG.penalties.lowRagContextTxt,
      errorUnits: AUDIT_CONFIG.errorUnits.lowRagContextTxt,
      unfixable: true,
      remediation:
        "This issue reflects the inherent nature of the source content. To improve RAG readiness, the client should provide more descriptive documentation or supplementary context files that explain the data semantics.",
    });
  }

  const score = scoreFromFindings(findings);
  const hasCritical = findings.some((f) => f.severity === "critical");
  const color = colorFrom(score, hasCritical);
  const maskedPreview = maskPiiInText(preview, pii);

  return {
    filename,
    kind: "txt",
    sizeBytes,
    stats: {
      textLength: text.length,
      garbageRatio: readability.garbageRatio,
    },
    findings,
    score,
    color,
    sample: { textPreview: maskedPreview.slice(0, 5000) },
  };
}
