import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Chart color tokens wired to the design system.
 * These map to CSS variables defined in `src/index.css` (via `@theme inline`):
 * - --color-chart-1..5
 */
export const chartColors = {
  chart1: "var(--color-chart-1)",
  chart2: "var(--color-chart-2)",
  chart3: "var(--color-chart-3)",
  chart4: "var(--color-chart-4)",
  chart5: "var(--color-chart-5)",
} as const

export type ChartColor = (typeof chartColors)[keyof typeof chartColors]

export function ChartContainer(props: {
  children: React.ReactNode
  className?: string
  "aria-label"?: string
}) {
  return (
    <div
      className={cn(
        "w-full",
        // Ensure SVG text inherits our font + colors
        "[&_.recharts-text]:fill-foreground/70",
        "[&_.recharts-cartesian-axis-tick_text]:fill-foreground/60",
        "[&_.recharts-cartesian-grid_line]:stroke-border/60",
        "[&_.recharts-tooltip-cursor]:fill-foreground/[0.06]",
        props.className,
      )}
      role="img"
      aria-label={props["aria-label"]}
    >
      {props.children}
    </div>
  )
}

export function ChartTooltipFrame(props: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/85 px-3 py-2 text-xs shadow-lg backdrop-blur-xl">
      {props.title ? <div className="mb-1 font-medium text-foreground">{props.title}</div> : null}
      <div className="space-y-1 text-foreground/80">{props.children}</div>
    </div>
  )
}

export function ChartTooltipRow(props: {
  label: React.ReactNode
  value: React.ReactNode
  swatchColor?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {props.swatchColor ? (
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ background: props.swatchColor }}
          />
        ) : null}
        <div className="min-w-0 truncate">{props.label}</div>
      </div>
      <div className="shrink-0 tabular-nums text-foreground">{props.value}</div>
    </div>
  )
}


