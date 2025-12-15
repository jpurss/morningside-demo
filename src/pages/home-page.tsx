import type * as React from "react"
import { Link } from "react-router-dom"
import { ArrowRightIcon, FileSearchIcon, ShieldIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type ToolCardProps = {
  to: string
  title: string
  description: string
  Icon: React.ComponentType<{ className?: string }>
  accentClassName: string
  glowClassName: string
  badges: string[]
}

function ToolCard(props: ToolCardProps) {
  return (
    <Link
      to={props.to}
      className={cn(
        "group relative block overflow-hidden rounded-2xl border border-border/70 bg-card/50 p-6 backdrop-blur-xl",
        "transition will-change-transform",
        "hover:-translate-y-0.5 hover:border-border/85 hover:bg-card/60 hover:shadow-[0_30px_90px_-60px_rgba(0,0,0,0.85)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      )}
      aria-label={props.title}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          props.glowClassName,
        )}
      />

      <div className="relative flex h-full flex-col justify-between gap-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background/20 ring-1 ring-border/60">
              <props.Icon className={cn("h-5 w-5", props.accentClassName)} />
            </div>

            <div className="min-w-0">
              <div className="text-lg font-semibold tracking-tight text-white">
                {props.title}
              </div>
              <p className="mt-1 text-sm text-foreground/80">{props.description}</p>
            </div>
          </div>

          <ArrowRightIcon className="mt-1 h-5 w-5 shrink-0 text-foreground/60 transition duration-200 group-hover:translate-x-0.5 group-hover:text-white" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {props.badges.map((label) => (
            <Badge
              key={label}
              variant="outline"
              className="border-border/70 bg-background/25 text-foreground/80"
            >
              {label}
            </Badge>
          ))}
        </div>
      </div>
    </Link>
  )
}

export function HomePage() {
  return (
    <div className="space-y-10 pt-2">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/20 px-3 py-1 text-xs text-foreground/70 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_6px_rgba(65,156,115,0.14)]" />
          Morningside AI · Consultant console
        </div>

        <div>
          <h1 className="text-balance text-4xl font-extrabold tracking-tight text-primary">
            Pick a tool to start.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground/80">
            Two quick checks before kickoff: scope boundaries and data readiness.
          </p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <ToolCard
          to="/scope-guard"
          title="Scope Guard"
          description="Fast, defensible in-scope vs change-order decisions."
          Icon={ShieldIcon}
          accentClassName="text-primary"
          glowClassName="bg-[radial-gradient(700px_circle_at_0%_0%,rgba(65,156,115,0.22),transparent_55%)]"
          badges={["SOW + request", "Verdict + justification"]}
        />
        <ToolCard
          to="/audit"
          title="Data Audit"
          description="AI readiness signals for CSV/PDF/TXT client assets."
          Icon={FileSearchIcon}
          accentClassName="text-yellow-300"
          glowClassName="bg-[radial-gradient(700px_circle_at_0%_0%,rgba(250,204,21,0.16),transparent_55%)]"
          badges={["CSV · PDF · TXT", "Risk + effort estimate"]}
        />
      </section>
    </div>
  )
}
