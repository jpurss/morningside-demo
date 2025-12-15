import type {
  AuditClientNoteType,
  AuditResponse,
  ScopeGuardBucket,
  ScopeGuardResponse,
  ScopeGuardTshirtSize,
  ScopeGuardVerdict,
  VerdictColor,
} from "@/lib/deal-shield-types"

export const EXEC_DASHBOARD_STORAGE_KEY = "morningside_exec_dashboard_v1"

export type ExecutiveWorkstream = "scope_guard" | "data_cleaning" | "expert_consulting"

export type ExecutiveAssigneeRole = "consultant" | "engineering" | "pm"

export type ExecutiveAssignee = {
  id: string
  name: string
  role: ExecutiveAssigneeRole
}

export const EXEC_STAGES = [
  "inbox",
  "triage",
  "awaiting_client",
  "backlog",
  "approved",
  "assigned",
  "in_progress",
  "done",
  "archived",
] as const

export type ExecutiveStage = (typeof EXEC_STAGES)[number]

export type ExecutiveCommunication = {
  status: "not_logged" | "contacted"
  lastContactedAt?: number
  channel?: "email" | "slack" | "call"
}

export type ExecutiveActivityEntry = {
  at: number
  label: string
}

export type ExecutiveSourceScopeGuard = {
  kind: "scope_guard"
  generatedAt: string
  verdict: ScopeGuardVerdict
  bucket: ScopeGuardBucket
  size: ScopeGuardTshirtSize
}

export type ExecutiveSourceDataAudit = {
  kind: "data_audit"
  generatedAt: string
  overallColor: VerdictColor
  noteType: AuditClientNoteType
  fileCount: number
}

export type ExecutiveSourceConsultation = {
  kind: "consultation"
  generatedAt: string
  consultationType: "rag_architecture"
  totalCost: number
  estimatedHours: number
}

export type ExecutiveItem = {
  id: string
  createdAt: number
  updatedAt: number
  workstream: ExecutiveWorkstream
  stage: ExecutiveStage

  title: string
  summary: string
  client: string

  estimateHours: number
  expectedRevenueUsd: number

  assigneeId: string | null
  comms: ExecutiveCommunication

  source: ExecutiveSourceScopeGuard | ExecutiveSourceDataAudit | ExecutiveSourceConsultation
  activity: ExecutiveActivityEntry[]
}

export type ExecutiveDashboardState = {
  assignees: ExecutiveAssignee[]
  items: ExecutiveItem[]
}

export function stageLabel(stage: ExecutiveStage) {
  switch (stage) {
    case "inbox":
      return "Inbox"
    case "triage":
      return "Triage"
    case "awaiting_client":
      return "Awaiting client"
    case "backlog":
      return "Backlog"
    case "approved":
      return "Approved"
    case "assigned":
      return "Assigned"
    case "in_progress":
      return "In progress"
    case "done":
      return "Done"
    case "archived":
      return "Archived"
    default:
      return stage
  }
}

export function workstreamLabel(workstream: ExecutiveWorkstream) {
  if (workstream === "data_cleaning") return "Data Cleaning"
  if (workstream === "expert_consulting") return "Expert Consulting"
  return "Scope Guard"
}

export function bucketLabel(bucket: ScopeGuardBucket) {
  if (bucket === "bug_defect") return "Bug / Defect"
  if (bucket === "clarification") return "Clarification"
  return "Change Request"
}

export function verdictLabel(verdict: ScopeGuardVerdict) {
  if (verdict === "in_scope") return "In scope"
  if (verdict === "out_of_scope") return "Out of scope"
  return "Grey area"
}

export function colorLabel(color: VerdictColor) {
  return color.toUpperCase()
}

export function formatUsd(value: number) {
  const safe = Number.isFinite(value) ? value : 0
  return safe.toLocaleString(undefined, { style: "currency", currency: "USD" })
}

export function requestTitleFromText(text: string, maxLen = 72) {
  const single = String(text ?? "")
    .trim()
    .split(/\n+/)[0]
    ?.replace(/\s+/g, " ")
    .trim()

  if (!single) return "Client request"
  if (single.length <= maxLen) return single
  return `${single.slice(0, maxLen - 1).trimEnd()}…`
}

export function requestSummaryFromText(text: string, maxLen = 220) {
  const single = String(text ?? "").replace(/\s+/g, " ").trim()
  if (!single) return ""
  if (single.length <= maxLen) return single
  return `${single.slice(0, maxLen - 1).trimEnd()}…`
}

export function createScopeGuardExecutiveItem(input: {
  id: string
  client: string
  requestText: string
  result: ScopeGuardResponse
  now?: number
}): ExecutiveItem {
  const now = input.now ?? Date.now()

  const baseTitle = requestTitleFromText(input.requestText)
  const size = input.result.estimate.size
  const isOutOfScope = input.result.verdict === "out_of_scope"

  const titlePrefix =
    input.result.bucket === "bug_defect"
      ? "Bug:"
      : input.result.bucket === "clarification"
        ? "Clarify:"
        : isOutOfScope
          ? "Change order:"
          : "Request:"

  const title = `${titlePrefix} ${baseTitle}`
  const estimateHours = Math.max(0, Math.round(input.result.estimate.hours))
  const expectedRevenueUsd = isOutOfScope ? estimateHours * 150 : 0

  const summaryParts = [
    verdictLabel(input.result.verdict),
    bucketLabel(input.result.bucket),
    `${size[0]!.toUpperCase() + size.slice(1)} • ${estimateHours}h`,
  ]

  return {
    id: input.id,
    createdAt: now,
    updatedAt: now,
    workstream: "scope_guard",
    stage: "inbox",
    title,
    summary: `${summaryParts.join(" · ")} — ${requestSummaryFromText(input.requestText)}`,
    client: input.client,
    estimateHours,
    expectedRevenueUsd,
    assigneeId: null,
    comms: { status: "not_logged" },
    source: {
      kind: "scope_guard",
      generatedAt: input.result.generatedAt,
      verdict: input.result.verdict,
      bucket: input.result.bucket,
      size,
    },
    activity: [{ at: now, label: "Analyzed with Scope Guard" }],
  }
}

export function createDataAuditExecutiveItem(input: {
  id: string
  client: string
  report: AuditResponse
  noteType: AuditClientNoteType
  now?: number
}): ExecutiveItem {
  const now = input.now ?? Date.now()

  // Handle consultation mode
  if (input.report.overall.requiresConsultation && input.report.overall.consultation) {
    const consultation = input.report.overall.consultation
    return {
      id: input.id,
      createdAt: now,
      updatedAt: now,
      workstream: "expert_consulting",
      stage: "inbox",
      title: `RAG Consultation: ${input.client}`,
      summary: `${consultation.description} · ${formatUsd(consultation.totalCost)}`,
      client: input.client,
      estimateHours: consultation.estimatedHours,
      expectedRevenueUsd: consultation.totalCost,
      assigneeId: null,
      comms: { status: "not_logged" },
      source: {
        kind: "consultation",
        generatedAt: input.report.generatedAt,
        consultationType: "rag_architecture",
        totalCost: consultation.totalCost,
        estimatedHours: consultation.estimatedHours,
      },
      activity: [{ at: now, label: "Analyzed with Data Audit (consultation recommended)" }],
    }
  }

  const headline = input.report.overall.headline || "Data audit result"
  const title = `Data cleanup: ${headline}`

  // Use client-facing estimate for dashboard (what we'll quote)
  const estimateHours = Math.max(0, Math.round(input.report.overall.clientEstimateHours))
  const expectedRevenueUsd = Math.max(0, Math.round(input.report.overall.clientEstimateCost))

  const summary = [
    colorLabel(input.report.overall.color),
    `${input.report.files.length} file(s)`,
    input.noteType === "confirmation" ? "Proceed" : "Cleanup needed",
    `${estimateHours}h • ${formatUsd(expectedRevenueUsd)}`,
  ].join(" · ")

  return {
    id: input.id,
    createdAt: now,
    updatedAt: now,
    workstream: "data_cleaning",
    stage: "inbox",
    title,
    summary,
    client: input.client,
    estimateHours,
    expectedRevenueUsd,
    assigneeId: null,
    comms: { status: "not_logged" },
    source: {
      kind: "data_audit",
      generatedAt: input.report.generatedAt,
      overallColor: input.report.overall.color,
      noteType: input.noteType,
      fileCount: input.report.files.length,
    },
    activity: [{ at: now, label: "Analyzed with Data Audit" }],
  }
}

export function createDemoExecutiveDashboardState(now = Date.now()): ExecutiveDashboardState {
  const day = 24 * 60 * 60 * 1000
  const assignees: ExecutiveAssignee[] = [
    { id: "c-maya", name: "Maya Chen", role: "consultant" },
    { id: "c-jordan", name: "Jordan Patel", role: "consultant" },
    { id: "c-josiah", name: "Josiah Purss", role: "consultant" },
    { id: "pm-oliver", name: "Oliver Singh", role: "pm" },
    { id: "pm-sofia", name: "Sofia Martinez", role: "pm" },
    { id: "em-emma", name: "Emma Rivera", role: "engineering" },
    { id: "em-noah", name: "Noah Kim", role: "engineering" },
    { id: "em-priya", name: "Priya Shah", role: "engineering" },
  ]

  const items: ExecutiveItem[] = [
    {
      id: "sg-uat-login-500",
      createdAt: now - 4 * day,
      updatedAt: now - 2 * day,
      workstream: "scope_guard",
      stage: "backlog",
      title: "Bug: Login throws a 500 in UAT",
      summary: "In scope · Bug / Defect · Small • 6h — Intermittent 500 on login in UAT; likely auth middleware edge-case.",
      client: "Northwind Retail",
      estimateHours: 6,
      expectedRevenueUsd: 0,
      assigneeId: "em-emma",
      comms: { status: "contacted", lastContactedAt: now - 3 * day, channel: "slack" },
      source: {
        kind: "scope_guard",
        generatedAt: new Date(now - 4 * day).toISOString(),
        verdict: "in_scope",
        bucket: "bug_defect",
        size: "small",
      },
      activity: [
        { at: now - 4 * day, label: "Analyzed with Scope Guard" },
        { at: now - 3 * day, label: "Client contacted (Slack)" },
        { at: now - 2 * day, label: "Moved to backlog" },
      ],
    },
    {
      id: "sg-csv-export",
      createdAt: now - 9 * day,
      updatedAt: now - 8 * day,
      workstream: "scope_guard",
      stage: "triage",
      title: "Request: Add an “Export to CSV” button",
      summary: "Grey area · Change Request · Medium • 12h — Looks small, but touches reporting + permissioning. Needs PM review.",
      client: "Northwind Retail",
      estimateHours: 12,
      expectedRevenueUsd: 0,
      assigneeId: "pm-oliver",
      comms: { status: "not_logged" },
      source: {
        kind: "scope_guard",
        generatedAt: new Date(now - 9 * day).toISOString(),
        verdict: "grey_area",
        bucket: "change_request",
        size: "medium",
      },
      activity: [{ at: now - 9 * day, label: "Analyzed with Scope Guard" }],
    },
    {
      id: "sg-invite-roles",
      createdAt: now - 2 * day,
      updatedAt: now - 2 * day,
      workstream: "scope_guard",
      stage: "done",
      title: "Clarify: Invites & permissions flow",
      summary: "In scope · Clarification · Small • 2h — Clarified how Managers invite teammates and set permissions in-app.",
      client: "Northwind Retail",
      estimateHours: 2,
      expectedRevenueUsd: 0,
      assigneeId: "pm-oliver",
      comms: { status: "contacted", lastContactedAt: now - 2 * day, channel: "email" },
      source: {
        kind: "scope_guard",
        generatedAt: new Date(now - 2 * day).toISOString(),
        verdict: "in_scope",
        bucket: "clarification",
        size: "small",
      },
      activity: [
        { at: now - 2 * day, label: "Analyzed with Scope Guard" },
        { at: now - 2 * day, label: "Client contacted (email)" },
      ],
    },
    {
      id: "sg-slack-integration",
      createdAt: now - 33 * day,
      updatedAt: now - 7 * day,
      workstream: "scope_guard",
      stage: "awaiting_client",
      title: "Change order: Slack notifications + channel integration",
      summary: "Out of scope · Change Request · Large • 64h — New integration + event routing; proposal drafted for client approval.",
      client: "Fjord Logistics",
      estimateHours: 64,
      expectedRevenueUsd: 64 * 150,
      assigneeId: "c-maya",
      comms: { status: "contacted", lastContactedAt: now - 7 * day, channel: "email" },
      source: {
        kind: "scope_guard",
        generatedAt: new Date(now - 33 * day).toISOString(),
        verdict: "out_of_scope",
        bucket: "change_request",
        size: "large",
      },
      activity: [
        { at: now - 33 * day, label: "Analyzed with Scope Guard" },
        { at: now - 7 * day, label: "Change order sent to client" },
      ],
    },
    {
      id: "da-messy-supply-chain",
      createdAt: now - 6 * day,
      updatedAt: now - 1 * day,
      workstream: "data_cleaning",
      stage: "awaiting_client",
      title: "Data cleanup: Supply chain PDF ingestion",
      summary: "RED · 1 file(s) · Cleanup needed · 28h • $4,200.00",
      client: "Fjord Logistics",
      estimateHours: 28,
      expectedRevenueUsd: 4200,
      assigneeId: null,
      comms: { status: "contacted", lastContactedAt: now - 1 * day, channel: "email" },
      source: {
        kind: "data_audit",
        generatedAt: new Date(now - 6 * day).toISOString(),
        overallColor: "red",
        noteType: "needs_changes",
        fileCount: 1,
      },
      activity: [
        { at: now - 6 * day, label: "Analyzed with Data Audit" },
        { at: now - 1 * day, label: "Client contacted (options sent)" },
      ],
    },
    {
      id: "da-crm-normalization",
      createdAt: now - 41 * day,
      updatedAt: now - 12 * day,
      workstream: "data_cleaning",
      stage: "assigned",
      title: "Data cleanup: Normalize legacy CRM export",
      summary: "YELLOW · 2 file(s) · Cleanup needed · 16h • $2,400.00",
      client: "Bluebird Energy",
      estimateHours: 16,
      expectedRevenueUsd: 2400,
      assigneeId: "c-jordan",
      comms: { status: "contacted", lastContactedAt: now - 18 * day, channel: "call" },
      source: {
        kind: "data_audit",
        generatedAt: new Date(now - 41 * day).toISOString(),
        overallColor: "yellow",
        noteType: "needs_changes",
        fileCount: 2,
      },
      activity: [
        { at: now - 41 * day, label: "Analyzed with Data Audit" },
        { at: now - 18 * day, label: "Client approved cleanup work" },
        { at: now - 12 * day, label: "Assigned to consultant" },
      ],
    },
    {
      id: "da-good-leads",
      createdAt: now - 16 * day,
      updatedAt: now - 15 * day,
      workstream: "data_cleaning",
      stage: "done",
      title: "Data cleanup: Leads CSV ready-to-ingest",
      summary: "GREEN · 1 file(s) · Proceed · 0h • $0.00",
      client: "Northwind Retail",
      estimateHours: 0,
      expectedRevenueUsd: 0,
      assigneeId: null,
      comms: { status: "contacted", lastContactedAt: now - 15 * day, channel: "email" },
      source: {
        kind: "data_audit",
        generatedAt: new Date(now - 16 * day).toISOString(),
        overallColor: "green",
        noteType: "confirmation",
        fileCount: 1,
      },
      activity: [
        { at: now - 16 * day, label: "Analyzed with Data Audit" },
        { at: now - 15 * day, label: "Client confirmed go-ahead" },
      ],
    },
  ]

  return { assignees, items }
}

export type ExecutiveMonthBucket = {
  key: string
  label: string
  start: number
  end: number
}

export function monthBuckets(now: number, months = 6): ExecutiveMonthBucket[] {
  const current = new Date(now)
  current.setDate(1)
  current.setHours(0, 0, 0, 0)

  const buckets: ExecutiveMonthBucket[] = []
  for (let i = months - 1; i >= 0; i -= 1) {
    const start = new Date(current)
    start.setMonth(start.getMonth() - i)
    const end = new Date(start)
    end.setMonth(end.getMonth() + 1)
    buckets.push({
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      label: start.toLocaleString(undefined, { month: "short" }),
      start: start.getTime(),
      end: end.getTime(),
    })
  }
  return buckets
}

export function stageRank(stage: ExecutiveStage) {
  return EXEC_STAGES.indexOf(stage)
}

export function isOpenStage(stage: ExecutiveStage) {
  return stage !== "done" && stage !== "archived"
}
