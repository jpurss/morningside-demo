import * as React from "react"

import type {
  ExecutiveAssignee,
  ExecutiveDashboardState,
  ExecutiveItem,
  ExecutiveStage,
} from "@/lib/executive-dashboard"

export type ExecutiveDashboardContextValue = {
  state: ExecutiveDashboardState
  assignees: ExecutiveAssignee[]
  items: ExecutiveItem[]
  getItem: (id: string) => ExecutiveItem | undefined
  upsertItem: (item: ExecutiveItem) => void
  setStage: (id: string, stage: ExecutiveStage, activityLabel?: string) => void
  logCommunication: (
    id: string,
    input?: { channel?: "email" | "slack" | "call"; activityLabel?: string },
  ) => void
  assign: (id: string, assigneeId: string | null, activityLabel?: string) => void
  resetDemo: () => void
}

export const ExecutiveDashboardContext = React.createContext<ExecutiveDashboardContextValue | null>(null)

