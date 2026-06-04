import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

import Section from '../layout/Section'
import MonoLabel from '../primitives/MonoLabel'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/** One node in the static flow diagram. */
interface FlowNode {
  tag: string
  name: string
  /** Accent color class for the node's left/top border. */
  accent: string
  /** Step caption shown beneath the diagram. */
  caption: string
}

const FLOW: FlowNode[] = [
  {
    tag: 'IN',
    name: 'Photo',
    accent: 'border-l-ink-dim',
    caption: 'A photo of the damaged package enters the pipeline.',
  },
  {
    tag: 'A1',
    name: 'Vision Inspector',
    accent: 'border-l-gmi',
    caption: 'Rates the damage and reads the tracking number into structured data.',
  },
  {
    tag: 'A2',
    name: 'Audit Core',
    accent: 'border-l-phinite',
    caption: 'Looks up the vendor and contract — and whether there is a match at all.',
  },
  {
    tag: 'A3',
    name: 'Dispute Coordinator',
    accent: 'border-l-amber',
    caption: 'Weighs damage against the match and decides the route.',
  },
]

/** A small right-pointing chevron used between nodes on wide layouts. */
function ChevronRight() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true" className="shrink-0 text-ink-dim">
      <path d="M7 4 L14 11 L7 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** A small downward chevron used between nodes on stacked (mobile) layouts. */
function ChevronDown() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true" className="shrink-0 text-ink-dim">
      <path d="M4 7 L11 14 L18 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Slide 03 — the system at a glance.
 *
 * A calm, *static* schematic (deliberately distinct from the live demo): one
 * photo flowing left-to-right through the three agents and then branching into
 * two terminal outcomes — a silent auto-filed dispute (green) or a human
 * escalation (amber). Nodes are plain bordered panels with mono labels and
 * CSS/SVG chevrons; they stagger in on scroll and collapse to the final state
 * under `prefers-reduced-motion`. Numbered captions restate each step in prose.
 */
export default function HowItWorksSection() {
  const reducedMotion = useReducedMotion()

  const rise = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px' },
      }

  // Per-node entrance, staggered along the flow. `false` disables the initial
  // hidden state entirely when the user prefers reduced motion.
  const node = (index: number) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: '-80px' },
          transition: { duration: 0.45, delay: 0.1 + index * 0.12 },
        }

  return (
    <Section id="how-it-works" ariaLabel="How it works" className="bg-void relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-void bg-[length:44px_44px] opacity-[0.35]"
      />

      <div className="relative z-10">
        <motion.div {...rise} transition={{ duration: 0.5 }}>
          <MonoLabel className="tracking-[0.2em]">03 · HOW IT WORKS</MonoLabel>
        </motion.div>

        <motion.h2
          className="mt-5 max-w-3xl text-section-title font-sans font-semibold text-ink"
          {...rise}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.08 }}
        >
          Follow one photo through the system.
        </motion.h2>

        {/* The diagram. Decorative as a whole — the numbered captions below
            carry the same information as readable prose. */}
        <div aria-hidden className="mt-12 flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-2">
          {FLOW.map((step, i) => (
            <div key={step.tag} className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-2">
              <motion.div className="lg:flex-1" {...node(i)}>
                <FlowBox tag={step.tag} accent={step.accent}>
                  {step.name}
                </FlowBox>
              </motion.div>

              {/* Connector into the next node: chevron down on mobile, right on lg. */}
              <div className="flex justify-center lg:items-center">
                <span className="lg:hidden">
                  <ChevronDown />
                </span>
                <span className="hidden lg:inline">
                  <ChevronRight />
                </span>
              </div>
            </div>
          ))}

          {/* Terminal branch: the two possible outcomes. */}
          <motion.div className="flex flex-col gap-3 lg:flex-1 lg:justify-center" {...node(FLOW.length)}>
            <OutcomeBox tone="green">file dispute · silent</OutcomeBox>
            <OutcomeBox tone="amber">escalate · human review</OutcomeBox>
          </motion.div>
        </div>

        {/* Numbered step captions — the accessible narration of the diagram. */}
        <ol className="mt-12 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {FLOW.map((step, i) => (
            <Caption key={step.tag} n={i + 1} title={step.name}>
              {step.caption}
            </Caption>
          ))}
          <Caption n={5} title="Two outcomes">
            Low severity with a match is filed silently; anything uncertain is escalated to a human in
            Slack — every step logged either way.
          </Caption>
        </ol>
      </div>
    </Section>
  )
}

interface FlowBoxProps {
  tag: string
  accent: string
  children: ReactNode
}

/** A single agent/input node: a bordered surface panel with a mono tag. */
function FlowBox({ tag, accent, children }: FlowBoxProps) {
  return (
    <div
      className={
        'h-full rounded-lg border border-l-2 border-border bg-surface px-4 py-4 shadow-panel ' + accent
      }
    >
      <MonoLabel dim className="tabular-nums tracking-widest">
        {tag}
      </MonoLabel>
      <p className="mt-1.5 font-mono text-sm leading-snug text-ink">{children}</p>
    </div>
  )
}

interface OutcomeBoxProps {
  tone: 'green' | 'amber'
  children: ReactNode
}

const OUTCOME_TONES: Record<OutcomeBoxProps['tone'], string> = {
  green: 'border-green/40 bg-green-dim/40 text-green',
  amber: 'border-amber/40 bg-amber-dim/40 text-amber',
}

/** A terminal outcome chip in the branch (silent file vs. human escalation). */
function OutcomeBox({ tone, children }: OutcomeBoxProps) {
  return (
    <div className={'rounded-lg border px-4 py-3 text-center ' + OUTCOME_TONES[tone]}>
      <span className="font-mono text-xs uppercase tracking-widest">{children}</span>
    </div>
  )
}

interface CaptionProps {
  n: number
  title: string
  children: ReactNode
}

/** One numbered, mono-tagged caption beneath the diagram. */
function Caption({ n, title, children }: CaptionProps) {
  return (
    <li className="flex gap-3">
      <MonoLabel dim className="tabular-nums">
        {String(n).padStart(2, '0')}
      </MonoLabel>
      <div>
        <p className="font-mono text-sm text-ink">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-dim">{children}</p>
      </div>
    </li>
  )
}
