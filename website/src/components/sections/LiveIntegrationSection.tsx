import { motion } from 'framer-motion'

import Section from '../layout/Section'
import MonoLabel from '../primitives/MonoLabel'
import GraphStudioPanel from '../integration/GraphStudioPanel'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/** A faithful excerpt of an autonomous test run through the real graph. */
const TEST_LOG: { tag: string; color: string; text: string }[] = [
  { tag: 'test', color: 'text-ink-dim', text: 'Analyze this damaged shipping box and process the freight claim.' },
  { tag: 'audit-core', color: 'text-phinite', text: 'Delegated image analysis to the child Vision Inspector Specialist.' },
  { tag: 'vision', color: 'text-gmi', text: 'damage_detected: true · damage_severity: "high" · image_id captured' },
  { tag: 'audit-core', color: 'text-phinite', text: 'lookup_vendor_api → searching purchase orders…' },
  { tag: 'audit', color: 'text-amber', text: 'match_found: false — tracking number incomplete' },
  { tag: 'dispatch', color: 'text-amber', text: 'conditional route → slack_webhook_api: manual review requested' },
  { tag: 'system', color: 'text-green', text: 'workflow_completed → End' },
  { tag: 'test', color: 'text-ink-dim', text: 'Thank you!' },
]

/**
 * "Live integration" slide — proof this is not a mockup. Recreates the team's
 * real Phinite Graph Studio "VisionOps" agent graph and shows an excerpt of an
 * autonomous test running end to end through it.
 */
export default function LiveIntegrationSection() {
  const reducedMotion = useReducedMotion()

  const rise = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px' },
      }

  return (
    <Section id="live-graph" ariaLabel="Live Phinite integration" className="bg-void relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-void bg-[length:44px_44px] opacity-[0.3]"
      />

      <div className="relative z-10">
        <motion.div {...rise} transition={{ duration: 0.5 }} className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse-amber rounded-full bg-green" />
          <MonoLabel className="tracking-[0.2em] text-green">LIVE · PHINITE GRAPH STUDIO</MonoLabel>
        </motion.div>

        <motion.h2
          className="mt-5 text-section-title font-sans font-semibold text-ink"
          {...rise}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.08 }}
        >
          Not a mockup — the actual wired-up graph.
        </motion.h2>

        <motion.p
          className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-dim"
          {...rise}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.16 }}
        >
          VisionOps runs as a real <span className="text-ink">Phinite Graph Studio</span> agent graph:
          an <span className="text-phinite">Audit Core orchestrator</span> that delegates damage
          analysis to a <span className="text-gmi">GMI&nbsp;Cloud</span> vision specialist and routes
          disputes through a <span className="text-amber">Slack webhook</span>. Five blocks, connected,
          running live — here it is, with an autonomous test flowing through it.
        </motion.p>

        <motion.div className="mt-10" {...rise} transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.22 }}>
          <GraphStudioPanel />
        </motion.div>

        {/* Autonomous test log */}
        <motion.div
          className="mt-6 overflow-hidden rounded-xl border border-border bg-[#0d0f14] shadow-panel"
          {...rise}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.3 }}
        >
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <span className="font-mono text-xs font-semibold text-ink">Autonomous Testing</span>
            <span className="font-mono text-[11px] text-ink-dim">VisionOps · run #1</span>
            <span className="ml-auto rounded border border-green/40 bg-green-dim px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-green">
              passed
            </span>
          </div>
          <div className="space-y-1.5 px-4 py-4 font-mono text-xs leading-relaxed">
            {TEST_LOG.map((line, i) => (
              <div key={i} className="flex gap-3">
                <span className={'w-24 shrink-0 text-right ' + line.color}>{line.tag}</span>
                <span className="text-ink-code">{line.text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.p
          className="mt-4 font-mono text-xs text-ink-dim"
          {...rise}
          transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.36 }}
        >
          Recreated from the live Graph Studio canvas (Default_Workspace / Razor) — same blocks,
          edges, and tool wiring as the deployed integration.
        </motion.p>
      </div>
    </Section>
  )
}
