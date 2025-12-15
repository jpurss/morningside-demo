import * as React from "react"
import { ChevronDownIcon, ChevronRightIcon, MoreVerticalIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"
import {
  bucketLabel,
  formatUsd,
  isOpenStage,
  monthBuckets,
  stageRank,
  stageLabel,
  EXEC_STAGES,
  workstreamLabel,
  type ExecutiveItem,
  type ExecutiveStage,
  type ExecutiveWorkstream,
} from "@/lib/executive-dashboard"
import { useExecutiveDashboard } from "@/lib/use-executive-dashboard"
import { capacityTier, getRosterProfile, utilization, type CapacityTier } from "@/lib/roster-capacity"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Ripple } from "@/components/ui/ripple"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/toast"
import { PipelineByStageChart } from "@/components/executive/charts/pipeline-by-stage"
import { CapacityMixChart } from "@/components/executive/charts/capacity-mix"
import { AgingRiskChart } from "@/components/executive/charts/aging-risk"

const DASHBOARD_NOW = Date.now()

export function DashboardPage() {
  const dashboard = useExecutiveDashboard()
  const [tab, setTab] = React.useState<"all" | ExecutiveWorkstream>("all")
  const [queueView, setQueueView] = React.useState<QueueView>("now")

  const buckets = React.useMemo(() => monthBuckets(DASHBOARD_NOW, 6), [])

  const workstreamItems = React.useMemo(() => {
    const sorted = [...dashboard.items].sort((a, b) => b.updatedAt - a.updatedAt)
    if (tab === "all") return sorted
    return sorted.filter((item) => item.workstream === tab)
  }, [dashboard.items, tab])

  const kpis = React.useMemo(() => computeKpis(workstreamItems, buckets), [buckets, workstreamItems])

  const consultingCapacity = React.useMemo(() => {
    const consultants = dashboard.assignees.filter((a) => a.role === "consultant")
    const mutable: Record<CapacityTier, number> = {
      over: 0,
      near: 0,
      balanced: 0,
      available: 0,
      unknown: 0,
    }

    for (const assignee of consultants) {
      const profile = getRosterProfile(assignee)
      const pct = utilization(profile)
      const tier = capacityTier(pct)
      mutable[tier] = mutable[tier] + 1
    }

    return { total: consultants.length, ...mutable }
  }, [dashboard.assignees])

  const openUnassignedHours = React.useMemo(() => {
    return workstreamItems
      .filter((i) => i.assigneeId == null && isOpenStage(i.stage))
      .reduce((sum, i) => sum + (i.estimateHours || 0), 0)
  }, [workstreamItems])

  const shouldNudgeRoster = consultingCapacity.over > 0 || openUnassignedHours > 0

  const stageCounts = React.useMemo(() => {
    const counts: Record<ExecutiveStage, number> = Object.fromEntries(
      EXEC_STAGES.map((stage) => [stage, 0]),
    ) as Record<ExecutiveStage, number>
    for (const item of workstreamItems) counts[item.stage] = (counts[item.stage] ?? 0) + 1
    return counts
  }, [workstreamItems])

  const queueItems = React.useMemo(() => {
    const view = queueView
    if (view === "now") return workstreamItems.filter((i) => i.stage === "inbox" || i.stage === "triage")
    if (view === "open") return workstreamItems.filter((i) => isOpenStage(i.stage))
    if (view === "all") return workstreamItems
    return workstreamItems.filter((i) => i.stage === view)
  }, [queueView, workstreamItems])

  const queueSections = React.useMemo(() => {
    const byStage = new Map<ExecutiveStage, ExecutiveItem[]>()
    for (const item of queueItems) {
      const existing = byStage.get(item.stage)
      if (existing) existing.push(item)
      else byStage.set(item.stage, [item])
    }
    return Array.from(byStage.entries())
      .sort(([a], [b]) => stageRank(a) - stageRank(b))
      .map(([stage, items]) => ({
        stage,
        items,
        count: items.length,
        hours: items.reduce((sum, i) => sum + (i.estimateHours || 0), 0),
      }))
  }, [queueItems])

  const queueCounts = React.useMemo(() => {
    const now = (stageCounts.inbox ?? 0) + (stageCounts.triage ?? 0)
    const open = Object.entries(stageCounts).reduce((sum, [stage, count]) => {
      if (isOpenStage(stage as ExecutiveStage)) return sum + count
      return sum
    }, 0)
    const all = workstreamItems.length
    return { now, open, all }
  }, [stageCounts, workstreamItems.length])

  const [sectionOpen, setSectionOpen] = React.useState<Record<ExecutiveStage, boolean>>(() =>
    defaultSectionOpenState("now"),
  )

  React.useEffect(() => {
    setSectionOpen(defaultSectionOpenState(queueView))
  }, [queueView])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary">
            Executive Planning Dashboard
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={dashboard.resetDemo}>
            Reset demo data
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="scope_guard">SOW / Scope</TabsTrigger>
          <TabsTrigger value="data_cleaning">Data Cleaning</TabsTrigger>
          <TabsTrigger value="expert_consulting">Expert Consulting</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-4">
            <KpiCard
              label="Open requests"
              value={kpis.openRequests.value}
              trend={kpis.openRequests.trend}
            />
            <KpiCard
              label="Open hours"
              value={kpis.openHours.value}
              trend={kpis.openHours.trend}
            />
            <KpiCard
              label="Pipeline value"
              value={kpis.pipelineValue.value}
              trend={kpis.pipelineValue.trend}
            />
            <KpiCard
              label="Comms coverage"
              value={kpis.commsCoverage.value}
              trend={kpis.commsCoverage.trend}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-card/60 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Scope Guard Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InsightRow
                  label="Bug-fix hours (MTD)"
                  value={`${kpis.workstreams.scopeGuard.bugFixHoursMtd}h`}
                  trend={kpis.workstreams.scopeGuard.bugFixHoursTrend}
                />
                <InsightRow
                  label="Change-order value (MTD)"
                  value={formatUsd(kpis.workstreams.scopeGuard.changeOrderValueMtd)}
                  trend={kpis.workstreams.scopeGuard.changeOrderValueTrend}
                />
                <InsightRow
                  label="Grey-area items (open)"
                  value={String(kpis.workstreams.scopeGuard.greyAreaOpen)}
                  trend={{ direction: "flat", label: "— open" }}
                />
              </CardContent>
            </Card>

            <Card className="bg-card/60 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Data Audit Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InsightRow
                  label="Cleanup hours (MTD)"
                  value={`${kpis.workstreams.dataAudit.cleanupHoursMtd}h`}
                  trend={kpis.workstreams.dataAudit.cleanupHoursTrend}
                />
                <InsightRow
                  label="Cleanup value (MTD)"
                  value={formatUsd(kpis.workstreams.dataAudit.cleanupValueMtd)}
                  trend={kpis.workstreams.dataAudit.cleanupValueTrend}
                />
                <InsightRow
                  label="Ready-to-ingest rate"
                  value={`${Math.round(kpis.workstreams.dataAudit.readyRate * 100)}%`}
                  trend={{ direction: "flat", label: "— last 6 mo" }}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="bg-card/60 backdrop-blur-xl lg:col-span-2">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
              <CardTitle className="text-white">Triage Queue</CardTitle>
                  <div className="mt-1 text-sm text-foreground/80">
                    Prioritize, assign, and move items into backlog or change-order flow.
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-border/70 bg-background/30 text-foreground/80"
                >
                  {queueItems.length === workstreamItems.length
                    ? `${workstreamItems.length} item(s)`
                    : `${queueItems.length} shown · ${workstreamItems.length} total`}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {workstreamItems.length === 0 ? (
                  <div className="rounded-xl border border-border/70 bg-background/20 p-6 text-sm text-foreground/80">
                    Nothing in the queue yet. Run Scope Guard or Data Audit and add items here.
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant={queueView === "now" ? "secondary" : "ghost"}
                          onClick={() => setQueueView("now")}
                        >
                          Now <span className="ml-1 text-foreground/60">{queueCounts.now}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant={queueView === "open" ? "secondary" : "ghost"}
                          onClick={() => setQueueView("open")}
                        >
                          Open <span className="ml-1 text-foreground/60">{queueCounts.open}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant={queueView === "all" ? "secondary" : "ghost"}
                          onClick={() => setQueueView("all")}
                        >
                          All <span className="ml-1 text-foreground/60">{queueCounts.all}</span>
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="gap-1">
                              Stage
                              <ChevronDownIcon className="h-4 w-4 text-foreground/60" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-56">
                            <DropdownMenuLabel>Jump to stage</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {EXEC_STAGES.map((stage) => (
                              <DropdownMenuItem key={stage} onSelect={() => setQueueView(stage)}>
                                <span>{stageLabel(stage)}</span>
                                <span className="ml-auto text-xs text-foreground/60">
                                  {stageCounts[stage] ?? 0}
                                </span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="text-xs text-foreground/60">
                        Viewing{" "}
                        <span className="text-foreground/80">{queueViewLabel(queueView)}</span>
                      </div>
                    </div>

                    {queueItems.length === 0 ? (
                      <div className="rounded-xl border border-border/70 bg-background/20 p-5">
                        <div className="text-sm text-foreground/80">No items match this view.</div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button size="sm" variant="secondary" onClick={() => setQueueView("open")}>
                            Show open items
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setQueueView("all")}>
                            Show all
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {queueSections.map((section) => (
                          <div key={section.stage} className="space-y-2">
                            <button
                              type="button"
                              className={cn(
                                "flex w-full items-center justify-between rounded-lg border border-border/50 bg-background/10 px-3 py-2 text-left",
                                "transition-colors hover:border-border/70 hover:bg-background/15",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
                              )}
                              onClick={() =>
                                setSectionOpen((prev) => ({
                                  ...prev,
                                  [section.stage]: !(prev[section.stage] ?? false),
                                }))
                              }
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <ChevronRightIcon
                                  className={cn(
                                    "h-4 w-4 shrink-0 text-foreground/60 transition-transform",
                                    sectionOpen[section.stage] ? "rotate-90" : "rotate-0",
                                  )}
                                />
                                <div className="min-w-0 truncate text-sm font-medium text-foreground">
                                  {stageLabel(section.stage)}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-foreground/60">
                                <span>{section.count} item(s)</span>
                                <span>{section.hours}h</span>
                              </div>
                            </button>

                            {sectionOpen[section.stage] ? (
                              <div className="space-y-2">
                                {section.items.map((item) => (
                                  <QueueRow key={item.id} item={item} showWorkstream={tab === "all"} />
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <div className="relative z-10">
                <Link
                  to="/roster?role=consultant"
                  className="relative block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                  aria-label="View consulting capacity on roster"
                >
                  <Card
                    className={cn(
                      "relative bg-card/60 backdrop-blur-xl transition-colors",
                      "hover:bg-card/70",
                    )}
                  >
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                      <CardTitle className="text-white">Consulting Capacity</CardTitle>
                      <span className="text-xs text-primary/80 pulse-primary">View roster →</span>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <CapacityMixChart
                        over={consultingCapacity.over}
                        nearBalanced={consultingCapacity.near + consultingCapacity.balanced}
                        available={consultingCapacity.available}
                      />
                      <MetricRow
                        label={<span className="text-red-300">Over capacity</span>}
                        emphasized
                        value={
                          <span className="tabular-nums">
                            <span className="text-red-300">{consultingCapacity.over}</span>
                            <span className="text-foreground/50"> / {consultingCapacity.total}</span>
                          </span>
                        }
                      />
                      <MetricRow
                        label="Available now"
                        emphasized
                        value={
                          <span className="tabular-nums text-primary">
                            {consultingCapacity.available}
                          </span>
                        }
                      />
                      <MetricRow
                        label="Unassigned open work"
                        value={
                          <span className={cn("tabular-nums", openUnassignedHours > 0 ? "text-red-300" : "text-white")}>
                            {openUnassignedHours}h
                          </span>
                        }
                      />
                      <div className="pt-2">
                        <StackedBar
                          segments={[
                            { value: consultingCapacity.over, className: "bg-red-400/35" },
                            { value: consultingCapacity.near + consultingCapacity.balanced, className: "bg-yellow-400/30" },
                            { value: consultingCapacity.available, className: "bg-primary/35" },
                          ]}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                {shouldNudgeRoster ? (
                  <Ripple
                    className="absolute inset-0 rounded-xl"
                    mainCircleOpacity={0.15}
                    numCircles={4}
                    ringSpacing={10}
                    duration={3}
                  />
                ) : null}
              </div>

              <Card className="bg-card/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Pipeline (by stage)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PipelineByStageChart items={workstreamItems} />
                  <MetricRow
                    label="Scope Guard change orders"
                    value={formatUsd(kpis.pipeline.scopeGuardValue)}
                  />
                  <MetricRow
                    label="Data cleanup add-ons"
                    value={formatUsd(kpis.pipeline.dataCleaningValue)}
                  />
                  <MetricRow
                    label="Expert consulting"
                    value={formatUsd(kpis.pipeline.expertConsultingValue)}
                  />
                  <div className="border-t border-border/50 pt-4">
                    <MetricRow
                      label="Total expected value"
                      value={formatUsd(kpis.pipeline.totalValue)}
                      emphasized
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Aging Risk</CardTitle>
                </CardHeader>
                <CardContent>
                  <AgingRiskChart items={workstreamItems} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function KpiCard(props: { label: string; value: string; trend: Trend }) {
  const tone =
    props.trend.direction === "up"
      ? "text-primary"
      : props.trend.direction === "down"
        ? "text-red-300"
        : "text-foreground/70"

  return (
    <Card className="bg-card/60 backdrop-blur-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground/80">
          {props.label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight text-white">{props.value}</div>
        <div className={cn("mt-2 text-xs", tone)}>{props.trend.label}</div>
      </CardContent>
    </Card>
  )
}

function MetricRow(props: { label: React.ReactNode; value: React.ReactNode; emphasized?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm text-foreground/80">{props.label}</div>
      <div className={cn("text-sm", props.emphasized ? "font-semibold text-white" : "text-white")}>
        {props.value}
      </div>
    </div>
  )
}

function InsightRow(props: { label: string; value: string; trend: Trend }) {
  const tone =
    props.trend.direction === "up"
      ? "text-primary"
      : props.trend.direction === "down"
        ? "text-red-300"
        : "text-foreground/70"

  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm text-foreground/80">{props.label}</div>
        <div className={cn("mt-1 text-xs", tone)}>{props.trend.label}</div>
      </div>
      <div className="text-sm font-semibold text-white">{props.value}</div>
    </div>
  )
}

function StackedBar(props: { segments: Array<{ value: number; className: string }> }) {
  const total = props.segments.reduce((sum, s) => sum + Math.max(0, s.value), 0) || 1
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-background/20">
      <div className="flex h-full w-full">
        {props.segments.map((seg, idx) => (
          <div
            key={idx}
            className={seg.className}
            style={{ width: `${(Math.max(0, seg.value) / total) * 100}%` }}
          />
        ))}
      </div>
    </div>
  )
}

function QueueRow(props: { item: ExecutiveItem; showWorkstream?: boolean }) {
  const dashboard = useExecutiveDashboard()
  const { toast } = useToast()
  const assignee = props.item.assigneeId
    ? dashboard.assignees.find((p) => p.id === props.item.assigneeId)
    : null

  return (
    <div
      className={cn(
        "group flex flex-col gap-2 rounded-xl border border-border/50 bg-background/15 p-3",
        "transition-colors hover:border-border/70 hover:bg-background/20",
        "focus-within:border-border/70 focus-within:ring-1 focus-within:ring-primary/25",
        "md:flex-row md:items-start md:justify-between",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {props.showWorkstream ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-2 text-xs font-medium text-foreground/70",
                    "rounded-full border border-border/50 bg-background/10 px-2 py-0.5",
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      props.item.workstream === "scope_guard"
                        ? "bg-primary/70"
                        : props.item.workstream === "expert_consulting"
                          ? "bg-purple-400/60"
                          : "bg-yellow-400/60",
                    )}
                  />
                  {workstreamLabel(props.item.workstream)}
                </span>
              ) : null}

              <div className="truncate text-sm font-medium text-foreground">{props.item.title}</div>

              {props.item.comms.status !== "contacted" ? (
                <Badge variant="outline" className="border-yellow-400/30 bg-background/20 text-yellow-200/90">
                  Needs contact
                </Badge>
              ) : null}

              {!assignee ? (
                <Badge variant="outline" className="border-border/60 bg-background/20 text-foreground/70">
                  Unassigned
                </Badge>
              ) : null}
            </div>

            {props.item.summary ? (
              <div className="mt-1 text-sm text-foreground/70 clamp-2">{props.item.summary}</div>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-foreground/60">
              <span className="text-foreground/75">{props.item.client}</span>
              <span>•</span>
              <span>{props.item.estimateHours}h</span>
              {props.item.workstream === "scope_guard" && props.item.source.kind === "scope_guard" ? (
                <>
                  <span>•</span>
                  <span>{bucketLabel(props.item.source.bucket)}</span>
                </>
              ) : null}
              {props.item.expectedRevenueUsd > 0 ? (
                <>
                  <span>•</span>
                  <span>{formatUsd(props.item.expectedRevenueUsd)}</span>
                </>
              ) : null}
              <span>•</span>
              <span>Owner: {assignee ? assignee.name : "—"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-start">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground/80 transition-colors group-hover:text-foreground"
            >
              <MoreVerticalIcon className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Next actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {props.item.comms.status !== "contacted" ? (
              <DropdownMenuItem
                onSelect={() => {
                  dashboard.logCommunication(props.item.id, {
                    channel: props.item.workstream === "data_cleaning" ? "email" : "slack",
                    activityLabel: "Client contacted",
                  })
                  toast({
                    title: "Communication logged",
                    description: "Marked as contacted on the executive dashboard.",
                    tone: "success",
                  })
                }}
              >
                Log client contacted
              </DropdownMenuItem>
            ) : null}

            <DropdownMenuGroup>
              {renderStageActions(props.item).map((action) => (
                <DropdownMenuItem
                  key={action.stage}
                  onSelect={() => {
                    dashboard.setStage(props.item.id, action.stage, action.label)
                    toast({
                      title: action.label,
                      description: `Status updated to ${stageLabel(action.stage)}.`,
                      tone: "success",
                    })
                  }}
                >
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Assign owner</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-64">
                <DropdownMenuLabel>Assignees</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => dashboard.assign(props.item.id, null, "Unassigned")}>
                  Unassigned
                </DropdownMenuItem>
                {dashboard.assignees.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onSelect={() => {
                      dashboard.assign(props.item.id, p.id, `Assigned to ${p.name}`)
                      toast({
                        title: `Assigned to ${p.name}`,
                        description: `Owner updated (${p.role}).`,
                        tone: "success",
                      })
                    }}
                  >
                    {p.name}{" "}
                    <span className="ml-auto text-xs text-foreground/60">{p.role}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                dashboard.setStage(props.item.id, "archived", "Archived")
                toast({
                  title: "Archived",
                  description: "Item removed from active planning views.",
                  tone: "warning",
                })
              }}
            >
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

type QueueView = "now" | "open" | "all" | ExecutiveStage

function queueViewLabel(view: QueueView) {
  if (view === "now") return "Now (Inbox + Triage)"
  if (view === "open") return "Open stages"
  if (view === "all") return "All items"
  return stageLabel(view)
}

function defaultSectionOpenState(view: QueueView): Record<ExecutiveStage, boolean> {
  const open: Record<ExecutiveStage, boolean> = Object.fromEntries(
    EXEC_STAGES.map((stage) => [stage, false]),
  ) as Record<ExecutiveStage, boolean>

  if (view === "now") {
    open.triage = true
    return open
  }

  if (view === "open" || view === "all") {
    open.triage = true
    return open
  }

  open[view] = true
  return open
}

function renderStageActions(item: ExecutiveItem): Array<{ stage: ExecutiveStage; label: string }> {
  const current = item.stage
  const options: Array<{ stage: ExecutiveStage; label: string }> = []

  if (current === "inbox") options.push({ stage: "triage", label: "Move to triage" })

  if (item.workstream === "scope_guard") {
    if (current === "triage") {
      if (item.source.kind === "scope_guard" && item.source.verdict === "out_of_scope") {
        options.push({ stage: "awaiting_client", label: "Send change order (await approval)" })
      } else {
        options.push({ stage: "backlog", label: "Add to backlog" })
      }
      options.push({ stage: "awaiting_client", label: "Await client decision" })
    }
  } else {
    if (current === "triage") {
      options.push({ stage: "awaiting_client", label: "Send cleanup options (await decision)" })
      options.push({ stage: "approved", label: "Mark approved add-on" })
    }
  }

  if (current === "awaiting_client") options.push({ stage: "approved", label: "Mark approved" })
  if (current === "approved") options.push({ stage: "assigned", label: "Assign delivery" })
  if (current === "assigned") options.push({ stage: "in_progress", label: "Start work" })
  if (current === "in_progress" || current === "backlog") options.push({ stage: "done", label: "Mark done" })

  return options
}

type Trend = { direction: "up" | "down" | "flat"; label: string }

function trendFromDelta(delta: number | null, suffix: string): Trend {
  if (delta == null) return { direction: "flat", label: `— ${suffix}` }
  if (Math.abs(delta) < 0.005) return { direction: "flat", label: `Flat ${suffix}` }
  const pct = Math.round(delta * 100)
  if (pct > 0) return { direction: "up", label: `+${pct}% ${suffix}` }
  return { direction: "down", label: `${pct}% ${suffix}` }
}

function computeKpis(items: ExecutiveItem[], buckets: ReturnType<typeof monthBuckets>) {
  const open = items.filter((i) => i.stage !== "done" && i.stage !== "archived")
  const openHours = open.reduce((sum, i) => sum + (i.estimateHours || 0), 0)
  const pipelineValue = open.reduce((sum, i) => sum + (i.expectedRevenueUsd || 0), 0)
  const contacted = open.filter((i) => i.comms.status === "contacted").length
  const commsCoverage = open.length ? contacted / open.length : 0

  const current = buckets[buckets.length - 1]
  const prev = buckets[buckets.length - 2]

  const openThisMonth = open.filter((i) => i.createdAt >= current.start && i.createdAt < current.end)
  const openPrevMonth = open.filter((i) => i.createdAt >= prev.start && i.createdAt < prev.end)

  const openHoursThis = openThisMonth.reduce((sum, i) => sum + i.estimateHours, 0)
  const openHoursPrev = openPrevMonth.reduce((sum, i) => sum + i.estimateHours, 0)

  const pipelineThis = openThisMonth.reduce((sum, i) => sum + i.expectedRevenueUsd, 0)
  const pipelinePrev = openPrevMonth.reduce((sum, i) => sum + i.expectedRevenueUsd, 0)

  const commsThis = openThisMonth.length
    ? openThisMonth.filter((i) => i.comms.status === "contacted").length / openThisMonth.length
    : null
  const commsPrev = openPrevMonth.length
    ? openPrevMonth.filter((i) => i.comms.status === "contacted").length / openPrevMonth.length
    : null

  const scopeGuardValue = open
    .filter((i) => i.workstream === "scope_guard")
    .reduce((sum, i) => sum + i.expectedRevenueUsd, 0)
  const dataCleaningValue = open
    .filter((i) => i.workstream === "data_cleaning")
    .reduce((sum, i) => sum + i.expectedRevenueUsd, 0)
  const expertConsultingValue = open
    .filter((i) => i.workstream === "expert_consulting")
    .reduce((sum, i) => sum + i.expectedRevenueUsd, 0)

  const capacity = {
    inboxHours: open.filter((i) => i.stage === "inbox").reduce((sum, i) => sum + i.estimateHours, 0),
    awaitingClientHours: open
      .filter((i) => i.stage === "awaiting_client")
      .reduce((sum, i) => sum + i.estimateHours, 0),
    backlogHours: open
      .filter((i) => i.stage === "backlog" || i.stage === "in_progress" || i.stage === "assigned")
      .reduce((sum, i) => sum + i.estimateHours, 0),
  }

  const deltaHours = openHoursPrev ? (openHoursThis - openHoursPrev) / openHoursPrev : null
  const deltaPipeline = pipelinePrev ? (pipelineThis - pipelinePrev) / pipelinePrev : null
  const deltaOpen = openPrevMonth.length ? (openThisMonth.length - openPrevMonth.length) / openPrevMonth.length : null
  const deltaComms = commsPrev == null || commsThis == null ? null : commsThis - commsPrev

  const commsTrend: Trend =
    deltaComms == null
      ? { direction: "flat", label: "— vs last month" }
      : deltaComms >= 0.005
        ? { direction: "up", label: `+${Math.round(deltaComms * 100)} pts vs last month` }
        : deltaComms <= -0.005
          ? { direction: "down", label: `${Math.round(deltaComms * 100)} pts vs last month` }
          : { direction: "flat", label: "Flat vs last month" }

  const scopeGuardItems = items.filter((i) => i.source.kind === "scope_guard")
  const dataAuditItems = items.filter((i) => i.source.kind === "data_audit")

  const scopeBugFixHoursMtd = scopeGuardItems
    .filter(
      (i) =>
        i.createdAt >= current.start &&
        i.createdAt < current.end &&
        i.source.kind === "scope_guard" &&
        i.source.verdict === "in_scope" &&
        i.source.bucket === "bug_defect",
    )
    .reduce((sum, i) => sum + i.estimateHours, 0)

  const scopeBugFixHoursPrev = scopeGuardItems
    .filter(
      (i) =>
        i.createdAt >= prev.start &&
        i.createdAt < prev.end &&
        i.source.kind === "scope_guard" &&
        i.source.verdict === "in_scope" &&
        i.source.bucket === "bug_defect",
    )
    .reduce((sum, i) => sum + i.estimateHours, 0)

  const scopeChangeOrderValueMtd = scopeGuardItems
    .filter(
      (i) =>
        i.createdAt >= current.start &&
        i.createdAt < current.end &&
        i.source.kind === "scope_guard" &&
        i.source.verdict === "out_of_scope",
    )
    .reduce((sum, i) => sum + i.expectedRevenueUsd, 0)

  const scopeChangeOrderValuePrev = scopeGuardItems
    .filter(
      (i) =>
        i.createdAt >= prev.start &&
        i.createdAt < prev.end &&
        i.source.kind === "scope_guard" &&
        i.source.verdict === "out_of_scope",
    )
    .reduce((sum, i) => sum + i.expectedRevenueUsd, 0)

  const greyAreaOpen = scopeGuardItems.filter(
    (i) =>
      i.stage !== "done" &&
      i.stage !== "archived" &&
      i.source.kind === "scope_guard" &&
      i.source.verdict === "grey_area",
  ).length

  const cleanupHoursMtd = dataAuditItems
    .filter(
      (i) =>
        i.createdAt >= current.start &&
        i.createdAt < current.end &&
        i.source.kind === "data_audit" &&
        i.source.noteType === "needs_changes",
    )
    .reduce((sum, i) => sum + i.estimateHours, 0)

  const cleanupHoursPrev = dataAuditItems
    .filter(
      (i) =>
        i.createdAt >= prev.start &&
        i.createdAt < prev.end &&
        i.source.kind === "data_audit" &&
        i.source.noteType === "needs_changes",
    )
    .reduce((sum, i) => sum + i.estimateHours, 0)

  const cleanupValueMtd = dataAuditItems
    .filter(
      (i) =>
        i.createdAt >= current.start &&
        i.createdAt < current.end &&
        i.source.kind === "data_audit" &&
        i.source.noteType === "needs_changes",
    )
    .reduce((sum, i) => sum + i.expectedRevenueUsd, 0)

  const cleanupValuePrev = dataAuditItems
    .filter(
      (i) =>
        i.createdAt >= prev.start &&
        i.createdAt < prev.end &&
        i.source.kind === "data_audit" &&
        i.source.noteType === "needs_changes",
    )
    .reduce((sum, i) => sum + i.expectedRevenueUsd, 0)

  const readyRate = dataAuditItems.length
    ? dataAuditItems.filter((i) => i.source.kind === "data_audit" && i.source.overallColor === "green").length /
      dataAuditItems.length
    : 0

  return {
    openRequests: {
      value: String(open.length),
      trend: trendFromDelta(deltaOpen, "vs last month"),
    },
    openHours: {
      value: `${openHours}h`,
      trend: trendFromDelta(deltaHours, "vs last month"),
    },
    pipelineValue: {
      value: formatUsd(pipelineValue),
      trend: trendFromDelta(deltaPipeline, "vs last month"),
    },
    commsCoverage: {
      value: `${Math.round(commsCoverage * 100)}%`,
      trend: commsTrend,
    },
    capacity,
    pipeline: {
      scopeGuardValue,
      dataCleaningValue,
      expertConsultingValue,
      totalValue: scopeGuardValue + dataCleaningValue + expertConsultingValue,
    },
    workstreams: {
      scopeGuard: {
        bugFixHoursMtd: scopeBugFixHoursMtd,
        bugFixHoursTrend: trendFromDelta(
          scopeBugFixHoursPrev ? (scopeBugFixHoursMtd - scopeBugFixHoursPrev) / scopeBugFixHoursPrev : null,
          "vs last month",
        ),
        changeOrderValueMtd: scopeChangeOrderValueMtd,
        changeOrderValueTrend: trendFromDelta(
          scopeChangeOrderValuePrev
            ? (scopeChangeOrderValueMtd - scopeChangeOrderValuePrev) / scopeChangeOrderValuePrev
            : null,
          "vs last month",
        ),
        greyAreaOpen,
      },
      dataAudit: {
        cleanupHoursMtd,
        cleanupHoursTrend: trendFromDelta(
          cleanupHoursPrev ? (cleanupHoursMtd - cleanupHoursPrev) / cleanupHoursPrev : null,
          "vs last month",
        ),
        cleanupValueMtd,
        cleanupValueTrend: trendFromDelta(
          cleanupValuePrev ? (cleanupValueMtd - cleanupValuePrev) / cleanupValuePrev : null,
          "vs last month",
        ),
        readyRate,
      },
    },
  }
}
