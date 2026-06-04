import { motion } from 'framer-motion'

import Section from '../layout/Section'
import MonoLabel from '../primitives/MonoLabel'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/** A small inline arrow glyph for external links. Decorative. */
function ExternalArrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3 w-3 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 11L11 5" />
      <path d="M6 5h5v5" />
    </svg>
  )
}

interface Sponsor {
  /** Brand name, rendered in mono. */
  name: string
  /** One–two line value statement. */
  blurb: string
  /** External destination. */
  href: string
  /** Visible (shortened) link label. */
  linkLabel: string
  /**
   * Brand accent classes. Written out in full so Tailwind's JIT can see
   * each literal — no runtime string assembly.
   */
  accentDot: string
  cardHover: string
  linkHover: string
}

/** The serverless AI infrastructure VisionOps is built on. */
const SPONSORS: readonly Sponsor[] = [
  {
    name: 'Phinite',
    blurb:
      'Agent orchestration + a full audit trail — the guardrail that stops agents fabricating financial disputes.',
    href: 'https://phinite.ai',
    linkLabel: 'phinite.ai',
    accentDot: 'text-phinite',
    cardHover: 'hover:border-phinite/60 hover:shadow-glow-phinite',
    linkHover: 'hover:text-phinite',
  },
  {
    name: 'GMI Cloud',
    blurb:
      "Serverless vision inference. 100+ open models, scale-to-zero — you pay only while it's seeing.",
    href: 'https://www.gmicloud.ai',
    linkLabel: 'gmicloud.ai',
    accentDot: 'text-gmi',
    cardHover: 'hover:border-gmi/60 hover:shadow-glow-gmi',
    linkHover: 'hover:text-gmi',
  },
  {
    name: 'Slack',
    blurb: 'Human-in-the-loop. The one place a person gets pulled in — and only when it matters.',
    href: 'https://slack.com',
    linkLabel: 'slack.com',
    accentDot: 'text-green',
    cardHover: 'hover:border-green/60 hover:shadow-glow-green',
    linkHover: 'hover:text-green',
  },
]

/**
 * Slide 08 — "Powered by": the three sponsors whose serverless primitives
 * VisionOps runs on, each as an accent-colored card with a one-line value
 * statement and an external link out. Entrance motion is gated on
 * `prefers-reduced-motion`.
 */
export default function PoweredBySection() {
  const reducedMotion = useReducedMotion()

  const rise = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px' },
      }

  return (
    <Section id="powered-by" ariaLabel="Powered by" className="bg-void relative">
      {/* Faint mission-control grid behind the content. Non-interactive. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-void bg-[length:44px_44px] opacity-[0.35]"
      />

      <div className="relative z-10">
        <motion.div {...rise} transition={{ duration: 0.5 }}>
          <MonoLabel className="tracking-[0.2em]">08 · POWERED BY</MonoLabel>
        </motion.div>

        <motion.h2
          className="mt-5 max-w-3xl text-section-title font-sans font-semibold text-ink"
          {...rise}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.08 }}
        >
          Built on serverless AI infrastructure.
        </motion.h2>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {SPONSORS.map((sponsor, i) => (
            <motion.div
              key={sponsor.name}
              className={
                'group flex flex-col rounded-lg border border-border bg-surface p-6 shadow-panel transition duration-300 ' +
                sponsor.cardHover
              }
              {...rise}
              transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.16 + i * 0.08 }}
            >
              <h3 className="flex items-center gap-2 font-mono text-lg text-ink">
                <span className={'text-sm ' + sponsor.accentDot} aria-hidden>
                  ▸
                </span>
                {sponsor.name}
              </h3>

              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-dim">{sponsor.blurb}</p>

              <a
                href={sponsor.href}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  'mt-5 inline-flex items-center gap-1.5 self-start font-mono text-xs uppercase tracking-widest text-ink-code transition-colors ' +
                  sponsor.linkHover
                }
              >
                {sponsor.linkLabel}
                <ExternalArrow />
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  )
}
