/**
 * Re-export shared types for server use
 * Types are defined in shared/types.ts to avoid duplication
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
} from "@shared/types";

