import { motion } from 'framer-motion'

import Section from '../layout/Section'
import MonoLabel from '../primitives/MonoLabel'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/** Accent color theming for one agent card. */
interface AgentAccent {
  /** Left-border accent color class. */
  accentBorder: string
  /** Role chip text + background tint. */
  chip: string
  /** Hover glow shadow. */
  glow: string
}

interface AgentCard {
  /** Stable key + ordinal tag, e.g. "A1". */
  tag: string
  name: string
  role: string
  description: string
  tech: string
  accent: AgentAccent
}

const AGENTS: AgentCard[] = [
  {
    tag: 'A1',
    name: 'Vision Inspector',
    role: 'The Eyes',
    description:
      'Looks at the photo, rates the damage, and reads the tracking number off the label — then hands back clean, structured data instead of chatty text.',
    tech: 'GMI Cloud · vision model',
    accent: {
      accentBorder: 'border-l-gmi',
      chip: 'text-gmi bg-gmi/10 border-gmi/40',
      glow: 'hover:shadow-glow-gmi hover:border-gmi/40',
    },
  },
  {
    tag: 'A2',
    name: 'Audit Core',
    role: 'The Memory',
    description:
      "Takes the tracking number and looks it up in the purchase-order records: who shipped it, what the contract promises — and crucially, whether there's a match at all.",
    tech: 'Phinite · mock ERP',
    accent: {
      accentBorder: 'border-l-phinite',
      chip: 'text-phinite bg-phinite/10 border-phinite/40',
      glow: 'hover:shadow-glow-phinite hover:border-phinite/40',
    },
  },
  {
    tag: 'A3',
    name: 'Dispute Coordinator',
    role: 'The Decision',
    description:
      'Weighs damage against the match and chooses: file the claim silently, or escalate to a human via Slack. Either way it logs every step.',
    tech: 'Phinite · Slack',
    accent: {
      accentBorder: 'border-l-amber',
      chip: 'text-amber bg-amber-dim border-amber/40',
      glow: 'hover:shadow-glow-amber hover:border-amber/40',
    },
  },
]

/**
 * Slide 02 — the cast of three.
 *
 * Reframes the pipeline as three independent workers, each owning exactly one
 * decision and handing off to the next. Rendered as a responsive three-card
 * grid, each card accented in its agent's brand color with a matching hover
 * glow. Cards stagger in on scroll; motion collapses to the final state under
 * `prefers-reduced-motion`.
 */
export default function AgentsSection() {
  const reducedMotion = useReducedMotion()

  const rise = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px' },
      }

  return (
    <Section id="agents" ariaLabel="The three agents" className="bg-void relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-void bg-[length:44px_44px] opacity-[0.35]"
      />

      <div className="relative z-10">
        <motion.div {...rise} transition={{ duration: 0.5 }}>
          <MonoLabel className="tracking-[0.2em]">02 · THE SYSTEM</MonoLabel>
        </motion.div>

        <motion.h2
          className="mt-5 max-w-3xl text-section-title font-sans font-semibold text-ink"
          {...rise}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.08 }}
        >
          Three agents. One decision each.
        </motion.h2>

        <motion.p
          className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-dim"
          {...rise}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.16 }}
        >
          Not three functions in a script — three workers that each make a call and hand off.
        </motion.p>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {AGENTS.map((agent, i) => (
            <motion.article
              key={agent.tag}
              className={
                'group flex flex-col rounded-lg border border-l-2 border-border bg-surface p-5 transition-shadow duration-300 ' +
                agent.accent.accentBorder +
                ' ' +
                agent.accent.glow
              }
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.12 + i * 0.12 }}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-mono text-lg text-ink">{agent.name}</h3>
                <MonoLabel dim className="tabular-nums">
                  {agent.tag}
                </MonoLabel>
              </div>

              <span
                className={
                  'mt-3 inline-flex w-fit items-center rounded-sm border px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest ' +
                  agent.accent.chip
                }
              >
                {agent.role}
              </span>

              <p className="mt-4 flex-1 text-sm leading-relaxed text-ink-dim">{agent.description}</p>

              <div className="mt-5 border-t border-border pt-3">
                <MonoLabel dim className="uppercase tracking-wider">
                  {agent.tech}
                </MonoLabel>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </Section>
  )
}
