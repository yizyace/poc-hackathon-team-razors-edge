import { motion } from 'framer-motion'

import Section from '../layout/Section'
import MonoLabel from '../primitives/MonoLabel'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/** The team behind VisionOps, from the repo roster. */
const MEMBERS = [
  { name: 'Ben', handle: 'BENJYI' },
  { name: 'James', handle: 'Cosmicstar0725' },
  { name: 'Richard', handle: 'rlin25' },
  { name: 'Sylesh', handle: 'Sylesh29' },
  { name: 'Andrew', handle: 'yizyace' },
] as const

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 012-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

/**
 * Slide 09 — "The team": who built VisionOps, and why "Razor's Edge" — precise
 * execution on thin margins. Member cards link to each builder's GitHub.
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

        <motion.ul
          className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
          {...rise}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.24 }}
        >
          {MEMBERS.map((m) => (
            <li key={m.handle}>
              <a
                href={`https://github.com/${m.handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col rounded border border-border bg-surface px-4 py-3 transition hover:border-gmi/60 hover:shadow-glow-gmi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gmi"
              >
                <span className="font-sans text-base font-semibold text-ink">{m.name}</span>
                <span className="mt-1.5 flex items-center gap-1.5 font-mono text-xs text-ink-dim transition-colors group-hover:text-gmi">
                  <GitHubMark className="h-3.5 w-3.5" />@{m.handle}
                </span>
              </a>
            </li>
          ))}
        </motion.ul>
      </div>
    </Section>
  )
}
