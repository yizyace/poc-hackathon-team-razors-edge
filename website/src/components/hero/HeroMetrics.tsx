import type { ReactNode } from 'react'

import MetricCounter from '../primitives/MetricCounter'
import { METRICS } from '../../data/scenarios'

export interface HeroMetricsProps {
  className?: string
}

interface StatProps {
  value: ReactNode
  label: string
}

/** One headline stat: a large mono number above an uppercase mono caption. */
function Stat({ value, label }: StatProps) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div className="font-mono text-4xl font-semibold tabular-nums sm:text-5xl">{value}</div>
      <div className="font-mono text-[11px] uppercase tracking-wider text-ink-dim">{label}</div>
    </div>
  )
}

/**
 * The hero's three headline ROI stats: time-per-incident, compute cost, and
 * the scale-to-zero idle cost. Numbers count up in view; the third is a static
 * "$0" to underline that idle GPUs cost nothing.
 */
export default function HeroMetrics({ className }: HeroMetricsProps) {
  return (
    <div
      className={
        'flex flex-wrap items-start justify-center gap-x-12 gap-y-8 sm:gap-x-16' +
        (className ? ' ' + className : '')
      }
    >
      <Stat
        value={<MetricCounter to={METRICS.visionopsSeconds} suffix="s" className="text-amber" />}
        label="per incident"
      />
      <Stat
        value={<MetricCounter to={METRICS.visionopsCostUsd} prefix="$" decimals={2} className="text-gmi" />}
        label="compute cost"
      />
      <Stat value={<span className="text-gmi">$0</span>} label="GPUs running when idle" />
    </div>
  )
}
