import { useRef, useEffect } from "react"
import { useMotionValue, useSpring, type SpringOptions } from "motion/react"
import { cn } from "@/lib/utils"
import type { VerdictColor } from "@/lib/deal-shield-types"
import { CountingNumber } from "@/components/ui/shadcn-io/counting-number"

const colorToStroke: Record<VerdictColor, string> = {
  green: "#419C73",
  yellow: "#F2C94C",
  red: "#E5484D",
}

// Shared spring configuration for synchronized animations
const SPRING_CONFIG: SpringOptions = {
  stiffness: 90,
  damping: 50,
}

export function ScoreRing(props: { score: number; color: VerdictColor }) {
  const size = 220
  const stroke = 16
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r

  const circleRef = useRef<SVGCircleElement>(null)

  // Create motion value starting at 0, spring towards score
  const motionVal = useMotionValue(0)
  const springVal = useSpring(motionVal, SPRING_CONFIG)

  // Trigger animation on mount
  useEffect(() => {
    motionVal.set(props.score)
  }, [props.score, motionVal])

  // Subscribe to spring changes and update strokeDashoffset
  useEffect(() => {
    const unsubscribe = springVal.on("change", (latest) => {
      if (circleRef.current) {
        const pct = Math.max(0, Math.min(100, latest))
        const offset = circumference - (pct / 100) * circumference
        circleRef.current.style.strokeDashoffset = `${offset}`
      }
    })
    return () => unsubscribe()
  }, [springVal, circumference])

  const strokeColor = colorToStroke[props.color]

  return (
    <div className="relative grid place-items-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle (static) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(150,177,158,0.18)"
          strokeWidth={stroke}
          fill="none"
        />
        {/* Animated progress circle */}
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
        />
      </svg>
      <div className="absolute grid place-items-center text-center">
        <CountingNumber
          number={props.score}
          fromNumber={0}
          transition={SPRING_CONFIG}
          className={cn(
            "text-6xl font-semibold tracking-tight",
            props.color === "green"
              ? "text-white"
              : props.color === "yellow"
                ? "text-yellow-100"
                : "text-red-100",
          )}
        />
      </div>
    </div>
  )
}
