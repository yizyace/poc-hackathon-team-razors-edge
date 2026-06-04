import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

import MonoLabel from '../primitives/MonoLabel'
import MetricCounter from '../primitives/MetricCounter'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { SCENARIOS, METRICS } from '../../data/scenarios'

export interface EvidenceTriptychProps {
  className?: string
}

/** Render an ISO timestamp as a compact mono wall-clock with milliseconds. */
function clock(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  return (
    pad(d.getUTCHours()) +
    ':' +
    pad(d.getUTCMinutes()) +
    ':' +
    pad(d.getUTCSeconds()) +
    '.' +
    pad(d.getUTCMilliseconds(), 3)
  )
}

interface AuditRow {
  time: string
  agent: string
  action: string
  result: string
  tone: 'red' | 'amber' | 'green'
}

const RESULT_TONE: Record<AuditRow['tone'], string> = {
  red: 'text-red',
  amber: 'text-amber',
  green: 'text-green',
}

// Seven rows spanning both runs, derived from the scenarios. Run 1 escalates
// (guardrail); Run 2 resolves silently (happy path).
const AUDIT_ROWS: AuditRow[] = [
  {
    time: clock(SCENARIOS.run1.dispatch.timestamp),
    agent: 'vision-inspector',
    action: 'assess damage',
    result: 'damage HIGH',
    tone: 'amber',
  },
  {
    time: clock(SCENARIOS.run1.dispatch.timestamp),
    agent: 'audit-core',
    action: 'reconcile PO',
    result: 'no PO match',
    tone: 'red',
  },
  {
    time: clock(SCENARIOS.run1.dispatch.timestamp),
    agent: 'dispute-coordinator',
    action: 'route decision',
    result: 'ESCALATE → #ops-alerts',
    tone: 'amber',
  },
  {
    time: clock(SCENARIOS.run2.dispatch.timestamp),
    agent: 'vision-inspector',
    action: 'assess damage',
    result: 'damage LOW',
    tone: 'green',
  },
  {
    time: clock(SCENARIOS.run2.dispatch.timestamp),
    agent: 'audit-core',
    action: 'reconcile PO',
    result: 'matched Pacific Freight Partners',
    tone: 'green',
  },
  {
    time: clock(SCENARIOS.run2.dispatch.timestamp),
    agent: 'dispute-coordinator',
    action: 'route decision',
    result: 'FILE silent',
    tone: 'green',
  },
  {
    time: clock(SCENARIOS.run2.dispatch.timestamp),
    agent: 'audit-core',
    action: 'seal trail',
    result: 'committed',
    tone: 'green',
  },
]

interface PanelProps {
  index: number
  reducedMotion: boolean
  heading: string
  caption: string
  children: ReactNode
}

/** One framed column in the triptych, staggered in on scroll. */
function Panel({ index, reducedMotion, heading, caption, children }: PanelProps) {
  const rise = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px' },
        transition: { duration: 0.5, delay: index * 0.12 },
      }

  return (
    <motion.div
      className="flex flex-col rounded-lg border border-border bg-surface p-5 shadow-panel"
      {...rise}
    >
      <MonoLabel className="uppercase tracking-[0.2em]">{heading}</MonoLabel>
      <div className="mt-4 flex-1">{children}</div>
      <p className="mt-4 text-sm text-ink-dim">{caption}</p>
    </motion.div>
  )
}

/**
 * The closing "three windows" exhibit: the same VisionOps run, viewed through
 * the lenses that matter to a buyer — governance (the audit trail), user impact
 * (the single Slack escalation), and economics (the GMI cost dashboard). All
 * content is derived from {@link SCENARIOS}/{@link METRICS}; nothing is live.
 */
export default function EvidenceTriptych({ className }: EvidenceTriptychProps) {
  const reducedMotion = useReducedMotion()

  return (
    <div className={'grid grid-cols-1 gap-5 lg:grid-cols-3 ' + (className ?? '')}>
      {/* Panel 1 — governance: the Phinite audit trail. */}
      <Panel
        index={0}
        reducedMotion={reducedMotion}
        heading="Audit trail"
        caption="Every decision — timestamped and attributable."
      >
        <ol className="space-y-1.5 font-mono text-[11px] leading-relaxed">
          {AUDIT_ROWS.map((row, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-ink-dim tabular-nums">{row.time}</span>
              <span className="text-phinite">{row.agent}</span>
              <span className="text-ink-code">{row.action}</span>
              <span className={RESULT_TONE[row.tone]}>{row.result}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 font-mono text-[10px] text-ink-dim">
          <span>trail {SCENARIOS.run1.dispatch.audit_trail_id}</span>
          <span>trail {SCENARIOS.run2.dispatch.audit_trail_id}</span>
        </div>
      </Panel>

      {/* Panel 2 — user impact: the one Slack escalation. */}
      <Panel
        index={1}
        reducedMotion={reducedMotion}
        heading="Slack alert"
        caption="The one moment a human is pulled in."
      >
        <SlackAlert />
      </Panel>

      {/* Panel 3 — economics: the GMI cost dashboard. */}
      <Panel
        index={2}
        reducedMotion={reducedMotion}
        heading="GMI dashboard"
        caption="Pay for 11 seconds of seeing. Nothing when idle."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <MetricTile label="inference latency">
            <MetricCounter to={METRICS.inferenceLatencyS} suffix="s" decimals={1} />
          </MetricTile>
          <MetricTile label="cost / run">
            <MetricCounter to={METRICS.visionopsCostUsd} prefix="$" decimals={2} />
          </MetricTile>
          <MetricTile label="GPUs running now" tag="scale-to-zero">
            <MetricCounter to={0} />
          </MetricTile>
        </div>
      </Panel>
    </div>
  )
}

/** A faux Slack message card in the deck's dark theme. */
function SlackAlert() {
  const run1 = SCENARIOS.run1

  return (
    <div className="rounded-md border border-border bg-surface-2 p-3.5">
      {/* Channel context. */}
      <div className="mb-2.5">
        <span className="inline-block rounded-sm bg-void px-1.5 py-0.5 font-mono text-[10px] text-ink-dim">
          #ops-alerts
        </span>
      </div>

      {/* Author row. */}
      <div className="flex items-center gap-2">
        <span aria-hidden className="h-7 w-7 shrink-0 rounded-[5px] bg-amber" />
        <span className="text-sm font-semibold text-ink">VisionOps</span>
        <span className="rounded-sm border border-border px-1 py-px font-mono text-[9px] uppercase tracking-wider text-ink-dim">
          App
        </span>
        <span className="font-mono text-[10px] text-ink-dim">{clock(run1.dispatch.timestamp)}</span>
      </div>

      {/* Message body. */}
      <div className="mt-2.5 space-y-1.5">
        <p className="flex items-center gap-2 text-sm font-medium text-amber">
          <span aria-hidden>▲</span>
          Manual review required
        </p>
        <ul className="space-y-1 text-[13px] text-ink-dim">
          <li>
            severity <span className="font-mono text-amber">{run1.vision.severity}</span>
          </li>
          <li>tracking number unreadable after retry</li>
          <li>no PO match</li>
        </ul>
        <span className="mt-1 inline-flex items-center gap-1.5 rounded-sm border border-border bg-void px-2 py-1 font-mono text-[10px] text-ink-code">
          <span aria-hidden className="text-ink-dim">
            ▣
          </span>
          [ damaged-label.jpg ]
        </span>
      </div>

      {/* Faux actions (non-functional). */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="rounded-sm border border-border px-2.5 py-1 font-mono text-[11px] text-ink-code transition-colors hover:border-amber/60 hover:text-amber"
        >
          Assign to me
        </button>
        <button
          type="button"
          className="rounded-sm border border-border px-2.5 py-1 font-mono text-[11px] text-ink-code transition-colors hover:border-ink-dim"
        >
          View incident
        </button>
      </div>
    </div>
  )
}

interface MetricTileProps {
  label: string
  tag?: string
  children: ReactNode
}

/** A single labelled metric tile in the GMI dashboard panel. */
function MetricTile({ label, tag, children }: MetricTileProps) {
  return (
    <div className="rounded-md border border-border bg-surface-2 p-3.5">
      <div className="text-2xl font-semibold text-ink">{children}</div>
      <div className="mt-1 flex items-center gap-2">
        <MonoLabel dim className="uppercase tracking-wider">
          {label}
        </MonoLabel>
        {tag ? (
          <span className="rounded-sm border border-green/60 bg-green-dim px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-green">
            {tag}
          </span>
        ) : null}
      </div>
    </div>
  )
}
