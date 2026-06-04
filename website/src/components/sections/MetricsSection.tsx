import { motion } from 'framer-motion'

import Section from '../layout/Section'
import MonoLabel from '../primitives/MonoLabel'
import MetricCounter from '../primitives/MetricCounter'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { METRICS } from '../../data/scenarios'

const SPEEDUP = Math.round((METRICS.manualMinutes * 60) / METRICS.visionopsSeconds)
const CHEAPER = Math.round(METRICS.manualCostUsd / METRICS.visionopsCostUsd)

const VIEWPORT = { once: true, margin: '-80px' } as const

/**
 * MetricsSection — the bold before/after ROI comparison. Two visceral columns
 * ("BY HAND" vs "WITH VISIONOPS") sized and tinted to be scannable in two
 * seconds, with computed delta multipliers below and an honest caveat at the
 * bottom. Respects `prefers-reduced-motion` by rendering the final state.
 */
export default function MetricsSection() {
  const reducedMotion = useReducedMotion()

  // With reduced motion, skip the reveal transform and render the final state.
  const reveal = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: VIEWPORT,
        transition: { duration: 0.5, ease: 'easeOut' as const },
      }

  return (
    <Section id="metrics" ariaLabel="The numbers" className="bg-void relative">
      <header className="mb-10 sm:mb-12">
        <MonoLabel>07 · THE NUMBERS</MonoLabel>
        <h2 className="mt-3 text-section-title text-ink">
          27 minutes <span className="text-ink-dim">&rarr;</span>{' '}
          <span className="text-green">11 seconds.</span>
        </h2>
        <p className="mt-3 max-w-xl text-ink-dim">
          The same freight claim, two ways. One built for a person with a clipboard&mdash;one built for a
          machine that sleeps when idle.
        </p>
      </header>

      <div className="relative grid items-stretch gap-6 md:grid-cols-2">
        {/* LEFT — BY HAND (muted, red/amber-tinted) */}
        <motion.div
          {...reveal}
          className="flex flex-col rounded-lg border border-red-dim/50 bg-surface/60 p-6 shadow-panel sm:p-8"
        >
          <MonoLabel dim>BY HAND</MonoLabel>
          <span className="mt-1 block font-mono text-[0.7rem] uppercase tracking-wider text-ink-dim">
            manual freight-claim processing
          </span>

          <div className="mt-6 space-y-6">
            <div>
              <MetricCounter
                to={METRICS.manualMinutes}
                suffix=" min"
                className="block text-5xl font-semibold text-amber sm:text-6xl"
              />
              <p className="mt-1 text-sm text-ink-dim">to process one claim</p>
            </div>
            <div>
              <MetricCounter
                to={METRICS.manualCostUsd}
                prefix="$"
                className="block text-5xl font-semibold text-amber sm:text-6xl"
              />
              <p className="mt-1 text-sm text-ink-dim">in labor, per box</p>
            </div>
          </div>
        </motion.div>

        {/* Center divider / arrow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-1/2 hidden -translate-x-1/2 items-center md:flex"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-void font-mono text-xl text-green shadow-glow-green">
            &rarr;
          </span>
        </div>

        {/* RIGHT — WITH VISIONOPS (green/gmi-tinted, glow) */}
        <motion.div
          {...(reducedMotion
            ? {}
            : { ...reveal, transition: { ...reveal.transition, delay: 0.1 } })}
          className="flex flex-col rounded-lg border border-green/50 bg-surface-2/60 p-6 shadow-glow-green sm:p-8"
        >
          <MonoLabel className="text-green">WITH VISIONOPS</MonoLabel>
          <span className="mt-1 block font-mono text-[0.7rem] uppercase tracking-wider text-ink-dim">
            autonomous, scale-to-zero
          </span>

          <div className="mt-6 space-y-6">
            <div>
              <MetricCounter
                to={METRICS.visionopsSeconds}
                suffix="s"
                className="block text-5xl font-semibold text-green sm:text-6xl"
              />
              <p className="mt-1 text-sm text-ink-dim">per incident</p>
            </div>
            <div>
              <MetricCounter
                to={METRICS.visionopsCostUsd}
                prefix="$"
                decimals={2}
                className="block text-5xl font-semibold text-green sm:text-6xl"
              />
              <p className="mt-1 text-sm text-ink-dim">in compute</p>
            </div>
            <div>
              <span className="block font-mono text-5xl font-semibold text-gmi sm:text-6xl">0</span>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-dim">
                GPUs idle
                <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-gmi">
                  scale-to-zero
                </span>
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Delta row — the punchline */}
      <motion.div
        {...(reducedMotion
          ? {}
          : { ...reveal, transition: { ...reveal.transition, delay: 0.2 } })}
        className="mt-6 grid gap-4 sm:grid-cols-2"
      >
        <div className="rounded-lg border border-border bg-surface/60 px-6 py-5 text-center">
          <span className="block font-mono text-4xl font-bold text-green sm:text-5xl">
            &asymp;{SPEEDUP}&times;
          </span>
          <span className="mt-1 block font-mono text-xs uppercase tracking-wider text-ink-dim">faster</span>
        </div>
        <div className="rounded-lg border border-border bg-surface/60 px-6 py-5 text-center">
          <span className="block font-mono text-4xl font-bold text-green sm:text-5xl">
            &asymp;{CHEAPER}&times;
          </span>
          <span className="mt-1 block font-mono text-xs uppercase tracking-wider text-ink-dim">cheaper</span>
        </div>
      </motion.div>

      <p className="mt-8 font-mono text-xs text-ink-dim">
        ERP is simulated &middot; labor cost is a published industry benchmark (CSCMP) &middot; the compute
        numbers are measured live.
      </p>
    </Section>
  )
}
