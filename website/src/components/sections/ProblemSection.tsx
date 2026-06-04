import { motion } from 'framer-motion'

import Section from '../layout/Section'
import MonoLabel from '../primitives/MonoLabel'
import MetricCounter from '../primitives/MetricCounter'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { METRICS } from '../../data/scenarios'

/** The five manual steps a human runs for a single damaged box. */
const MANUAL_STEPS = [
  'Squint at the label for the tracking number',
  'Figure out which vendor actually shipped it',
  'Pull the matching contract / SLA',
  'File the damage dispute by hand',
  'Ping a teammate to confirm and close',
] as const

/**
 * Slide 01 — the cost of the status quo.
 *
 * Frames the pain in human terms (a wrecked box is half an hour of squinting,
 * cross-referencing, and filing) on the left, with a hard-numbers stat panel on
 * the right: ~27 minutes and ~$43 of labor for a single incident. Entrance
 * motion is gated on `prefers-reduced-motion`, falling back to the final state.
 */
export default function ProblemSection() {
  const reducedMotion = useReducedMotion()

  const rise = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px' },
      }

  return (
    <Section id="problem" ariaLabel="The problem" className="bg-void relative">
      {/* Faint mission-control grid behind the content. Non-interactive. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-void bg-[length:44px_44px] opacity-[0.35]"
      />

      <div className="relative z-10">
        <motion.div {...rise} transition={{ duration: 0.5 }}>
          <MonoLabel className="tracking-[0.2em]">01 · THE PROBLEM</MonoLabel>
        </motion.div>

        <motion.h2
          className="mt-5 max-w-3xl text-section-title font-sans font-semibold text-ink"
          {...rise}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.08 }}
        >
          A damaged box is a 27-minute problem.
        </motion.h2>

        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-14">
          {/* LEFT — the pain, in prose. */}
          <motion.div
            {...rise}
            transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.16 }}
          >
            <p className="text-lg leading-relaxed text-ink-dim">
              When a wrecked box lands on the dock of an e-commerce warehouse, a human has to stop
              and work the case. Squint at the battered label for the tracking number. Figure out
              which vendor actually shipped it. Pull the contract, file a dispute, and ping a
              teammate to confirm.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-ink-dim">
              That&apos;s roughly <span className="font-medium text-ink">half an hour</span> and about{' '}
              <span className="font-medium text-ink">$43 in labor</span> — for a{' '}
              <span className="text-ink">single</span> box. Across thousands of damaged shipments a
              day it compounds into billions lost, with claims quietly missed or aged past the
              carrier&apos;s deadline.
            </p>

            {/* The manual playbook, as a terminal-style ordered list. */}
            <ol className="mt-8 space-y-2.5">
              {MANUAL_STEPS.map((step, i) => (
                <li key={step} className="flex items-baseline gap-3">
                  <MonoLabel dim className="tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </MonoLabel>
                  <span className="font-mono text-sm leading-relaxed text-ink-code">{step}</span>
                </li>
              ))}
            </ol>
          </motion.div>

          {/* RIGHT — the hard numbers. */}
          <motion.div
            className="flex flex-col justify-center gap-4 rounded-xl border border-border bg-surface p-6 shadow-panel sm:p-8"
            {...rise}
            transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.24 }}
          >
            <MonoLabel dim className="uppercase tracking-[0.25em]">
              Cost of one incident
            </MonoLabel>

            <div className="grid gap-8 sm:grid-cols-2 sm:gap-6">
              <div>
                <MetricCounter
                  to={METRICS.manualMinutes}
                  suffix=" min"
                  className="text-5xl font-semibold text-amber sm:text-6xl"
                />
                <p className="mt-2 text-sm leading-snug text-ink-dim">per incident, by hand</p>
              </div>

              <div>
                <MetricCounter
                  to={METRICS.manualCostUsd}
                  prefix="$"
                  className="text-5xl font-semibold text-amber sm:text-6xl"
                />
                <p className="mt-2 text-sm leading-snug text-ink-dim">in labor, per box</p>
              </div>
            </div>

            <p className="mt-2 border-t border-border pt-5 text-sm leading-relaxed text-ink-dim">
              Multiply by the thousands of boxes that arrive damaged every day and the loss runs into
              the billions.
            </p>
          </motion.div>
        </div>
      </div>
    </Section>
  )
}
