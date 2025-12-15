import type { ExecutiveAssignee } from "@/lib/executive-dashboard"

export type RosterProfile = {
  title: string
  focus: string
  expertise: string[]
  bookedHours: number
  capacityHours: number
}

export const DEMO_ROSTER_PROFILES: Record<string, RosterProfile> = {
  "c-maya": {
    title: "Principal Consultant",
    focus: "Change orders & client comms",
    expertise: ["Scope negotiation", "Data cleaning", "Stakeholder comms", "Pricing"],
    bookedHours: 45,
    capacityHours: 40,
  },
  "c-jordan": {
    title: "Senior Consultant",
    focus: "Data normalization & QA",
    expertise: ["Data audits", "SQL cleanup", "Schema mapping", "Client handoff"],
    bookedHours: 42,
    capacityHours: 40,
  },
  "c-josiah": {
    title: "Forward Deployed Engineer",
    focus: "Rapid prototyping & technical sales",
    expertise: ["Vibe Coding", "Strategic Sales", "AI Workflows", "Client Discovery"],
    bookedHours: 0,
    capacityHours: 40,
  },
  "pm-oliver": {
    title: "Senior PM",
    focus: "Delivery & risk management",
    expertise: ["SOWs", "Backlog grooming", "Client updates", "UAT coordination"],
    bookedHours: 28,
    capacityHours: 35,
  },
  "pm-sofia": {
    title: "Project Manager",
    focus: "Execution & dependencies",
    expertise: ["Sprint planning", "Roadmaps", "Release notes", "QA coordination"],
    bookedHours: 22,
    capacityHours: 35,
  },
  "em-emma": {
    title: "Staff Engineer",
    focus: "Platform & integrations",
    expertise: ["TypeScript", "Auth", "API design", "Integrations"],
    bookedHours: 30,
    capacityHours: 40,
  },
  "em-noah": {
    title: "Backend Engineer",
    focus: "Pipelines & observability",
    expertise: ["Postgres", "Python services", "ETL", "Observability"],
    bookedHours: 26,
    capacityHours: 40,
  },
  "em-priya": {
    title: "Frontend Engineer",
    focus: "UI foundations",
    expertise: ["React", "Design systems", "Accessibility", "Performance"],
    bookedHours: 20,
    capacityHours: 40,
  },
}

function getDefaultProfile(role: ExecutiveAssignee["role"]): RosterProfile {
  if (role === "pm") {
    return {
      title: "Project Manager",
      focus: "Delivery planning",
      expertise: [],
      bookedHours: 0,
      capacityHours: 35,
    }
  }
  if (role === "engineering") {
    return { title: "Engineer", focus: "Client work", expertise: [], bookedHours: 0, capacityHours: 40 }
  }
  return { title: "Consultant", focus: "Client work", expertise: [], bookedHours: 0, capacityHours: 40 }
}

export function getRosterProfile(assignee: ExecutiveAssignee): RosterProfile {
  return DEMO_ROSTER_PROFILES[assignee.id] ?? getDefaultProfile(assignee.role)
}

export function utilization(profile: RosterProfile) {
  const capacity = Math.max(0, profile.capacityHours || 0)
  if (!capacity) return 0
  return Math.max(0, profile.bookedHours || 0) / capacity
}

export type CapacityTier = "over" | "near" | "balanced" | "available" | "unknown"

export function capacityTier(pct: number): CapacityTier {
  if (!Number.isFinite(pct)) return "unknown"
  if (pct >= 1.05) return "over"
  if (pct >= 0.9) return "near"
  if (pct >= 0.6) return "balanced"
  return "available"
}

