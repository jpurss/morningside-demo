import * as React from "react"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type ToastTone = "success" | "info" | "warning" | "error"

type ToastInput = {
  title: string
  description?: string
  tone?: ToastTone
  durationMs?: number
}

type Toast = {
  id: string
  title: string
  description?: string
  tone: ToastTone
  createdAt: number
}

type ToastContextValue = {
  toast: (input: ToastInput) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

function toneClasses(tone: ToastTone) {
  if (tone === "success") return "border-primary/25 bg-primary/10"
  if (tone === "warning") return "border-yellow-400/25 bg-yellow-400/10"
  if (tone === "error") return "border-red-400/25 bg-red-400/10"
  return "border-border/70 bg-card/60"
}

export function ToastProvider(props: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const timeoutsRef = React.useRef<Map<string, number>>(new Map())

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timeout = timeoutsRef.current.get(id)
    if (timeout) window.clearTimeout(timeout)
    timeoutsRef.current.delete(id)
  }, [])

  const toast = React.useCallback(
    (input: ToastInput) => {
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())
      const createdAt = Date.now()
      const tone = input.tone ?? "info"
      const durationMs = input.durationMs ?? 3500

      const next: Toast = {
        id,
        title: input.title,
        description: input.description,
        tone,
        createdAt,
      }

      setToasts((prev) => [...prev, next].slice(-5))
      const timeout = window.setTimeout(() => dismiss(id), durationMs)
      timeoutsRef.current.set(id, timeout)
    },
    [dismiss],
  )

  React.useEffect(() => {
    const timeouts = timeoutsRef.current
    return () => {
      for (const timeout of timeouts.values()) {
        window.clearTimeout(timeout)
      }
      timeouts.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {props.children}
      <div className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-2",
              "w-full max-w-md overflow-hidden rounded-xl border p-4 shadow-lg backdrop-blur-xl",
              toneClasses(t.tone),
            )}
            data-state="open"
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white">{t.title}</div>
                {t.description ? (
                  <div className="mt-1 text-sm text-foreground/80">{t.description}</div>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-foreground/70 hover:text-white"
                onClick={() => dismiss(t.id)}
              >
                <XIcon className="h-4 w-4" />
                <span className="sr-only">Dismiss</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within <ToastProvider />")
  return ctx
}
