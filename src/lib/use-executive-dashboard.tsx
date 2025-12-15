import * as React from "react"

import { ExecutiveDashboardContext } from "@/lib/executive-dashboard-context"

export function useExecutiveDashboard() {
  const ctx = React.useContext(ExecutiveDashboardContext)
  if (!ctx) {
    throw new Error("useExecutiveDashboard must be used within <ExecutiveDashboardProvider />")
  }
  return ctx
}

