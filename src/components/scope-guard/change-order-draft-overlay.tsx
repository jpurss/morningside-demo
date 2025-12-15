import * as React from "react"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"
import { FileSignatureIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const STEPS = [
  "Extracting scope delta…",
  "Drafting addendum summary…",
  "Formatting for signature…",
] as const

export function ChangeOrderDraftOverlay(props: {
  open: boolean
  onCancel: () => void
  title?: string
}) {
  const [stepIndex, setStepIndex] = React.useState(0)

  React.useEffect(() => {
    if (!props.open) return
    setStepIndex(0)
    const interval = window.setInterval(() => {
      setStepIndex((prev) => (prev + 1) % STEPS.length)
    }, 1100)
    return () => window.clearInterval(interval)
  }, [props.open])

  if (!props.open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 supports-backdrop-filter:backdrop-blur-md" />
      <div className="relative mx-auto flex h-full max-w-xl items-center px-6">
        <div className="w-full rounded-2xl border border-border/70 bg-card/70 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start gap-4">
            <div className="grid h-11 w-11 place-items-center rounded-xl border border-primary/25 bg-primary/10">
              <FileSignatureIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-semibold tracking-tight text-white">
                {props.title ?? "Drafting change order pack…"}
              </div>
              <div className="mt-1 text-sm text-foreground/80">
                Turning the SOW + request into a 1‑page addendum ready for client approval.
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center">
            <div className="relative grid h-44 w-44 place-items-center">
              <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" />
              <DotLottieReact
                src="/assets/animation-loading.lottie"
                loop
                autoplay
                className="relative h-44 w-44"
              />
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {STEPS.map((step, idx) => (
              <div
                key={step}
                className={cn(
                  "rounded-lg border border-border/60 bg-background/15 px-4 py-2 text-sm text-foreground/75 transition-colors",
                  idx === stepIndex && "border-primary/30 bg-primary/10 text-white",
                )}
              >
                {step}
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <Button size="sm" variant="secondary" onClick={props.onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

