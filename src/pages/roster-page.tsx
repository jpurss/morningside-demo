import * as React from "react"
import { type SpringOptions, useMotionValue, useSpring } from "motion/react"
import { useSearchParams } from "react-router-dom"

import { cn } from "@/lib/utils"
import type { ExecutiveAssignee } from "@/lib/executive-dashboard"
import { useExecutiveDashboard } from "@/lib/use-executive-dashboard"
import { capacityTier, getRosterProfile, type RosterProfile, utilization } from "@/lib/roster-capacity"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { JosiahProfileDialog } from "@/components/josiah-profile"

type RoleFilter = "all" | ExecutiveAssignee["role"]

const ROSTER_HOVER_SPRING: SpringOptions = {
  stiffness: 90,
  damping: 50,
}

function roleLabel(role: ExecutiveAssignee["role"]) {
  if (role === "consultant") return "Consultant"
  if (role === "pm") return "Project Manager"
  return "Engineer"
}

function initials(name: string) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/g)
    .filter(Boolean)

  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : parts[0]?.[1] ?? ""
  return `${first}${last}`.toUpperCase()
}

function capacityTag(pct: number) {
  const tier = capacityTier(pct)
  if (tier === "unknown") {
    return { label: "—", className: "border-border/60 bg-background/10 text-foreground/70" }
  }
  if (tier === "over") {
    return {
      label: "Over capacity",
      className: "border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/15",
    }
  }
  if (tier === "near") {
    return {
      label: "Near capacity",
      className: "border-yellow-400/25 bg-yellow-400/10 text-yellow-100",
    }
  }
  if (tier === "balanced") {
    return {
      label: "Balanced",
      className: "border-border/60 bg-background/10 text-foreground/80",
    }
  }
  return { label: "Available", className: "border-border/60 bg-background/10 text-foreground/70" }
}

type EmployeeEntry = {
  assignee: ExecutiveAssignee
  profile: RosterProfile
  pct: number
}

function parseRoleFilter(value: string | null): RoleFilter {
  if (value === "consultant" || value === "pm" || value === "engineering") return value
  return "all"
}

function summarize(entries: EmployeeEntry[]) {
  const headcount = entries.length
  const capacityHours = entries.reduce((sum, e) => sum + (e.profile.capacityHours || 0), 0)
  const bookedHours = entries.reduce((sum, e) => sum + (e.profile.bookedHours || 0), 0)
  const avgPct = capacityHours ? bookedHours / capacityHours : 0
  const nearCapacityCount = entries.filter((e) => e.pct >= 0.9 && e.pct < 1.05).length
  return { headcount, capacityHours, bookedHours, avgPct, nearCapacityCount }
}

function RoleSummaryCard(props: { label: string; summary: ReturnType<typeof summarize> }) {
  const pct = Math.max(0, Math.min(1, props.summary.avgPct || 0))

  return (
    <Card size="sm" className="bg-card/60 backdrop-blur-xl">
      <CardContent className="pt-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-white">{props.label}</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-white tabular-nums">
              {props.summary.headcount}
            </div>
            <div className="mt-1 text-xs text-foreground/70 tabular-nums">
              {Math.round((props.summary.avgPct || 0) * 100)}% avg · {props.summary.nearCapacityCount} near cap
            </div>
          </div>

          <div className="text-right text-xs text-foreground/70 tabular-nums">
            <div>
              {props.summary.bookedHours}h / {props.summary.capacityHours}h
            </div>
          </div>
        </div>

        <Progress value={Math.round(pct * 100)} className="mt-3" />
      </CardContent>
    </Card>
  )
}

function EmployeeRow(props: {
  entry: EmployeeEntry
  josiahHoverT: number
  onJosiahHoverChange: (hovered: boolean) => void
}) {
  const baseBookedHours = Math.max(0, Math.round(props.entry.profile.bookedHours || 0))
  const capacityHours = Math.max(0, Math.round(props.entry.profile.capacityHours || 0))

  const isJosiah = props.entry.assignee.id === "c-josiah"
  const isMaya = props.entry.assignee.id === "c-maya"
  const isJordan = props.entry.assignee.id === "c-jordan"

  const t = Math.max(0, Math.min(1, props.josiahHoverT || 0))
  const targetBookedHours = isJosiah
    ? capacityHours
    : isMaya || isJordan
      ? Math.min(capacityHours, baseBookedHours)
      : baseBookedHours
  const bookedHours = Math.round(baseBookedHours + (targetBookedHours - baseBookedHours) * t)

  const freeHours = capacityHours - bookedHours
  const displayPct = capacityHours ? bookedHours / capacityHours : 0
  const pctLabel = Math.round(displayPct * 100)
  const pctClamped = Math.max(0, Math.min(1, displayPct))

  const baseTag = capacityTag(props.entry.pct)
  const tag = isJosiah ? baseTag : capacityTag(displayPct)
  const isJosiahAvailable = isJosiah && baseTag.label === "Available"
  const isOverCapacity = tag.label === "Over capacity"

  const [overCapBeaconActive, setOverCapBeaconActive] = React.useState(false)
  const [overCapBeaconKey, setOverCapBeaconKey] = React.useState(0)
  const wasOverCapacity = React.useRef<boolean | null>(null)
  const beaconTimeoutId = React.useRef<number | null>(null)

  React.useEffect(() => {
    return () => {
      if (beaconTimeoutId.current === null) return
      window.clearTimeout(beaconTimeoutId.current)
      beaconTimeoutId.current = null
    }
  }, [])

  React.useEffect(() => {
    if (!isMaya && !isJordan) return

    if (wasOverCapacity.current === null) {
      wasOverCapacity.current = isOverCapacity
      return
    }

    if (!wasOverCapacity.current && isOverCapacity) {
      setOverCapBeaconKey((prev) => prev + 1)
      setOverCapBeaconActive(true)

      if (beaconTimeoutId.current !== null) {
        window.clearTimeout(beaconTimeoutId.current)
      }
      beaconTimeoutId.current = window.setTimeout(() => {
        setOverCapBeaconActive(false)
        beaconTimeoutId.current = null
      }, 3100)
    }

    wasOverCapacity.current = isOverCapacity
  }, [isMaya, isJordan, isOverCapacity])

  const avatarContent = isJosiah ? (
    <img
      src="/assets/josiah purss.jpeg"
      alt="Josiah Purss"
      className={cn(
        "h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-foreground/15 transition",
        "group-hover/josiah:ring-primary/55",
      )}
    />
  ) : (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold text-white ring-1 ring-foreground/15">
      {initials(props.entry.assignee.name)}
    </div>
  )

  return (
    <div
      onPointerEnter={isJosiah ? () => props.onJosiahHoverChange(true) : undefined}
      onPointerLeave={isJosiah ? () => props.onJosiahHoverChange(false) : undefined}
      className={cn(
        "px-4 py-4 first:pt-3 last:pb-3",
        isJosiah && "group/josiah relative",
      )}
    >
      {isJosiah ? (
        <>
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-1 rounded-xl",
              "bg-[radial-gradient(700px_circle_at_0%_0%,rgba(65,156,115,0.3),transparent_62%)] blur-md",
              "motion-reduce:animate-none animate-[pulse_4.5s_ease-in-out_infinite]",
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-2 rounded-xl ring-1 ring-primary/25 transition duration-300",
              "group-hover/josiah:ring-primary/55",
              "group-hover/josiah:shadow-[0_0_0_1px_rgba(65,156,115,0.12),0_24px_80px_-55px_rgba(65,156,115,0.65)]",
            )}
          />
        </>
      ) : null}

      <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {avatarContent}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate text-sm font-semibold text-white">
                {props.entry.assignee.name}
              </div>
              <Badge
                variant="outline"
                className="border-border/70 bg-background/10 text-foreground/80"
              >
                {roleLabel(props.entry.assignee.role)}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "border",
                  tag.className,
                  isJosiahAvailable && [
                    "relative border-primary/40 bg-primary/10 text-primary ring-1 ring-primary/20",
                    "shadow-[0_12px_50px_-42px_rgba(65,156,115,0.75)]",
                    "transition-colors",
                    "group-hover/josiah:border-primary/55 group-hover/josiah:bg-primary/15 group-hover/josiah:ring-primary/30",
                  ],
                  !isJosiahAvailable &&
                    isOverCapacity &&
                    (isMaya || isJordan) &&
                    overCapBeaconActive && [
                      "relative overflow-visible",
                      "shadow-[0_12px_50px_-46px_rgba(229,72,77,0.55)]",
                    ],
                )}
                title={isJosiahAvailable ? "Available for hire" : undefined}
              >
                {isJosiahAvailable ? (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute inset-0",
                        "bg-[radial-gradient(90px_circle_at_0%_50%,rgba(65,156,115,0.38),transparent_70%)]",
                        "opacity-60 motion-reduce:animate-none animate-[pulse_4.5s_ease-in-out_infinite]",
                      )}
                    />
                    <span className="relative inline-flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_0_6px_rgba(65,156,115,0.18)]",
                          "motion-reduce:animate-none animate-[pulse_4.5s_ease-in-out_infinite]",
                        )}
                      />
                      {tag.label}
                    </span>
                  </>
                ) : isOverCapacity && (isMaya || isJordan) && overCapBeaconActive ? (
                  <>
                    <span className="pointer-events-none absolute inset-0" aria-hidden="true">
                      <span
                        key={overCapBeaconKey}
                        className="absolute -inset-1 rounded-4xl ring-1 ring-destructive/100 motion-reduce:animate-none animate-[ping_0.95s_ease-out_3_forwards]"
                        onAnimationEnd={() => setOverCapBeaconActive(false)}
                      />
                    </span>
                    <span className="relative">{tag.label}</span>
                  </>
                ) : (
                  tag.label
                )}
              </Badge>
              {isJosiah && (
                <JosiahProfileDialog>
                  <Button
                    variant="link"
                    size="xs"
                    className="h-5 px-0 text-xs text-primary"
                  >
                    View profile
                  </Button>
                </JosiahProfileDialog>
              )}
            </div>
            <div className="mt-0.5 truncate text-xs text-foreground/70">
              {props.entry.profile.title} · {props.entry.profile.focus}
            </div>
          </div>
        </div>

        <div className="md:w-[460px]">
          <div className="flex flex-wrap gap-1.5 md:justify-end">
            {props.entry.profile.expertise.slice(0, 4).map((skill) => (
              <Badge key={skill} variant="secondary" className="bg-muted/50 text-foreground/80">
                {skill}
              </Badge>
            ))}
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-foreground/70 tabular-nums">
              <span>
                {bookedHours}h / {capacityHours}h
              </span>
              <span className="text-foreground/80">{pctLabel}%</span>
            </div>
            <Progress value={Math.round(pctClamped * 100)} className="mt-2" />
            <div className="mt-2 text-xs text-foreground/70 tabular-nums">
              {freeHours >= 0 ? `${freeHours}h free` : `${Math.abs(freeHours)}h over`}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RoleGroup(props: {
  title: string
  entries: EmployeeEntry[]
  josiahHoverT: number
  onJosiahHoverChange: (hovered: boolean) => void
}) {
  if (!props.entries.length) return null

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">{props.title}</h2>
        <div className="text-xs text-foreground/70 tabular-nums">{props.entries.length} people</div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-border/70 bg-background/10">
        <div className="divide-y divide-border/70">
          {props.entries.map((entry) => (
            <EmployeeRow
              key={entry.assignee.id}
              entry={entry}
              josiahHoverT={props.josiahHoverT}
              onJosiahHoverChange={props.onJosiahHoverChange}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export function RosterPage() {
  const dashboard = useExecutiveDashboard()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = React.useState("")
  const urlRole = parseRoleFilter(searchParams.get("role"))
  const [role, setRole] = React.useState<RoleFilter>(urlRole)
  const [josiahHoverT, setJosiahHoverT] = React.useState(0)

  const onRoleChange = React.useCallback(
    (value: string) => {
      const next = parseRoleFilter(value)
      setRole(next)
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          if (next === "all") params.delete("role")
          else params.set("role", next)
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const hoverMotion = useMotionValue(0)
  const hoverSpring = useSpring(hoverMotion, ROSTER_HOVER_SPRING)

  React.useEffect(() => {
    setRole(urlRole)
  }, [urlRole])

  React.useEffect(() => {
    const unsubscribe = hoverSpring.on("change", (latest) => {
      setJosiahHoverT(Number.isFinite(latest) ? latest : 0)
    })
    return () => unsubscribe()
  }, [hoverSpring])

  const onJosiahHoverChange = React.useCallback(
    (hovered: boolean) => {
      hoverMotion.set(hovered ? 1 : 0)
    },
    [hoverMotion],
  )

  const entries = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = dashboard.assignees.map((assignee) => {
      const profile = getRosterProfile(assignee)
      return { assignee, profile, pct: utilization(profile) } satisfies EmployeeEntry
    })

    const filtered = list.filter((entry) => {
      if (role !== "all" && entry.assignee.role !== role) return false
      if (!q) return true

      const haystack = [
        entry.assignee.name,
        entry.profile.title,
        entry.profile.focus,
        entry.profile.expertise.join(" "),
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(q)
    })

    return filtered.sort((a, b) => {
      const roleRank = (r: ExecutiveAssignee["role"]) =>
        r === "consultant" ? 0 : r === "pm" ? 1 : 2
      const byRole = roleRank(a.assignee.role) - roleRank(b.assignee.role)
      if (byRole !== 0) return byRole
      if (Math.abs(b.pct - a.pct) >= 0.01) return b.pct - a.pct
      return a.assignee.name.localeCompare(b.assignee.name)
    })
  }, [dashboard.assignees, query, role])

  const grouped = React.useMemo(() => {
    const groups: Record<ExecutiveAssignee["role"], EmployeeEntry[]> = {
      consultant: [],
      pm: [],
      engineering: [],
    }
    for (const entry of entries) groups[entry.assignee.role].push(entry)
    return groups
  }, [entries])

  const consultantSummary = React.useMemo(() => summarize(grouped.consultant), [grouped.consultant])
  const pmSummary = React.useMemo(() => summarize(grouped.pm), [grouped.pm])
  const engineeringSummary = React.useMemo(() => summarize(grouped.engineering), [grouped.engineering])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary">Roster</h1>
          <p className="mt-1 text-sm text-foreground/80">
            Capacity and expertise across consulting, project management, and engineering.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={dashboard.resetDemo}>
            Reset demo data
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <RoleSummaryCard label="Consultants" summary={consultantSummary} />
        <RoleSummaryCard label="Project Management" summary={pmSummary} />
        <RoleSummaryCard label="Engineering" summary={engineeringSummary} />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-sm">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or skill…"
            aria-label="Search team roster"
          />
        </div>

        <Tabs value={role} onValueChange={onRoleChange}>
          <TabsList variant="line" className="w-full justify-start md:w-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="consultant">Consultants</TabsTrigger>
            <TabsTrigger value="pm">PMs</TabsTrigger>
            <TabsTrigger value="engineering">Engineers</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="bg-card/60 backdrop-blur-xl">
        <CardHeader className="border-b border-border/70">
          <CardTitle className="text-white">Team Roster</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {entries.length === 0 ? (
            <div className="rounded-xl border border-border/70 bg-background/10 p-6 text-sm text-foreground/80">
              No matches. Try a different search or clear filters.
            </div>
          ) : (
            <div className="space-y-7">
              <RoleGroup
                title="Consultants"
                entries={grouped.consultant}
                josiahHoverT={josiahHoverT}
                onJosiahHoverChange={onJosiahHoverChange}
              />
              <RoleGroup
                title="Project Management"
                entries={grouped.pm}
                josiahHoverT={josiahHoverT}
                onJosiahHoverChange={onJosiahHoverChange}
              />
              <RoleGroup
                title="Engineering"
                entries={grouped.engineering}
                josiahHoverT={josiahHoverT}
                onJosiahHoverChange={onJosiahHoverChange}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
