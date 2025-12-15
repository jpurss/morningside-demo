import { PDFParse } from "pdf-parse";

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

export async function analyzePdf(file: File): Promise<FileAuditReport> {
  const sizeBytes = file.size;
  const filename = file.name || "uploaded.pdf";

  const buffer = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: buffer });
  const textResult = await parser.getText({ first: 5 });
  await parser.destroy().catch(() => undefined);

  const text = String(textResult.text ?? "").trim();
  const preview = text.slice(0, 8000);

  const findings: Finding[] = [];

  const readability = computeReadability(preview);
  const context = computeContextRichness(preview);
  if (readability.textLength < 200 || readability.garbageRatio > 0.22) {
    findings.push({
      id: "pdf.non_machine_readable",
      severity: readability.textLength < 60 ? "critical" : "warn",
      title: "Non‑Machine Readable PDF",
      detail:
        readability.textLength < 60
          ? "Text extraction is near-empty. Likely scanned/images-only and requires OCR."
          : "Text extraction appears degraded (garbage characters / low signal).",
      penalty: readability.textLength < 60
        ? AUDIT_CONFIG.penalties.pdfNonReadableCritical
        : AUDIT_CONFIG.penalties.pdfNonReadableWarn,
      errorUnits: AUDIT_CONFIG.errorUnits.pdfNonReadable,
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

  if (context.wordCount < 120 || context.alphaRatio < 0.22) {
    findings.push({
      id: "rag.low_context",
      severity: "warn",
      title: "RAG Readiness: Low Context Density",
      detail:
        "The sample is thin or mostly numeric; retrieval answers may lack usable context.",
      penalty: AUDIT_CONFIG.penalties.lowRagContextPdf,
      errorUnits: AUDIT_CONFIG.errorUnits.lowRagContextPdf,
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
    kind: "pdf",
    sizeBytes,
    stats: {
      pages: textResult.total,
      textLength: text.length,
      garbageRatio: readability.garbageRatio,
    },
    findings,
    score,
    color,
    sample: {
      textPreview: maskedPreview.slice(0, 5000),
    },
  };
}
