/**
 * Re-export shared types for frontend use
 * Types are defined in @shared/types.ts to avoid duplication
 */
export type {
  Severity,
  VerdictColor,
  Finding,
  LlmThreePointRisk,
  FileAuditKind,
  FileAuditReport,
  OverallAudit,
  AuditResponse,
  AuditClientNoteType,
  AuditDiplomatResponse,
  AuditClientNoteResponse,
  ScopeGuardVerdict,
  ScopeGuardBucket,
  ScopeGuardTshirtSize,
  ScopeGuardEstimate,
  ScopeGuardClauseCitation,
  ScopeGuardDiplomatResponse,
  ScopeGuardExtraction,
  ScopeGuardResponse,
  ChangeOrderPack,
  ChangeOrderPackResponse,
} from "@shared/types"
