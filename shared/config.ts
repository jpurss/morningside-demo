/**
 * Centralized configuration for Deal Shield audit parameters
 * All magic numbers and thresholds are defined here for easy adjustment
 */

export const AUDIT_CONFIG = {
  /** Maximum total upload size in bytes (30MB) */
  maxUploadBytes: 30 * 1024 * 1024,

  /** Maximum characters to send to LLM for sample analysis */
  llmSampleMaxChars: 10_000,

  /** Maximum characters for text preview in response */
  textPreviewMaxChars: 5_000,

  /** Maximum rows to sample from CSV for preview */
  csvSampleRows: 50,

  /** Maximum rows to include in masked preview */
  maskedPreviewRows: 10,

  /** Default hourly rate for cost estimation (USD) */
  defaultHourlyRate: 150,

  /** Multiplier for converting error units to estimated hours */
  errorUnitsToHoursMultiplier: 0.25,

  /** Multiplier for client estimate (adds buffer for scope creep) */
  clientEstimateMultiplier: 1.5,

  /** Minimum estimate hours for non-green audits (consultancy standard) */
  minimumEstimateHours: 2,

  /** PDF text preview length */
  pdfPreviewChars: 8_000,

  /** TXT text preview length */
  txtPreviewChars: 8_000,

  thresholds: {
    /** Ratio of empty rows that triggers a warning */
    sparseRowRatio: 0.2,

    /** Ratio of missing cells that triggers a warning */
    missingCellRatio: 0.3,

    /** Ratio of garbage characters that indicates non-machine-readable text */
    garbageRatio: 0.22,

    /** Minimum text length before flagging PDF as non-machine-readable */
    pdfMinTextLength: 200,

    /** Text length threshold for critical PDF warning */
    pdfCriticalTextLength: 60,

    /** Minimum word count for RAG context richness */
    minWordCountPdf: 120,
    minWordCountTxt: 200,

    /** Minimum alpha ratio for RAG context richness */
    minAlphaRatio: 0.22,
  },

  penalties: {
    /** PII detected - critical severity */
    piiDetected: 45,

    /** CSV low quality (sparse rows) */
    csvSparseRows: 18,

    /** CSV header issues */
    csvHeaderIssues: 10,

    /** CSV duplicate headers */
    csvDuplicateHeaders: 6,

    /** CSV missing cells */
    csvMissingCells: 12,

    /** CSV pandas parsing failed */
    csvPandasFailed: 40,

    /** PDF non-machine-readable (critical) */
    pdfNonReadableCritical: 35,

    /** PDF non-machine-readable (warning) */
    pdfNonReadableWarn: 18,

    /** TXT garbage content */
    txtGarbage: 15,

    /** Mixed date formats */
    mixedDateFormats: 8,

    /** Mixed currency symbols */
    mixedCurrency: 6,

    /** Low RAG context (PDF) */
    lowRagContextPdf: 10,

    /** Low RAG context (TXT) */
    lowRagContextTxt: 8,

    /** Unsupported file type */
    unsupportedFileType: 20,
  },

  errorUnits: {
    /** PII detected - regex script + validation (~1.5h) */
    piiDetected: 6,

    /** CSV sparse rows - calculated from ratio (up to 4h) */
    csvSparseRowsMax: 16,

    /** CSV header issues base + per issue (~1h+) */
    csvHeaderIssuesBase: 4,

    /** CSV duplicate headers base (~0.75h+) */
    csvDuplicateHeadersBase: 3,

    /** CSV missing cells max (up to 3h) */
    csvMissingCellsMax: 12,

    /** CSV pandas failed - format debugging (~4h) */
    csvPandasFailed: 16,

    /** PDF non-machine-readable - OCR work (~5h) */
    pdfNonReadable: 20,

    /** TXT garbage - encoding fixes (~1.5h) */
    txtGarbage: 6,

    /** Mixed date formats - one transformation (~0.75h) */
    mixedDateFormats: 3,

    /** Mixed currency - one normalization (~0.5h) */
    mixedCurrency: 2,

    /** Low RAG context (PDF) - UNFIXABLE, flag only */
    lowRagContextPdf: 0,

    /** Low RAG context (TXT) - UNFIXABLE, flag only */
    lowRagContextTxt: 0,

    /** Unsupported file type - format conversion (~2h) */
    unsupportedFileType: 8,
  },

  /** RAG consultation pricing for unfixable assets */
  ragConsultation: {
    /** Base consultation fee (USD) */
    baseFee: 500,
    /** Hourly rate for RAG architecture review */
    hourlyRate: 200,
    /** Estimated hours for initial consultation */
    initialConsultationHours: 2,
    /** Description for client communication */
    description: "RAG Architecture Consultation",
  },

  scoring: {
    /** Score threshold for green verdict */
    greenThreshold: 80,

    /** Score threshold for yellow verdict (below this is red) */
    yellowThreshold: 50,
  },
} as const

export type AuditConfig = typeof AUDIT_CONFIG
