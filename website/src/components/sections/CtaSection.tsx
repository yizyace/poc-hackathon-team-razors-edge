import { motion } from 'framer-motion'

import Section from '../layout/Section'
import MonoLabel from '../primitives/MonoLabel'
import GlowDivider from '../primitives/GlowDivider'
import { useReducedMotion } from '../../hooks/useReducedMotion'

const REPO_URL = 'https://github.com/yizyace/poc-hackathon-team-razors-edge'
const SPEC_URL =
  'https://github.com/yizyace/poc-hackathon-team-razors-edge/blob/main/docs/visionops-baseline-specification.md'

/**
 * A small inline arrow glyph that nudges right on hover (when motion is
 * allowed). Decorative.
 */
function ExternalArrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
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

/**
 * Slide 10 — the closing CTA. The whole pitch compresses to one line
 * (11 seconds, three cents, fully autonomous), then sends the viewer to the
 * repo and the spec. This is the final slide, so it is centered and given
 * room to land. Entrance motion is gated on `prefers-reduced-motion`.
 */
export default function CtaSection() {
  const reducedMotion = useReducedMotion()

  const rise = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px' },
      }

  return (
    <Section id="cta" ariaLabel="Closing" className="bg-void relative">
      {/* Faint mission-control grid + warm wash to anchor the final beat. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-void bg-[length:44px_44px] opacity-[0.35]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-radial-amber" />

      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div {...rise} transition={{ duration: 0.5 }}>
          <MonoLabel className="tracking-[0.2em]">10 · THE TAKEAWAY</MonoLabel>
        </motion.div>

        <motion.h2
          className="mt-6 max-w-4xl text-display font-sans font-semibold tracking-tight text-ink"
          {...rise}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.08 }}
        >
          11 seconds. $0.03. You just watched it happen.
        </motion.h2>

        <motion.p
          className="mt-6 text-hero-sub text-ink-dim"
          {...rise}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.16 }}
        >
          Three agents. One photo. Fully autonomous.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          {...rise}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.24 }}
        >
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-sm border border-amber px-5 py-2.5 font-mono text-sm uppercase tracking-widest text-amber transition-colors hover:bg-amber-dim"
          >
            View on GitHub
            <ExternalArrow />
          </a>

          <a
            href={SPEC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-sm border border-border px-5 py-2.5 font-mono text-sm uppercase tracking-widest text-ink-dim transition-colors hover:text-ink"
          >
            Read the spec
            <ExternalArrow />
          </a>
        </motion.div>

        <motion.div
          className="mt-16 w-full max-w-md"
          {...rise}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.32 }}
        >
          <GlowDivider />
          <p className="mt-6 font-mono text-xs tracking-wide text-ink-dim">
            VisionOps · Razor&apos;s Edge · NY Tech Week 2026 · Phinite × GMI Cloud
          </p>
        </motion.div>
      </div>
    </Section>
  )
}
