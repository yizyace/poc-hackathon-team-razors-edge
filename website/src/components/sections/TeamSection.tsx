import { motion } from 'framer-motion'

import Section from '../layout/Section'
import MonoLabel from '../primitives/MonoLabel'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/**
 * The five roles on the team. Names are intentionally left as a dim
 * em-dash placeholder to be filled in before the final cut.
 */
const ROLES = [
  'Agent Architect',
  'Inference',
  'Integration',
  'Backend',
  'Pitch / PM',
] as const

/**
 * Slide 09 — "The team": who built VisionOps, and why "Razor's Edge" — precise
 * execution on thin margins. Five role chips with placeholder names, ready to
 * fill in. Entrance motion is gated on `prefers-reduced-motion`.
 */
export default function TeamSection() {
  const reducedMotion = useReducedMotion()

  const rise = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px' },
      }

  return (
    <Section id="team" ariaLabel="The team" className="bg-void relative">
      {/* Faint mission-control grid behind the content. Non-interactive. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-void bg-[length:44px_44px] opacity-[0.35]"
      />

      <div className="relative z-10">
        <motion.div {...rise} transition={{ duration: 0.5 }}>
          <MonoLabel className="tracking-[0.2em]">09 · THE TEAM</MonoLabel>
        </motion.div>

        <motion.h2
          className="mt-5 text-section-title font-sans font-semibold text-ink"
          {...rise}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.08 }}
        >
          Razor&apos;s Edge.
        </motion.h2>

        <motion.p
          className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-dim"
          {...rise}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.16 }}
        >
          Built at NY Tech Week&apos;s{' '}
          <span className="text-ink">&ldquo;AI Agents: From Prototype to Production&rdquo;</span>{' '}
          hackathon, sponsored by Phinite&nbsp;&times;&nbsp;GMI&nbsp;Cloud. The name is the thesis:
          autonomous systems that handle money have no slack — value lives in{' '}
          <span className="text-ink">precise execution on thin margins</span>, the razor&apos;s edge
          between a clean automated file and an expensive mistake.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-wrap gap-3"
          {...rise}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.24 }}
        >
          {ROLES.map((role) => (
            <div
              key={role}
              className="flex flex-col rounded border border-border bg-surface px-4 py-3"
            >
              <MonoLabel dim className="uppercase tracking-[0.18em]">
                {role}
              </MonoLabel>
              <span className="mt-1 font-mono text-base text-ink-dim" aria-label="name to be confirmed">
                &mdash;
              </span>
            </div>
          ))}
        </motion.div>

        <motion.p
          className="mt-4 font-mono text-xs text-ink-dim"
          {...rise}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.32 }}
        >
          Names to be confirmed — placeholders, one per role.
        </motion.p>
      </div>
    </Section>
  )
}
