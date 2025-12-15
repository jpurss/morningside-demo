import * as React from "react"

import {
  ExecutiveDashboardContext,
  type ExecutiveDashboardContextValue,
} from "@/lib/executive-dashboard-context"
import {
  createDemoExecutiveDashboardState,
  EXEC_DASHBOARD_STORAGE_KEY,
  stageRank,
  type ExecutiveAssignee,
  type ExecutiveDashboardState,
  type ExecutiveItem,
  type ExecutiveStage,
} from "@/lib/executive-dashboard"

type Action =
  | { type: "reset_demo"; now: number }
  | { type: "upsert_item"; item: ExecutiveItem; now: number }
  | { type: "set_stage"; id: string; stage: ExecutiveStage; now: number; label: string }
  | {
      type: "log_comms"
      id: string
      now: number
      channel: "email" | "slack" | "call" | undefined
      label: string
    }
  | { type: "assign"; id: string; assigneeId: string | null; now: number; label: string }

function safeParseState(raw: string | null): ExecutiveDashboardState | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return null
    const obj = parsed as Record<string, unknown>
    if (!Array.isArray(obj.items) || !Array.isArray(obj.assignees)) return null
    return obj as ExecutiveDashboardState
  } catch {
    return null
  }
}

function mergeItem(existing: ExecutiveItem | undefined, incoming: ExecutiveItem, now: number): ExecutiveItem {
  if (!existing) return incoming

  const stage =
    stageRank(incoming.stage) > stageRank(existing.stage) ? incoming.stage : existing.stage

  const comms =
    existing.comms.status === "contacted"
      ? existing.comms
      : incoming.comms.status === "contacted"
        ? incoming.comms
        : existing.comms

  return {
    ...existing,
    ...incoming,
    updatedAt: now,
    stage,
    comms,
    activity: existing.activity,
  }
}

function mergeAssignees(existing: ExecutiveAssignee[], baseline: ExecutiveAssignee[]) {
  const seen = new Set(existing.map((assignee) => assignee.id))
  const merged = [...existing]
  for (const assignee of baseline) {
    if (seen.has(assignee.id)) continue
    merged.push(assignee)
  }
  return merged
}

function reducer(state: ExecutiveDashboardState, action: Action): ExecutiveDashboardState {
  switch (action.type) {
    case "reset_demo":
      return createDemoExecutiveDashboardState(action.now)
    case "upsert_item": {
      const items = [...state.items]
      const idx = items.findIndex((item) => item.id === action.item.id)
      if (idx === -1) {
        items.unshift(action.item)
      } else {
        items[idx] = mergeItem(items[idx], action.item, action.now)
      }
      return { ...state, items }
    }
    case "set_stage": {
      const items = state.items.map((item) => {
        if (item.id !== action.id) return item
        const updatedAt = action.now
        return {
          ...item,
          stage: action.stage,
          updatedAt,
          activity: [{ at: updatedAt, label: action.label }, ...item.activity].slice(0, 50),
        }
      })
      return { ...state, items }
    }
    case "log_comms": {
      const items = state.items.map((item) => {
        if (item.id !== action.id) return item
        const updatedAt = action.now
        return {
          ...item,
          updatedAt,
          comms: {
            status: "contacted" as const,
            lastContactedAt: updatedAt,
            channel: action.channel,
          },
          activity: [{ at: updatedAt, label: action.label }, ...item.activity].slice(0, 50),
        }
      })
      return { ...state, items }
    }
    case "assign": {
      const items = state.items.map((item) => {
        if (item.id !== action.id) return item
        const updatedAt = action.now
        return {
          ...item,
          updatedAt,
          assigneeId: action.assigneeId,
          activity: [{ at: updatedAt, label: action.label }, ...item.activity].slice(0, 50),
        }
      })
      return { ...state, items }
    }
    default:
      return state
  }
}

export function ExecutiveDashboardProvider(props: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, undefined, () => {
    const demo = createDemoExecutiveDashboardState(Date.now())
    if (typeof window === "undefined") return demo
    const parsed = safeParseState(window.localStorage.getItem(EXEC_DASHBOARD_STORAGE_KEY))
    if (!parsed) return demo
    return { ...parsed, assignees: mergeAssignees(parsed.assignees, demo.assignees) }
  })

  React.useEffect(() => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(EXEC_DASHBOARD_STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore persistence failures for demo mode
    }
  }, [state])

  const api = React.useMemo<ExecutiveDashboardContextValue>(() => {
    return {
      state,
      assignees: state.assignees,
      items: state.items,
      getItem: (id) => state.items.find((item) => item.id === id),
      upsertItem: (item) => dispatch({ type: "upsert_item", item, now: Date.now() }),
      setStage: (id, stage, activityLabel) =>
        dispatch({
          type: "set_stage",
          id,
          stage,
          now: Date.now(),
          label: activityLabel ?? `Stage → ${stage}`,
        }),
      logCommunication: (id, input) =>
        dispatch({
          type: "log_comms",
          id,
          now: Date.now(),
          channel: input?.channel,
          label: input?.activityLabel ?? "Client contacted",
        }),
      assign: (id, assigneeId, activityLabel) =>
        dispatch({
          type: "assign",
          id,
          assigneeId,
          now: Date.now(),
          label: activityLabel ?? (assigneeId ? "Assigned" : "Unassigned"),
        }),
      resetDemo: () => dispatch({ type: "reset_demo", now: Date.now() }),
    }
  }, [state])

  return (
    <ExecutiveDashboardContext.Provider value={api}>
      {props.children}
    </ExecutiveDashboardContext.Provider>
  )
}
