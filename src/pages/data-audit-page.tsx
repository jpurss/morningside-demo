import * as React from "react"

import { Button } from "@/components/ui/button"
import { DropZone } from "@/components/audit/drop-zone"
import { AnalyzingView } from "@/components/audit/analyzing-view"
import { ResultsDashboard } from "@/components/audit/results-dashboard"
import type { AuditResponse } from "@/lib/deal-shield-types"

type State =
  | { status: "idle" }
  | { status: "analyzing"; startedAt: number }
  | { status: "done"; report: AuditResponse }
  | { status: "error"; message: string }

export function DataAuditPage() {
  const [state, setState] = React.useState<State>({ status: "idle" })

  const analyze = React.useCallback(async (files: File[]) => {
    setState({ status: "analyzing", startedAt: Date.now() })

    const body = new FormData()
    for (const file of files) body.append("files", file)

    try {
      const res = await fetch("/api/audit", { method: "POST", body })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Request failed (${res.status})`)
      }
      const json = (await res.json()) as AuditResponse
      setState({ status: "done", report: json })
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }, [])

  if (state.status === "analyzing") return <AnalyzingView startedAt={state.startedAt} />

  return (
    <div className="space-y-6">
      {state.status === "idle" ? (
        <DropZone onFiles={analyze} />
      ) : state.status === "done" ? (
        <ResultsDashboard report={state.report} onReset={() => setState({ status: "idle" })} />
      ) : (
        <div className="rounded-xl border border-border/70 bg-card/60 p-8 backdrop-blur-xl">
          <div className="text-lg font-semibold text-white">Audit failed</div>
          <div className="mt-2 text-sm text-foreground/80">{state.message}</div>
          <Button className="mt-6" onClick={() => setState({ status: "idle" })}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  )
}

