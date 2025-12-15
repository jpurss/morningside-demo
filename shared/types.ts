/**
 * Shared type definitions for Deal Shield
 * Used by both server and client
 */

export type Severity = "info" | "warn" | "critical"
export type VerdictColor = "green" | "yellow" | "red"

export type Finding = {
  id: string
  severity: Severity
  title: string
  detail: string
  penalty: number
  errorUnits: number
  /** If true, this issue cannot be fixed - only flagged for awareness */
  unfixable?: boolean
  /** Remediation guidance for unfixable issues */
  remediation?: string
}

export type LlmThreePointRisk = {
  pii_compliance: {
    risk: "low" | "medium" | "high" | "critical"
    output: string
  }
  structure_consistency: {
    quality: "clean" | "mixed" | "chaotic"
    output: string
    cleanup_hours?: number
  }
  context_richness: {
    rag_readiness: "high" | "medium" | "low"
    output: string
  }
  generated_clause?: string | null
}

export type FileAuditKind = "csv" | "pdf" | "txt" | "unknown"

export type FileAuditReport = {
  filename: string
  kind: FileAuditKind
  sizeBytes: number
  stats: Record<string, unknown>
  findings: Finding[]
  score: number
  color: VerdictColor
  sample: {
    textPreview?: string
    rowsPreview?: Array<Record<string, unknown>>
  }
  llm?: LlmThreePointRisk | null
}

export type OverallAudit = {
  score: number
  color: VerdictColor
  headline: string
  rationale: string
  /** Internal realistic estimate for data engineers */
  estimatedExtraHours: number
  /** Internal cost based on estimatedExtraHours */
  estimatedExtraCost: number
  /** Client-facing estimate with buffer for scope creep (1.5x internal) */
  clientEstimateHours: number
  /** Client-facing cost based on clientEstimateHours */
  clientEstimateCost: number
  hourlyRate: number
  generatedClause: string | null
  /** True if the primary issue is unfixable (e.g., RAG context) */
  requiresConsultation: boolean
  /** Consultation details when requiresConsultation is true */
  consultation?: {
    type: "rag_architecture"
    baseFee: number
    hourlyRate: number
    estimatedHours: number
    totalCost: number
    description: string
  }
}

export type AuditResponse = {
  generatedAt: string
  model: string | null
  overall: OverallAudit
  files: FileAuditReport[]
}

export type AuditClientNoteType = "confirmation" | "needs_changes" | "needs_consultation"

export type AuditDiplomatResponse = {
  subject: string
  body: string
}

export type AuditClientNoteResponse = {
  generatedAt: string
  model: string | null
  noteType: AuditClientNoteType
  diplomatResponse: AuditDiplomatResponse
}

export type ScopeGuardVerdict = "in_scope" | "grey_area" | "out_of_scope"
export type ScopeGuardBucket = "bug_defect" | "clarification" | "change_request"
export type ScopeGuardTshirtSize = "small" | "medium" | "large"

export type ScopeGuardEstimate = {
  size: ScopeGuardTshirtSize
  hours: number
  rationale: string
}

export type ScopeGuardClauseCitation = {
  section: string | null
  quote: string
}

export type ScopeGuardDiplomatResponse = {
  subject: string
  body: string
}

export type ScopeGuardExtraction = {
  deliverables: string[]
  exclusions: string[]
}

export type ScopeGuardResponse = {
  generatedAt: string
  model: string | null
  verdict: ScopeGuardVerdict
  bucket: ScopeGuardBucket
  estimate: ScopeGuardEstimate
  clauseCitation: ScopeGuardClauseCitation
  diplomatResponse: ScopeGuardDiplomatResponse
  extracted: ScopeGuardExtraction
}

export type ChangeOrderPack = {
  client: string
  projectPhase: string | null
  title: string
  summary: string
  scope: {
    inclusions: string[]
    exclusions: string[]
    assumptions: string[]
  }
  estimate: {
    engineeringHours: number
    hourlyRateUsd: number
    totalUsd: number
  }
  timeline: {
    duration: string
    milestones: string[]
  }
  clauseCitation: ScopeGuardClauseCitation
  nextQuestions: string[]
  signature: {
    clientLine: string
    morningsideLine: string
  }
}

export type ChangeOrderPackResponse = {
  generatedAt: string
  model: string | null
  pack: ChangeOrderPack
}
