import * as React from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltipFrame, ChartTooltipRow, chartColors } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { stageLabel, type ExecutiveItem } from "@/lib/executive-dashboard"

const DAY_MS = 24 * 60 * 60 * 1000
const AWAITING_CLIENT_RISK_DAYS = 7
const STALE_TOP_N = 5

type Bucket = { key: string; label: string; min: number; max: number; count: number }

function AgingTooltipContent(props: any) {
  const payload = props.payload?.[0]
  const label = props.label as string | undefined
  const count = typeof payload?.value === "number" ? payload.value : null
  if (!props.active || !label || count == null) return null

  return (
    <ChartTooltipFrame title="Aging bucket">
      <ChartTooltipRow label={label} value={count} swatchColor={chartColors.chart3} />
    </ChartTooltipFrame>
  )
}

function formatAgeDays(days: number) {
  if (!Number.isFinite(days) || days < 0) return "0d"
  return `${Math.floor(days)}d`
}

function isOpen(item: ExecutiveItem) {
  return item.stage !== "done" && item.stage !== "archived"
}

export function AgingRiskChart(props: { items: ExecutiveItem[]; className?: string }) {
  const computed = React.useMemo(() => {
    const now = Date.now()
    const open = props.items.filter(isOpen)

    const buckets: Bucket[] = [
      { key: "0_3", label: "0–3d", min: 0, max: 3, count: 0 },
      { key: "4_7", label: "4–7d", min: 4, max: 7, count: 0 },
      { key: "8_14", label: "8–14d", min: 8, max: 14, count: 0 },
      { key: "15_30", label: "15–30d", min: 15, max: 30, count: 0 },
      { key: "31p", label: "31+d", min: 31, max: Number.POSITIVE_INFINITY, count: 0 },
    ]

    const withAge = open.map((item) => {
      const ageDays = Math.max(0, Math.floor((now - item.updatedAt) / DAY_MS))
      return { item, ageDays }
    })

    for (const entry of withAge) {
      const bucket = buckets.find((b) => entry.ageDays >= b.min && entry.ageDays <= b.max)
      if (bucket) bucket.count += 1
    }

    const awaitingClientRisk = withAge.filter(
      ({ item, ageDays }) => item.stage === "awaiting_client" && ageDays >= AWAITING_CLIENT_RISK_DAYS,
    )

    const staleOver14 = withAge.filter((e) => e.ageDays >= 15).length

    const stalest = [...withAge]
      .sort((a, b) => b.ageDays - a.ageDays)
      .slice(0, STALE_TOP_N)
      .map(({ item, ageDays }) => ({
        id: item.id,
        title: item.title,
        stage: item.stage,
        ageDays,
      }))

    return {
      openCount: open.length,
      buckets,
      awaitingClientRiskCount: awaitingClientRisk.length,
      staleOver14Count: staleOver14,
      stalest,
    }
  }, [props.items])

  const hasData = computed.openCount > 0

  const srSummary = React.useMemo(() => {
    if (!hasData) return "No open items to analyze for aging risk."
    return `Aging risk: ${computed.openCount} open items. ${computed.staleOver14Count} items older than 14 days. ${computed.awaitingClientRiskCount} awaiting client items older than ${AWAITING_CLIENT_RISK_DAYS} days.`
  }, [computed, hasData])

  return (
    <div className={cn("space-y-4", props.className)}>
      <div className="sr-only" aria-live="polite">
        {srSummary}
      </div>

      {!hasData ? (
        <div className="rounded-xl border border-border/70 bg-background/20 p-4 text-sm text-foreground/75">
          No open items to analyze yet.
        </div>
      ) : (
        <ChartContainer aria-label="Aging distribution for open items">
          <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={computed.buckets} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} width={18} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip content={(p) => <AgingTooltipContent {...p} />} />
                <Bar dataKey="count" fill={chartColors.chart3} radius={[6, 6, 0, 0]} isAnimationActive />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-foreground/60">
        <span>
          Awaiting client risk{" "}
          <span className={cn("tabular-nums", computed.awaitingClientRiskCount > 0 ? "text-red-300" : "text-foreground/80")}>
            {computed.awaitingClientRiskCount}
          </span>{" "}
          (≥ {AWAITING_CLIENT_RISK_DAYS}d)
        </span>
        <span>
          Older than 14d{" "}
          <span className={cn("tabular-nums", computed.staleOver14Count > 0 ? "text-yellow-100" : "text-foreground/80")}>
            {computed.staleOver14Count}
          </span>
        </span>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-foreground/80">Stalest items</div>
        {computed.stalest.length === 0 ? (
          <div className="text-sm text-foreground/70">No items.</div>
        ) : (
          <div className="space-y-2">
            {computed.stalest.map((it) => (
              <div
                key={it.id}
                className="rounded-lg border border-border/60 bg-background/10 px-3 py-2 text-sm"
              >
                <div className="clamp-1 text-foreground">{it.title}</div>
                <div className="mt-1 flex items-center justify-between text-xs text-foreground/60">
                  <span>{stageLabel(it.stage)}</span>
                  <span className="tabular-nums">{formatAgeDays(it.ageDays)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


