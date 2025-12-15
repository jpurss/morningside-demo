import * as React from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import { ChartContainer, ChartTooltipFrame, ChartTooltipRow, chartColors } from "@/components/ui/chart"
import { cn } from "@/lib/utils"

type Segment = {
  key: "over" | "nearBalanced" | "available"
  label: string
  value: number
  color: string
}

function CapacityTooltipContent(props: any & { segments: Segment[] }) {
  const payload0 = props.payload?.[0]
  const datum = (payload0 as unknown as { payload?: Segment } | undefined)?.payload
  const key = datum?.key
  if (!props.active || !key) return null
  const seg = props.segments.find((s: Segment) => s.key === key)
  if (!seg) return null

  const total = props.segments.reduce((sum: number, s: Segment) => sum + s.value, 0)
  const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0

  return (
    <ChartTooltipFrame title="Consulting capacity">
      <ChartTooltipRow label={seg.label} value={`${seg.value} (${pct}%)`} swatchColor={seg.color} />
    </ChartTooltipFrame>
  )
}

export function CapacityMixChart(props: {
  over: number
  nearBalanced: number
  available: number
  className?: string
}) {
  const segments = React.useMemo<Segment[]>(() => {
    return [
      { key: "over", label: "Over capacity", value: Math.max(0, props.over), color: "rgba(229,72,77,0.65)" },
      { key: "nearBalanced", label: "Near/Balanced", value: Math.max(0, props.nearBalanced), color: "rgba(242,201,76,0.55)" },
      { key: "available", label: "Available", value: Math.max(0, props.available), color: chartColors.chart1 },
    ]
  }, [props.available, props.nearBalanced, props.over])

  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const hasData = total > 0

  const srSummary = React.useMemo(() => {
    if (!hasData) return "No consulting capacity data available."
    return `Consulting capacity distribution: ${props.over} over capacity, ${props.nearBalanced} near or balanced, ${props.available} available.`
  }, [hasData, props.available, props.nearBalanced, props.over])

  return (
    <div className={cn("space-y-2", props.className)}>
      <div className="sr-only" aria-live="polite">
        {srSummary}
      </div>

      {!hasData ? (
        <div className="rounded-xl border border-border/70 bg-background/20 p-4 text-sm text-foreground/75">
          No consultants to visualize yet.
        </div>
      ) : (
        <ChartContainer aria-label="Consulting capacity mix">
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Tooltip content={(p) => <CapacityTooltipContent {...p} segments={segments} />} />
                <Pie
                  data={segments}
                  dataKey="value"
                  nameKey="key"
                  innerRadius={34}
                  outerRadius={52}
                  paddingAngle={2}
                  stroke="rgba(150,177,158,0.12)"
                  strokeWidth={2}
                  isAnimationActive
                >
                  {segments.map((s) => (
                    <Cell key={s.key} fill={s.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>
      )}

      <div className="flex items-center justify-between text-xs text-foreground/60">
        <span>
          Total{" "}
          <span className="text-foreground/80 tabular-nums">
            {total}
          </span>
        </span>
        <span className="tabular-nums text-foreground/70">
          {props.over > 0 ? "Risk: over capacity" : "Healthy"}
        </span>
      </div>
    </div>
  )
}


