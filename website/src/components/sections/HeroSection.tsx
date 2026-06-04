import { motion } from 'framer-motion'

import Section from '../layout/Section'
import MonoLabel from '../primitives/MonoLabel'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import HeroMetrics from '../hero/HeroMetrics'
import TopologyGraph from '../hero/TopologyGraph'

/**
 * The opening slide of the deck: the VisionOps thesis in one screen.
 *
 * Layers a faint mission-control grid and an amber bloom behind a centered
 * column — eyebrow, headline, subhead, the three-agent topology graph, and the
 * headline ROI metrics — capped by a gentle "scroll" hint. All motion is gated
 * on `prefers-reduced-motion`, falling back to the final, static composition.
 */
export default function HeroSection() {
  const reducedMotion = useReducedMotion()

  // Shared entrance: a small upward fade, staggered down the column. Collapsed
  // to a no-op (final state) when the user prefers reduced motion.
  const rise = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px' },
      }

  return (
    <Section id="hero" ariaLabel="VisionOps overview" className="relative bg-void">
      {/* Nav brand ("VisionOps") links here via #top. */}
      <span id="top" aria-hidden className="absolute left-0 top-0" />

      {/* Decorative backdrop: grid texture + amber bloom. Non-interactive. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-void bg-[length:44px_44px] opacity-[0.5]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-radial-amber" />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Eyebrow + live indicator. */}
        <motion.div className="flex items-center gap-3" {...rise} transition={{ duration: 0.5 }}>
          <MonoLabel className="tracking-[0.2em]">VISIONOPS · RAZOR&apos;S EDGE</MonoLabel>
          <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-green">
            <span className="animate-blink" aria-hidden>
              ●
            </span>
            Live
          </span>
        </motion.div>

        {/* Headline. */}
        <motion.h1
          className="mt-6 text-display font-sans font-semibold tracking-tight text-ink"
          {...rise}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.08 }}
        >
          Three agents. One photo. Fully autonomous.
        </motion.h1>

        {/* Subhead. */}
        <motion.p
          className="mt-6 max-w-2xl text-hero-sub text-ink-dim"
          {...rise}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.16 }}
        >
          VisionOps turns a photo of a damaged shipment into a filed dispute — or a flagged human
          escalation — in about 11 seconds, for about 3 cents.
        </motion.p>

        {/* Centerpiece: the three-agent pipeline. */}
        <motion.div
          className="my-12 w-full max-w-3xl sm:my-14"
          {...rise}
          transition={{ duration: 0.7, delay: reducedMotion ? 0 : 0.24 }}
        >
          <TopologyGraph />
        </motion.div>

        {/* Headline ROI metrics. */}
        <motion.div
          className="w-full"
          {...rise}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.32 }}
        >
          <HeroMetrics />
        </motion.div>
      </div>

      {/* Scroll hint, anchored near the bottom of the slide. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center">
        <ScrollHint reducedMotion={reducedMotion} />
      </div>
    </Section>
  )
}

interface ScrollHintProps {
  reducedMotion: boolean
}

/** A mono "scroll" caption above a softly bobbing CSS-drawn chevron. */
function ScrollHint({ reducedMotion }: ScrollHintProps) {
  const chevron = (
    <svg width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden="true">
      <path d="M1 1 L8 8 L15 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  return (
    <div className="flex flex-col items-center gap-2 text-ink-dim">
      <MonoLabel dim className="text-[10px] uppercase tracking-[0.3em]">
        Scroll
      </MonoLabel>
      {reducedMotion ? (
        <span aria-hidden>{chevron}</span>
      ) : (
        <motion.span
          aria-hidden
          animate={{ y: [0, 5, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          {chevron}
        </motion.span>
      )}
    </div>
  )
}
