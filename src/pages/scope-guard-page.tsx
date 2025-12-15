import * as React from "react"
import { Link } from "react-router-dom"
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  FileTextIcon,
  Loader2Icon,
  ShieldIcon,
  TriangleAlertIcon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react"

import type { ChangeOrderPackResponse, ScopeGuardResponse, ScopeGuardVerdict } from "@/lib/deal-shield-types"
import { createScopeGuardExecutiveItem, stageLabel } from "@/lib/executive-dashboard"
import { useExecutiveDashboard } from "@/lib/use-executive-dashboard"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toast"
import { ChangeOrderDraftOverlay } from "@/components/scope-guard/change-order-draft-overlay"
import { ChangeOrderPackModal } from "@/components/scope-guard/change-order-pack-modal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ScopeState =
  | { status: "loading-demo" }
  | { status: "idle" }
  | { status: "analyzing"; startedAt: number }
  | { status: "done"; result: ScopeGuardResponse }
  | { status: "error"; message: string }

type RequestExample = {
  id: string
  label: string
  text: string
}

const REQUEST_EXAMPLES: RequestExample[] = [
  {
    id: "csv-export",
    label: '"Export everything to CSV real quick"',
    text: "Hey, can we just add a button to export all this to CSV real quick?",
  },
  {
    id: "login-500",
    label: '"Login throws a 500 in UAT"',
    text: "In UAT, the login screen sometimes throws a 500 even with valid credentials. Can you fix that?",
  },
  {
    id: "invite-roles",
    label: '"Clarify invites & permissions"',
    text: "Can you clarify how Managers invite new team members and where to set their permissions?",
  },
  {
    id: "slack-integration",
    label: '"Add Slack notifications for task assignments"',
    text: "We'd love to have Slack notifications so team members get pinged when a task is assigned to them. Can we also add a Slack channel integration where project updates get posted automatically?",
  },
]

function verdictTheme(verdict: ScopeGuardVerdict) {
  if (verdict === "in_scope") {
    return {
      accent: "text-primary",
      border: "border-primary/35",
      bg: "bg-primary/10",
      label: "IN SCOPE (Proceed)",
      icon: CheckIcon,
    }
  }
  if (verdict === "out_of_scope") {
    return {
      accent: "text-red-400",
      border: "border-red-400/30",
      bg: "bg-red-400/10",
      label: "OUT OF SCOPE (Requires Change Order)",
      icon: XIcon,
    }
  }
  return {
    accent: "text-yellow-400",
    border: "border-yellow-400/30",
    bg: "bg-yellow-400/10",
    label: "GREY AREA (Manager Review)",
    icon: TriangleAlertIcon,
  }
}

function formatHours(hours: number) {
  const rounded = Math.max(0, Math.round(hours))
  if (rounded >= 20) return "20h+"
  return `${rounded}h`
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

async function loadDemoSow(): Promise<File> {
  const res = await fetch("/demo/morningside_sow_demo.txt")
  if (!res.ok) throw new Error(`Failed to load demo SOW (${res.status}).`)
  const text = await res.text()
  return new File([text], "Morningside_SOW_Demo.txt", { type: "text/plain" })
}

export function ScopeGuardPage() {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const [state, setState] = React.useState<ScopeState>({ status: "loading-demo" })
  const [sowFile, setSowFile] = React.useState<File | null>(null)
  const [sowSource, setSowSource] = React.useState<"demo" | "custom">("demo")

  const [phase, setPhase] = React.useState<string>("")
  const [requestText, setRequestText] = React.useState<string>("")

  React.useEffect(() => {
    let isMounted = true
    loadDemoSow()
      .then((file) => {
        if (!isMounted) return
        setSowFile(file)
        setSowSource("demo")
        setState({ status: "idle" })
      })
      .catch((error) => {
        if (!isMounted) return
        setState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        })
      })
    return () => {
      isMounted = false
    }
  }, [])

  const analyze = React.useCallback(async () => {
    if (!sowFile) return
    const trimmed = requestText.trim()
    if (!trimmed) return

    setState({ status: "analyzing", startedAt: Date.now() })

    const body = new FormData()
    body.append("sow", sowFile)
    body.append("request", trimmed)
    if (phase.trim()) body.append("phase", phase.trim())

    try {
      const res = await fetch("/api/scope-guard", { method: "POST", body })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Request failed (${res.status})`)
      }
      const json = (await res.json()) as ScopeGuardResponse
      setState({ status: "done", result: json })
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }, [phase, requestText, sowFile])

  if (state.status === "loading-demo") {
    return (
      <div className="rounded-2xl border border-border/70 bg-card/60 p-10 backdrop-blur-xl">
        <div className="flex items-center gap-3 text-sm text-foreground/80">
          <Loader2Icon className="h-4 w-4 animate-spin text-primary" />
          Loading demo SOW…
        </div>
      </div>
    )
  }

  if (state.status === "analyzing") {
    return (
      <div className="rounded-2xl border border-border/70 bg-card/60 p-10 backdrop-blur-xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-primary/35 bg-primary/10 px-4 py-2 text-lg font-semibold text-white">
              <ShieldIcon className="h-5 w-5 text-primary" />
              Analyzing scope…
            </div>
            <div className="mt-3 text-sm text-foreground/80">
              Comparing the incoming request against your SOW deliverables and exclusions.
            </div>
          </div>
          <div className="text-xs text-foreground/70">
            Elapsed: {Math.max(0, Math.round((Date.now() - state.startedAt) / 1000))}s
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <MiniStep title="Parsing SOW clauses" />
          <MiniStep title="Classifying request type" />
          <MiniStep title="Drafting PM response" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-primary/25 bg-primary/10">
            <ShieldIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-primary">Scope Guard</h1>
            <p className="mt-1 text-sm text-foreground/80">
              Prevent margin erosion by checking “quick requests” against the signed SOW.
            </p>
          </div>
        </div>
      </div>

      {state.status === "error" ? (
        <div className="rounded-2xl border border-red-400/25 bg-card/60 p-6 text-sm text-foreground/85 backdrop-blur-xl">
          <div className="text-base font-semibold text-white">Scope check failed</div>
          <div className="mt-2">{state.message}</div>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => setState({ status: "idle" })}
              variant="secondary"
            >
              Back
            </Button>
            <Button
              onClick={() => analyze()}
              disabled={!sowFile || !requestText.trim()}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/60 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-white">Statement of Work (SOW)</CardTitle>
              <div className="mt-1 text-sm text-foreground/80">
                Demo SOW is preloaded; replace it if you want.
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "border-border/70 bg-background/30 text-foreground/80",
                sowSource === "demo" && "border-primary/25 text-primary",
              )}
            >
              {sowSource === "demo" ? "Demo Loaded" : "Custom File"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const file = Array.from(e.dataTransfer.files ?? [])[0]
                if (!file) return
                const ok = file.name.toLowerCase().match(/\.(pdf|txt)$/)
                if (!ok) return
                setSowFile(file)
                setSowSource("custom")
              }}
              className={cn(
                "group relative flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed px-8 text-center",
                "border-primary/35 bg-background/20",
              )}
            >
              <UploadCloudIcon className="h-12 w-12 text-primary drop-shadow-[0_0_18px_rgba(65,156,115,0.25)]" />
              <div className="mt-4 text-base font-semibold text-white">
                Drag & drop your SOW here
              </div>
              <div className="mt-2 text-sm text-foreground/80">
                Supported: PDF or TXT
              </div>

              <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = Array.from(e.target.files ?? [])[0]
                    if (!file) return
                    setSowFile(file)
                    setSowSource("custom")
                  }}
                />
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse Files
                </Button>
                <Button
                  variant="ghost"
                  disabled={sowSource === "demo"}
                  onClick={async () => {
                    setState({ status: "loading-demo" })
                    try {
                      const file = await loadDemoSow()
                      setSowFile(file)
                      setSowSource("demo")
                      setState({ status: "idle" })
                    } catch (error) {
                      setState({
                        status: "error",
                        message: error instanceof Error ? error.message : String(error),
                      })
                    }
                  }}
                >
                  Use Demo
                </Button>
              </div>

              <div className="mt-5 flex items-center gap-2 text-xs text-foreground/70">
                <FileTextIcon className="h-4 w-4" />
                <span className="text-foreground/80">
                  {sowFile ? sowFile.name : "No file selected"}
                </span>
              </div>

              <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 ring-1 ring-primary/30 transition-opacity group-hover:opacity-100" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Client Request Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-white">
                Project Phase <span className="text-foreground/60">(optional)</span>
              </div>
              <Select value={phase} onValueChange={setPhase}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a phase…" />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="Development">Development</SelectItem>
                  <SelectItem value="UAT">UAT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-white">
                  Incoming Client Request
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-foreground/80">
                      Examples <ChevronDownIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuLabel>Use an example</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {REQUEST_EXAMPLES.map((ex) => (
                      <DropdownMenuItem
                        key={ex.id}
                        onSelect={() => setRequestText(ex.text)}
                      >
                        {ex.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Textarea
                value={requestText}
                onChange={(e) => setRequestText(e.target.value)}
                placeholder="Paste the client message (Slack/email/transcript)…"
                className="min-h-[160px]"
              />
            </div>

            <Button
              className="w-full shadow-[0_0_24px_rgba(65,156,115,0.18)]"
              onClick={() => analyze()}
              disabled={!sowFile || !requestText.trim()}
            >
              Analyze Scope
            </Button>

            <div className="text-xs text-foreground/70">
              Tip: use the demo SOW + an example request to see a full end-to-end result.
            </div>
          </CardContent>
        </Card>
      </div>

      {state.status === "done" ? (
        <Results
          result={state.result}
          onRegenerate={analyze}
          requestText={requestText}
          client={sowSource === "demo" ? "Northwind Retail" : "Custom Client"}
          sowFile={sowFile}
          projectPhase={phase}
        />
      ) : null}
    </div>
  )
}

function MiniStep(props: { title: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/20 p-4">
      <div className="flex items-center gap-3 text-sm text-foreground/85">
        <Loader2Icon className="h-4 w-4 animate-spin text-primary" />
        {props.title}
      </div>
    </div>
  )
}

function Results(props: {
  result: ScopeGuardResponse
  onRegenerate: () => void
  requestText: string
  client: string
  sowFile: File | null
  projectPhase: string
}) {
  const dashboard = useExecutiveDashboard()
  const { toast } = useToast()
  const dashboardId = React.useMemo(() => `sg-${props.result.generatedAt}`, [props.result.generatedAt])
  const dashboardItem = dashboard.getItem(dashboardId)

  const theme = verdictTheme(props.result.verdict)
  const Icon = theme.icon
  const citationText = props.result.clauseCitation.section
    ? `${props.result.clauseCitation.section}\n\n${props.result.clauseCitation.quote}`
    : props.result.clauseCitation.quote

  const diplomatText = [
    `Subject: ${props.result.diplomatResponse.subject}`,
    "",
    props.result.diplomatResponse.body,
  ].join("\n")

  const ensureItem = React.useCallback(() => {
    const existing = dashboard.getItem(dashboardId)
    if (existing) return existing
    const item = createScopeGuardExecutiveItem({
      id: dashboardId,
      client: props.client,
      requestText: props.requestText,
      result: props.result,
    })
    dashboard.upsertItem(item)
    return item
  }, [dashboard, dashboardId, props.client, props.requestText, props.result])

  const commsLogged = dashboardItem?.comms.status === "contacted"

  const queueAction = React.useMemo(() => {
    if (props.result.verdict === "in_scope") {
      if (props.result.bucket === "clarification") {
        return {
          stage: "triage" as const,
          label: "Add to Triage",
          activityLabel: "Added to triage",
        }
      }
      return {
        stage: "backlog" as const,
        label: "Add to Backlog",
        activityLabel: "Moved to backlog",
      }
    }

    if (props.result.verdict === "out_of_scope") {
      return {
        stage: "triage" as const,
        label: "Add to Change Order Pipeline",
        activityLabel: "Added to change-order pipeline",
      }
    }

    return {
      stage: "triage" as const,
      label: "Send to Manager Review",
      activityLabel: "Sent to manager review",
    }
  }, [props.result.bucket, props.result.verdict])

  const assigned = dashboardItem?.assigneeId != null
  const canAssignConsultant =
    props.result.verdict === "out_of_scope" && props.result.estimate.size === "large"

  const canGenerateChangeOrderPack =
    props.result.verdict === "out_of_scope" && props.result.bucket === "change_request"

  type PackState =
    | { status: "idle" }
    | { status: "drafting"; abortController: AbortController }
    | { status: "ready"; data: ChangeOrderPackResponse }
    | { status: "error"; message: string }

  const [packState, setPackState] = React.useState<PackState>({ status: "idle" })
  const [packOpen, setPackOpen] = React.useState(false)

  React.useEffect(() => {
    setPackOpen(false)
    setPackState({ status: "idle" })
  }, [props.result.generatedAt])

  const cancelPack = React.useCallback(() => {
    setPackOpen(false)
    setPackState((prev) => {
      if (prev.status === "drafting") prev.abortController.abort()
      return { status: "idle" }
    })
  }, [])

  const generatePack = React.useCallback(async () => {
    if (!props.sowFile) {
      toast({
        title: "Missing SOW file",
        description: "Upload a SOW before generating a change order pack.",
        tone: "warning",
      })
      return
    }

    const controller = new AbortController()
    setPackState({ status: "drafting", abortController: controller })

    const body = new FormData()
    body.append("sow", props.sowFile)
    body.append("request", props.requestText)
    body.append("client", props.client)

    const phase = props.projectPhase.trim()
    if (phase) body.append("phase", phase)

    body.append(
      "analysis",
      JSON.stringify({
        verdict: props.result.verdict,
        bucket: props.result.bucket,
        estimate: props.result.estimate,
        clauseCitation: props.result.clauseCitation,
      }),
    )

    try {
      const res = await fetch("/api/scope-guard/change-order-pack", {
        method: "POST",
        body,
        signal: controller.signal,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Request failed (${res.status})`)
      }
      const json = (await res.json()) as ChangeOrderPackResponse
      setPackState({ status: "ready", data: json })
      setPackOpen(true)
      toast({
        title: "Change order pack ready",
        description: "Generated a 1‑page addendum draft for client approval.",
        tone: "success",
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setPackState({ status: "idle" })
        return
      }
      const message = error instanceof Error ? error.message : String(error)
      setPackState({ status: "error", message })
      toast({
        title: "Pack generation failed",
        description: message,
        tone: "error",
      })
    }
  }, [
    props.client,
    props.projectPhase,
    props.requestText,
    props.result.bucket,
    props.result.clauseCitation,
    props.result.estimate,
    props.result.verdict,
    props.sowFile,
    toast,
  ])

  return (
    <div className="space-y-6">
      <div className={cn("rounded-2xl border bg-card/60 p-6 backdrop-blur-xl", theme.border)}>
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="text-sm text-foreground/70">Scope Guard Verdict</div>
            <div className="mt-3">
              <div
                className={cn(
                  "inline-flex items-center gap-3 rounded-full border px-5 py-3 text-lg font-semibold tracking-tight",
                  theme.border,
                  theme.bg,
                  theme.accent,
                )}
              >
                <Icon className={cn("h-5 w-5", theme.accent)} />
                {theme.label}
              </div>
            </div>
            <div className="mt-3 text-sm text-foreground/80">
              Classification:{" "}
              <span className="text-white">
                {props.result.bucket === "bug_defect"
                  ? "Bug/Defect"
                  : props.result.bucket === "clarification"
                    ? "Clarification"
                    : "New Feature / Change Request"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={props.onRegenerate}>
              Regenerate
            </Button>
          </div>
        </div>
      </div>

      <Card className="bg-card/60 backdrop-blur-xl">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-white">Triage Actions</CardTitle>
            <div className="mt-1 text-sm text-foreground/80">
              Log client comms and route this request into your executive dashboard.
            </div>
          </div>
          {dashboardItem ? (
            <Badge
              variant="outline"
              className="border-border/70 bg-background/30 text-foreground/80"
            >
              Status: {stageLabel(dashboardItem.stage)}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-border/70 bg-background/30 text-foreground/80"
            >
              Not yet logged
            </Badge>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-foreground/80">
            Recommended:{" "}
            <span className="text-white">{queueAction.label}</span>
            {canAssignConsultant ? (
              <>
                {" "}
                • <span className="text-white">Assign consultant</span> (large out-of-scope)
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={commsLogged ? "secondary" : "outline"}
              disabled={commsLogged}
              onClick={() => {
                ensureItem()
                dashboard.logCommunication(dashboardId, {
                  channel: "slack",
                  activityLabel: "Client contacted (Scope Guard)",
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

            <Button
              size="sm"
              onClick={() => {
                ensureItem()
                dashboard.setStage(dashboardId, queueAction.stage, queueAction.activityLabel)
                toast({
                  title: queueAction.label,
                  description: `Status updated to ${stageLabel(queueAction.stage)}.`,
                  tone: "success",
                })
              }}
            >
              {queueAction.label}
            </Button>

            {canGenerateChangeOrderPack ? (
              <Button
                size="sm"
                variant={packState.status === "ready" ? "secondary" : "outline"}
                disabled={packState.status === "drafting"}
                onClick={() => {
                  if (packState.status === "ready") {
                    setPackOpen(true)
                    return
                  }
                  void generatePack()
                }}
              >
                <FileTextIcon className="h-4 w-4" />
                {packState.status === "ready" ? "Open Change Order Pack" : "Generate Change Order Pack"}
              </Button>
            ) : null}

            {canAssignConsultant ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={assigned}
                  >
                    {assigned ? "Assigned" : "Assign consultant"}
                    <ChevronDownIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Consultants</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {dashboard.assignees
                    .filter((p) => p.role === "consultant")
                    .map((p) => (
                      <DropdownMenuItem
                        key={p.id}
                        onSelect={() => {
                          ensureItem()
                          dashboard.assign(dashboardId, p.id, `Assigned to ${p.name}`)
                          dashboard.setStage(dashboardId, "assigned", "Assigned to consultant")
                          toast({
                            title: `Assigned to ${p.name}`,
                            description: "Consultant assignment logged on the dashboard.",
                            tone: "success",
                          })
                        }}
                      >
                        {p.name}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            <Button size="sm" variant="ghost" asChild className="text-foreground/80">
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <ChangeOrderDraftOverlay
        open={packState.status === "drafting"}
        onCancel={cancelPack}
      />
      <ChangeOrderPackModal
        open={packOpen}
        onOpenChange={setPackOpen}
        data={packState.status === "ready" ? packState.data : null}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Engineering Impact</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-4 text-center">
            <div className={cn("grid h-16 w-16 place-items-center rounded-2xl border bg-background/20", theme.border)}>
              <ShieldIcon className={cn("h-8 w-8", theme.accent)} />
            </div>
            <div className="text-4xl font-semibold tracking-tight text-white">
              {props.result.estimate.size[0]!.toUpperCase() + props.result.estimate.size.slice(1)}
            </div>
            <div className="text-sm text-foreground/80">
              Estimated effort:{" "}
              <span className="text-white">{formatHours(props.result.estimate.hours)}</span>
            </div>
            <div className="text-sm text-foreground/80">{props.result.estimate.rationale}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-xl lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-white">Clause Citation</CardTitle>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-foreground/80"
              onClick={() => copyText(citationText)}
            >
              <CopyIcon className="h-4 w-4" /> Copy
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea value={citationText} readOnly className="min-h-[220px] resize-none" />
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-xl lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-white">Diplomat Response</CardTitle>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-foreground/80"
              onClick={() => copyText(diplomatText)}
            >
              <CopyIcon className="h-4 w-4" /> Copy
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={diplomatText} readOnly className="min-h-[220px] resize-none" />
            <div className="text-xs text-foreground/70">
              Generated by {props.result.model ?? "heuristics"} • {new Date(props.result.generatedAt).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
