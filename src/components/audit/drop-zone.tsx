import * as React from "react"
import { Loader2Icon, UploadCloudIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type DemoPreset = "messy" | "clean" | "sparse"

const DEMO_PRESETS: Record<
  DemoPreset,
  { label: string; hint: string; files: Array<{ path: string; name: string; type: string }> }
> = {
  messy: {
    label: "Messy demo",
    hint: "Preselected • shows common real-world issues",
    files: [
      {
        path: "/demo/messy_supply_chain.pdf",
        name: "messy_supply_chain.pdf",
        type: "application/pdf",
      },
    ],
  },
  clean: {
    label: "Clean demo",
    hint: "A well-structured CSV sample",
    files: [{ path: "/demo/good_leads.csv", name: "good_leads.csv", type: "text/csv" }],
  },
  sparse: {
    label: "Sparse demo",
    hint: "Low context density — triggers consultation",
    files: [
      {
        path: "/demo/sparse_inventory.txt",
        name: "sparse_inventory.txt",
        type: "text/plain",
      },
    ],
  },
}

async function loadDemoFiles(preset: DemoPreset): Promise<File[]> {
  const targets = DEMO_PRESETS[preset].files
  const files: File[] = []

  for (const target of targets) {
    const res = await fetch(target.path)
    if (!res.ok) throw new Error(`Failed to load demo asset (${res.status}).`)
    const blob = await res.blob()
    files.push(new File([blob], target.name, { type: target.type }))
  }

  return files
}

export function DropZone(props: { onFiles: (files: File[]) => void }) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  const accept = ".csv,.pdf,.txt"

  const [demoPreset, setDemoPreset] = React.useState<DemoPreset>("messy")
  const [demoState, setDemoState] = React.useState<
    | { status: "loading" }
    | { status: "ready"; files: File[] }
    | { status: "error"; message: string }
  >({ status: "loading" })

  React.useEffect(() => {
    let cancelled = false
    setDemoState({ status: "loading" })
    loadDemoFiles(demoPreset)
      .then((files) => {
        if (cancelled) return
        setDemoState({ status: "ready", files })
      })
      .catch((error) => {
        if (cancelled) return
        setDemoState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        })
      })

    return () => {
      cancelled = true
    }
  }, [demoPreset])

  return (
    <div className="rounded-2xl border border-border/70 bg-card/50 p-10 backdrop-blur-xl">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          const files = Array.from(e.dataTransfer.files ?? []).filter((f) =>
            f.name.toLowerCase().match(/\.(csv|pdf|txt)$/),
          )
          if (files.length) props.onFiles(files)
        }}
        className={cn(
          "group relative flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed px-8 pb-6 text-center",
          "border-primary/45 bg-background/20",
          isDragging && "border-primary/90 bg-primary/10",
        )}
      >
        <UploadCloudIcon className="h-14 w-14 text-primary drop-shadow-[0_0_18px_rgba(65,156,115,0.25)]" />
        <h1 className="mt-6 text-balance text-3xl font-extrabold tracking-tight text-primary">
          Drop Client Assets Here to Test AI Readiness (CSV, PDF, TXT).
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-foreground/80">
          Automate technical due diligence for{" "}
          <span className="text-primary">data quality</span>, structure, and{" "}
          <span className="text-primary">AI suitability</span> before the SOW is
          signed.
        </p>

        <div className="mt-6 w-full max-w-2xl rounded-xl border border-border/70 bg-background/15 p-4 text-left">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Try demo data</div>
              <div className="mt-1 text-xs text-foreground/70">
                {DEMO_PRESETS[demoPreset].hint}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "border-border/70 bg-background/30 text-foreground/80",
                  demoPreset === "messy" && "border-yellow-400/30 text-yellow-300",
                  demoPreset === "clean" && "border-primary/25 text-primary",
                  demoPreset === "sparse" && "border-purple-400/30 text-purple-300",
                )}
              >
                {demoPreset === "messy"
                  ? "Messy (demo)"
                  : demoPreset === "clean"
                    ? "Clean (demo)"
                    : "Sparse (demo)"}
              </Badge>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={demoPreset === "messy" ? "secondary" : "outline"}
                onClick={() => setDemoPreset("messy")}
              >
                Messy
              </Button>
              <Button
                size="sm"
                variant={demoPreset === "clean" ? "secondary" : "outline"}
                onClick={() => setDemoPreset("clean")}
              >
                Clean
              </Button>
              <Button
                size="sm"
                variant={demoPreset === "sparse" ? "secondary" : "outline"}
                onClick={() => setDemoPreset("sparse")}
              >
                Sparse
              </Button>
              <div className="text-xs text-foreground/60">
                Uses Morningside demo assets.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={demoState.status === "loading"}
                onClick={async () => {
                  if (demoState.status === "ready") {
                    props.onFiles(demoState.files)
                    return
                  }
                  setDemoState({ status: "loading" })
                  try {
                    const files = await loadDemoFiles(demoPreset)
                    setDemoState({ status: "ready", files })
                    props.onFiles(files)
                  } catch (error) {
                    setDemoState({
                      status: "error",
                      message: error instanceof Error ? error.message : String(error),
                    })
                  }
                }}
              >
                {demoState.status === "loading" ? (
                  <>
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  "Run Demo Audit"
                )}
              </Button>
            </div>
          </div>

          {demoState.status === "error" ? (
            <div className="mt-3 text-xs text-red-300">
              Demo failed to load: {demoState.message}
            </div>
          ) : demoState.status === "ready" ? (
            <div className="mt-3 text-xs text-foreground/70">
              Demo file ready:{" "}
              <span className="text-foreground/85">
                {demoState.files.map((f) => f.name).join(", ")}
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              if (files.length) props.onFiles(files)
            }}
          />
          <Button
            onClick={() => inputRef.current?.click()}
            className="shadow-[0_0_24px_rgba(65,156,115,0.18)]"
          >
            Or Browse Files
          </Button>
          <div className="text-xs text-foreground/70">Supported: {accept}</div>
        </div>

        <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 ring-1 ring-primary/30 transition-opacity group-hover:opacity-100" />
      </div>
    </div>
  )
}
