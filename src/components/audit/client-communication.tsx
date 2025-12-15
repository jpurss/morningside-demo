import * as React from "react"
import { Link } from "react-router-dom"
import { CopyIcon, Loader2Icon, MailIcon } from "lucide-react"

import type {
  AuditClientNoteResponse,
  AuditClientNoteType,
  AuditResponse,
} from "@/lib/deal-shield-types"
import { createDataAuditExecutiveItem, stageLabel } from "@/lib/executive-dashboard"
import { useExecutiveDashboard } from "@/lib/use-executive-dashboard"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"

type DraftState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; result: AuditClientNoteResponse; draftText: string }
  | { status: "error"; message: string }

function formatMoneyUsd(value: number) {
  const safe = Number.isFinite(value) ? value : 0
  return safe.toLocaleString(undefined, { style: "currency", currency: "USD" })
}

async function copyText(value: string) {
  const text = value ?? ""
  if (!text.trim()) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const el = document.createElement("textarea")
    el.value = text
    el.style.position = "fixed"
    el.style.left = "-9999px"
    document.body.appendChild(el)
    el.focus()
    el.select()
    document.execCommand("copy")
    document.body.removeChild(el)
  }
}

function defaultNoteType(report: AuditResponse): AuditClientNoteType {
  if (report.overall.requiresConsultation) return "needs_consultation"
  return report.overall.color === "green" ? "confirmation" : "needs_changes"
}

function pickTopIssues(report: AuditResponse, limit = 3) {
  const weight = (severity: string) =>
    severity === "critical" ? 2 : severity === "warn" ? 1 : 0

  const issues = report.files
    .flatMap((file) =>
      file.findings
        .filter((f) => f.severity !== "info")
        .map((f) => ({
          w: weight(f.severity),
          text: `${file.filename}: ${f.title} — ${f.detail}`,
        })),
    )
    .sort((a, b) => b.w - a.w)
    .map((x) => x.text)

  return Array.from(new Set(issues)).slice(0, limit)
}

function clientFromReport(report: AuditResponse) {
  const joined = report.files.map((f) => f.filename.toLowerCase()).join(" ")
  if (joined.includes("supply")) return "Fjord Logistics"
  if (joined.includes("lead")) return "Northwind Retail"
  return "Client"
}

export function ClientCommunication(props: { report: AuditResponse }) {
  const dashboard = useExecutiveDashboard()
  const { toast } = useToast()

  const [noteType, setNoteType] = React.useState<AuditClientNoteType>(() => defaultNoteType(props.report))
  const [state, setState] = React.useState<DraftState>({ status: "idle" })

  const topIssues = React.useMemo(() => pickTopIssues(props.report), [props.report])

  // Use client-facing estimate (includes 1.5x buffer) for communications
  const hours = props.report.overall.clientEstimateHours
  const rate = props.report.overall.hourlyRate
  const total = props.report.overall.clientEstimateCost

  const badgeTone =
    noteType === "confirmation"
      ? "border-primary/25 text-primary"
      : noteType === "needs_consultation"
        ? "border-purple-400/30 text-purple-300"
        : props.report.overall.color === "red"
          ? "border-red-400/30 text-red-300"
          : "border-yellow-400/30 text-yellow-300"

  const statusLabel =
    noteType === "confirmation"
      ? "Ready to proceed"
      : noteType === "needs_consultation"
        ? "Consultation recommended"
        : "Action needed"

  const dashboardId = React.useMemo(() => `da-${props.report.generatedAt}`, [props.report.generatedAt])
  const dashboardItem = dashboard.getItem(dashboardId)
  const commsLogged = dashboardItem?.comms.status === "contacted"

  const ensureItem = React.useCallback(() => {
    const existing = dashboard.getItem(dashboardId)
    if (existing) return existing
    const item = createDataAuditExecutiveItem({
      id: dashboardId,
      client: clientFromReport(props.report),
      report: props.report,
      noteType,
    })
    dashboard.upsertItem(item)
    return item
  }, [dashboard, dashboardId, noteType, props.report])

  React.useEffect(() => {
    setState((prev) => (prev.status === "done" ? { status: "idle" } : prev))
  }, [noteType])

  const draft = React.useCallback(async () => {
    setState({ status: "loading" })
    try {
      const res = await fetch("/api/audit/draft-client-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteType,
          overallHeadline: props.report.overall.headline,
          overallRationale: props.report.overall.rationale,
          topIssues,
          estimatedExtraHours: hours,
          hourlyRateUsd: rate,
          consultation: props.report.overall.consultation,
        }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Request failed (${res.status})`)
      }
      const json = (await res.json()) as AuditClientNoteResponse
      const draftText = [`Subject: ${json.diplomatResponse.subject}`, "", json.diplomatResponse.body].join("\n")
      setState({ status: "done", result: json, draftText })
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }, [hours, noteType, props.report.overall.headline, props.report.overall.rationale, rate, topIssues])

  return (
    <div className="rounded-xl border border-border/70 bg-background/20 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg border border-border/70 bg-card/40">
              <MailIcon className="h-4 w-4 text-foreground/80" />
            </div>
            <div className="text-base font-semibold text-white">Client Communication</div>
            <Badge variant="outline" className={cn("bg-background/30", badgeTone)}>
              {statusLabel}
            </Badge>
          </div>
          <div className="text-sm text-foreground/80">
            {noteType === "confirmation"
              ? "Send a quick confirmation and keep momentum."
              : noteType === "needs_consultation"
                ? "Recommend a RAG consultation for architectural guidance."
                : "Explain what's blocking ingestion and propose next steps."}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={noteType === "confirmation" ? "secondary" : "outline"}
            onClick={() => setNoteType("confirmation")}
          >
            Confirmation
          </Button>
          <Button
            size="sm"
            variant={noteType === "needs_changes" ? "secondary" : "outline"}
            onClick={() => setNoteType("needs_changes")}
          >
            Needs changes
          </Button>
          {props.report.overall.requiresConsultation && (
            <Button
              size="sm"
              variant={noteType === "needs_consultation" ? "secondary" : "outline"}
              onClick={() => setNoteType("needs_consultation")}
            >
              Consultation needed
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border/70 bg-background/15 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-foreground/60">
            Evidence (Top Findings)
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {topIssues.length > 0 ? (
              topIssues.map((issue) => (
                <div key={issue} className="text-foreground/85">
                  {issue}
                </div>
              ))
            ) : (
              <div className="text-foreground/75">No material issues surfaced in the sample.</div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-background/15 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-foreground/60">
            Estimate
          </div>
          <div className="mt-3 text-sm text-foreground/80">
            {noteType === "needs_consultation" && props.report.overall.consultation ? (
              <>
                <div className="text-white">
                  {props.report.overall.consultation.description}: {formatMoneyUsd(props.report.overall.consultation.totalCost)}
                </div>
                <div className="mt-2 text-xs text-foreground/65">
                  Includes {props.report.overall.consultation.estimatedHours}h expert consultation + base fee
                </div>
              </>
            ) : noteType === "needs_changes" ? (
              <>
                <div className="text-white">
                  {hours} hours × {formatMoneyUsd(rate)}/hr = {formatMoneyUsd(total)}
                </div>
                <div className="mt-2 text-xs text-foreground/65">
                  Hours are derived from the audit's issue assessment; rate comes from your env config.
                </div>
              </>
            ) : (
              <div className="text-foreground/75">No additional transformation work expected.</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-foreground/65">
          Drafts a copy-ready email you can send to the client.
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => draft()}
            disabled={state.status === "loading"}
          >
            {state.status === "loading" ? (
              <>
                <Loader2Icon className="h-4 w-4 animate-spin" />
                Drafting…
              </>
            ) : state.status === "done" ? (
              "Regenerate"
            ) : (
              "Draft client note"
            )}
          </Button>
          {state.status === "done" ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => copyText(state.draftText)}
            >
              <CopyIcon className="h-4 w-4" /> Copy
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-lg border border-border/70 bg-background/15 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wider text-foreground/60">
            Executive Dashboard
          </div>
          <div className="text-sm text-foreground/80">
            {dashboardItem ? (
              <>
                Logged •{" "}
                <span className="text-white">{stageLabel(dashboardItem.stage)}</span>
              </>
            ) : (
              "Not yet logged"
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={commsLogged ? "secondary" : "outline"}
            disabled={commsLogged}
            onClick={() => {
              ensureItem()
              dashboard.logCommunication(dashboardId, {
                channel: "email",
                activityLabel: "Client contacted (Data Audit)",
              })
              toast({
                title: "Communication logged",
                description: "Marked as contacted on the executive dashboard.",
                tone: "success",
              })
            }}
          >
            {commsLogged ? "Communication logged" : "Log communication"}
          </Button>

          {noteType === "confirmation" ? (
            <Button
              size="sm"
              onClick={() => {
                ensureItem()
                dashboard.setStage(dashboardId, "done", "Confirmed ready to proceed")
                toast({
                  title: "Marked ready",
                  description: "Audit recorded as ready-to-proceed.",
                  tone: "success",
                })
              }}
            >
              Mark ready
            </Button>
          ) : noteType === "needs_consultation" ? (
            <>
              <Button
                size="sm"
                onClick={() => {
                  ensureItem()
                  dashboard.setStage(dashboardId, "awaiting_client", "Sent consultation proposal")
                  toast({
                    title: "Added to queue",
                    description: "Awaiting client decision on consultation.",
                    tone: "success",
                  })
                }}
              >
                Send proposal
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  ensureItem()
                  dashboard.setStage(dashboardId, "approved", "Client approved consultation")
                  toast({
                    title: "Added to SOW",
                    description: "Consultation marked as approved engagement.",
                    tone: "success",
                  })
                }}
              >
                Add to SOW
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                onClick={() => {
                  ensureItem()
                  dashboard.setStage(dashboardId, "awaiting_client", "Queued for client decision")
                  toast({
                    title: "Added to queue",
                    description: "Awaiting client decision for cleanup scope.",
                    tone: "success",
                  })
                }}
              >
                Add to queue
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  ensureItem()
                  dashboard.setStage(dashboardId, "approved", "Client approved cleanup add-on")
                  toast({
                    title: "Added to SOW",
                    description: "Cleanup work marked as approved add-on.",
                    tone: "success",
                  })
                }}
              >
                Add to SOW
              </Button>
            </>
          )}

          <Button size="sm" variant="ghost" asChild className="text-foreground/80">
            <Link to="/dashboard">Open dashboard</Link>
          </Button>
        </div>
      </div>

      {state.status === "error" ? (
        <div className="mt-3 rounded-lg border border-red-400/25 bg-background/15 p-3 text-sm text-red-300">
          Draft failed: {state.message}
        </div>
      ) : null}

      {state.status === "done" ? (
        <div className="mt-4">
          <Textarea value={state.draftText} readOnly className="min-h-[220px] resize-none" />
          <div className="mt-2 text-xs text-foreground/70">
            Generated by {state.result.model ?? "heuristics"} •{" "}
            {new Date(state.result.generatedAt).toLocaleString()}
          </div>
        </div>
      ) : null}
    </div>
  )
}
