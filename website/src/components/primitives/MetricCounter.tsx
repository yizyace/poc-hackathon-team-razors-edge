import { useEffect, useRef, useState } from 'react'
import { animate, useInView, useMotionValue } from 'framer-motion'

import { useReducedMotion } from '../../hooks/useReducedMotion'

export interface MetricCounterProps {
  to: number
  from?: number
  durationMs?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}

function format(value: number, decimals: number, prefix: string, suffix: string): string {
  return prefix + value.toFixed(decimals) + suffix
}

/**
 * A monospace number that counts from `from` to `to` the first time it
 * scrolls into view. Honors `prefers-reduced-motion` by rendering the final
 * value immediately. Uses tabular numerals so the width stays stable while
 * the value animates.
 */
export default function MetricCounter({
  to,
  from = 0,
  durationMs = 1400,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: MetricCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reducedMotion = useReducedMotion()
  const motionValue = useMotionValue(from)
  const [display, setDisplay] = useState<string>(() => format(from, decimals, prefix, suffix))

  useEffect(() => {
    if (!inView) {
      return
    }

    if (reducedMotion) {
      setDisplay(format(to, decimals, prefix, suffix))
      return
    }

    const controls = animate(motionValue, to, {
      duration: durationMs / 1000,
      ease: 'easeOut',
      onUpdate: (latest) => {
        setDisplay(format(latest, decimals, prefix, suffix))
      },
    })

    return () => {
      controls.stop()
    }
  }, [inView, reducedMotion, to, from, durationMs, decimals, prefix, suffix, motionValue])

  return (
    <span ref={ref} className={'font-mono tabular-nums ' + (className ?? '')}>
      {display}
    </span>
  )
}
