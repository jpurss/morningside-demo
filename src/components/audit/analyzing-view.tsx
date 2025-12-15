import * as React from "react"
import { DatabaseZapIcon, FileSearchIcon, ScanTextIcon } from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function AnalyzingView(props: { startedAt: number }) {
  const [progress, setProgress] = React.useState(0)
  const [elapsedSec, setElapsedSec] = React.useState(0)

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setProgress((p) => clamp(p + Math.random() * 6, 6, 92))
    }, 700)
    return () => window.clearInterval(interval)
  }, [])

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setElapsedSec(Math.max(0, Math.round((Date.now() - props.startedAt) / 1000)))
    }, 500)
    return () => window.clearInterval(interval)
  }, [props.startedAt])

  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-10 backdrop-blur-xl">
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex-1">
          <div className="inline-flex items-center rounded-lg border border-primary/35 bg-primary/10 px-4 py-2 text-lg font-semibold text-white">
            Analyzing Data Assets...
          </div>

          <div className="mt-6 flex items-center gap-3 text-sm text-foreground/80">
            <Skeleton className="h-4 w-4 rounded-full bg-foreground/20" />
            <div>Estimated time remaining: ~2m</div>
            <div className="ml-auto text-xs text-foreground/60">
              Elapsed: {elapsedSec}s
            </div>
          </div>

          <div className="mt-4">
            <Progress value={progress} />
            <div className="mt-2 text-sm text-foreground/80">
              {Math.round(progress)}%
            </div>
          </div>

          <div className="mt-8 space-y-5">
            <Step icon={FileSearchIcon} label="Parsing and indexing file structure..." value={clamp(progress - 10, 10, 95)} />
            <Step icon={DatabaseZapIcon} label="Tokenizing unstructured text fields..." value={clamp(progress - 25, 5, 88)} />
            <Step icon={ScanTextIcon} label="Scanning for PII and anomalies..." value={clamp(progress - 40, 0, 82)} />
          </div>
        </div>

        <div className="hidden w-full max-w-sm items-center justify-center lg:flex">
          <NetworkFlow />
        </div>
      </div>
    </div>
  )
}

function Step(props: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  const Icon = props.icon
  return (
    <div className="flex items-center gap-4">
      <Icon className="h-6 w-6 text-primary" />
      <div className="flex-1">
        <Progress value={props.value} />
        <div className="mt-2 text-sm text-foreground/80">{props.label}</div>
      </div>
    </div>
  )
}

function NetworkFlow() {
  return (
    <svg
      viewBox="0 0 420 260"
      className="h-[240px] w-full opacity-90"
      role="img"
      aria-label="Processing graph"
    >
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(65,156,115,0.20)" />
          <stop offset="1" stopColor="rgba(65,156,115,0.70)" />
        </linearGradient>
        <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      <g stroke="url(#g)" strokeWidth="3" fill="none" filter="url(#blur)">
        <path d="M30 140 C90 90, 120 180, 180 130 S280 110, 340 90 S390 140, 410 110" />
        <path d="M30 190 C110 160, 120 220, 190 190 S270 170, 330 150 S380 210, 410 190" />
      </g>

      <g fill="rgba(65,156,115,0.95)" stroke="rgba(65,156,115,0.35)" strokeWidth="2">
        {[
          [50, 130],
          [110, 95],
          [150, 165],
          [200, 125],
          [250, 110],
          [300, 150],
          [340, 88],
          [380, 135],
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="22" height="22" rx="4" />
        ))}
      </g>
    </svg>
  )
}
