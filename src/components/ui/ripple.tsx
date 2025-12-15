import * as React from "react"

import { cn } from "@/lib/utils"

type RippleProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Base opacity for the innermost ring */
  mainCircleOpacity?: number
  /** Number of concentric rings */
  numCircles?: number
  /** Animation duration in seconds */
  duration?: number
  /** Spacing between rings in pixels */
  ringSpacing?: number
}

export function Ripple({
  mainCircleOpacity = 1,
  numCircles = 5,
  duration = 3,
  ringSpacing = 12,
  className,
  ...props
}: RippleProps) {
  const count = Math.max(1, Math.round(numCircles))

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-visible", className)}
      {...props}
    >
      {Array.from({ length: count }).map((_, idx) => {
        const offset = idx * ringSpacing
        const alpha = mainCircleOpacity * ((1-idx) / count+0.9)
        return (
          <div
            key={idx}
            className="animate-ripple absolute border border-primary/40"
            style={
              {
                inset: -offset,
                borderRadius: "inherit",
                opacity: alpha,
                "--opacity": alpha,
                "--duration": `${duration}s`,
                "--i": idx,
              } as React.CSSProperties
            }
          />
        )
      })}
    </div>
  )
}
