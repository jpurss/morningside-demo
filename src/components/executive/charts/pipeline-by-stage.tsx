import * as React from "react"
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { ChartContainer, ChartTooltipFrame, ChartTooltipRow, chartColors } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { formatUsd, stageLabel, stageRank, type ExecutiveItem, type ExecutiveStage } from "@/lib/executive-dashboard"

type StageDatum = {
  stage: ExecutiveStage
  label: string
  count: number
  hours: number
  valueUsd: number
}

const STAGE_COLOR: Partial<Record<ExecutiveStage, string>> = {
  inbox: chartColors.chart5,
  triage: chartColors.chart4,
  awaiting_client: chartColors.chart3,
  backlog: chartColors.chart2,
  approved: chartColors.chart1,
  assigned: chartColors.chart2,
  in_progress: chartColors.chart3,
  done: chartColors.chart1,
  archived: chartColors.chart5,
}

function isOpenStage(stage: ExecutiveStage) {
  return stage !== "done" && stage !== "archived"
}

function PipelineTooltipContent(props: any & { stageData: StageDatum[] }) {
  const payload0 = props.payload?.[0] as unknown as { name?: unknown } | undefined
  const stage = typeof payload0?.name === "string" ? (payload0.name as ExecutiveStage) : undefined
  if (!props.active || !stage) return null
  const datum = props.stageData.find((d: StageDatum) => d.stage === stage)
  if (!datum) return null

  return (
    <ChartTooltipFrame title={datum.label}>
      <ChartTooltipRow label="Open items" value={datum.count} swatchColor={STAGE_COLOR[stage] ?? chartColors.chart3} />
      <ChartTooltipRow label="Hours" value={`${datum.hours}h`} />
      <ChartTooltipRow label="Expected value" value={formatUsd(datum.valueUsd)} />
    </ChartTooltipFrame>
  )
}

export function PipelineByStageChart(props: { items: ExecutiveItem[]; className?: string }) {
  const stageData = React.useMemo<StageDatum[]>(() => {
    const open = props.items.filter((i) => isOpenStage(i.stage))
    const stages = Array.from(new Set(open.map((i) => i.stage))).sort((a, b) => stageRank(a) - stageRank(b))
    return stages.map((stage) => {
      const stageItems = open.filter((i) => i.stage === stage)
      return {
        stage,
        label: stageLabel(stage),
        count: stageItems.length,
        hours: stageItems.reduce((sum, i) => sum + (i.estimateHours || 0), 0),
        valueUsd: stageItems.reduce((sum, i) => sum + (i.expectedRevenueUsd || 0), 0),
      }
    })
  }, [props.items])

  const stackedRow = React.useMemo(() => {
    const row: Record<string, number | string> = { key: "open" }
    for (const s of stageData) row[s.stage] = s.count
    return [row]
  }, [stageData])

  const totals = React.useMemo(() => {
    return {
      count: stageData.reduce((sum, d) => sum + d.count, 0),
      hours: stageData.reduce((sum, d) => sum + d.hours, 0),
      valueUsd: stageData.reduce((sum, d) => sum + d.valueUsd, 0),
    }
  }, [stageData])

  const hasData = totals.count > 0

  const srSummary = React.useMemo(() => {
    if (!hasData) return "No open pipeline items."
    const top = [...stageData].sort((a, b) => b.count - a.count)[0]
    const topLabel = top ? `${top.label} with ${top.count}` : "no stages"
    return `Open pipeline has ${totals.count} items (${totals.hours} hours, ${formatUsd(totals.valueUsd)} expected). Largest stage is ${topLabel}.`
  }, [hasData, stageData, totals])

  return (
    <div className={cn("space-y-3", props.className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="text-xs text-foreground/60">
          <span className="text-foreground/80">{totals.count}</span> open •{" "}
          <span className="text-foreground/80">{totals.hours}h</span> •{" "}
          <span className="text-foreground/80">{formatUsd(totals.valueUsd)}</span>
        </div>
        <div className="text-xs text-foreground/60">Stacked by stage</div>
      </div>

      <div className="sr-only" aria-live="polite">
        {srSummary}
      </div>

      {!hasData ? (
        <div className="rounded-xl border border-border/70 bg-background/20 p-4 text-sm text-foreground/75">
          No open items to visualize yet.
        </div>
      ) : (
        <ChartContainer aria-label="Pipeline distribution by stage">
          <div className="h-14 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedRow} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                <XAxis type="number" hide domain={[0, "dataMax"]} />
                <YAxis type="category" hide dataKey="key" />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  content={(p) => <PipelineTooltipContent {...p} stageData={stageData} />}
                />
                {stageData.map((d) => (
                  <Bar
                    key={d.stage}
                    dataKey={d.stage}
                    name={d.stage}
                    stackId="stages"
                    fill={STAGE_COLOR[d.stage] ?? chartColors.chart3}
                    radius={d.stage === stageData[stageData.length - 1]?.stage ? [8, 8, 8, 8] : 0}
                    isAnimationActive
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>
      )}
    </div>
  )
}


