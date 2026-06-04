import type { Scenario } from '../../data/scenarios'

import { usePipelineStateMachine } from '../../hooks/usePipelineStateMachine'
import TerminalBadge from '../primitives/TerminalBadge'
import PackagePhoto from './PackagePhoto'
import PipelineStage from './PipelineStage'
import type { StageField } from './PipelineStage'
import PipelineControls from './PipelineControls'

export interface PipelineDemoProps {
  scenario: Scenario
}

/** Format a boolean as a terminal-style literal. */
function bool(value: boolean): string {
  return value ? 'true' : 'false'
}

/**
 * The centerpiece: a simulated "live" pipeline. A single package photo is fed
 * through three agents — Vision Inspector, Audit Core, Dispute Coordinator —
 * and each stage's status and revealed fields are derived directly from the
 * headless state machine's snapshot, so the same component drives both the
 * guardrail (run1) and happy-path (run2) scenarios from data alone.
 */
export default function PipelineDemo({ scenario }: PipelineDemoProps) {
  const { snapshot, isRunning, play, reset } = usePipelineStateMachine(scenario)
  const { state, vision, audit, dispatch, elapsedMs } = snapshot

  // ---- Stage A1: Vision Inspector -----------------------------------------
  const visionStatus = state === 'inspecting' ? 'running' : vision !== null ? 'done' : 'idle'
  const visionFields: StageField[] | null = vision
    ? [
        { label: 'damage_detected', value: bool(vision.damage_detected), tone: 'warn' },
        { label: 'severity', value: vision.severity ?? 'null', tone: vision.severity === 'HIGH' ? 'bad' : 'good' },
        {
          label: 'tracking_number',
          value: vision.tracking_number ?? 'unreadable / null',
          tone: vision.tracking_number === null ? 'bad' : 'default',
        },
        { label: 'schema_valid', value: bool(vision.schema_valid), tone: vision.schema_valid ? 'good' : 'bad' },
        { label: 'retry_attempted', value: bool(vision.retry_attempted) },
      ]
    : null
  const visionBadge = vision
    ? { severity: (vision.severity === 'HIGH' ? 'HIGH' : 'LOW') as 'HIGH' | 'LOW', text: vision.severity ?? undefined }
    : null

  // ---- Stage A2: Audit Core -----------------------------------------------
  const auditStatus = state === 'auditing' ? 'running' : audit !== null ? 'done' : 'idle'
  const auditFields: StageField[] | null = audit
    ? [
        {
          label: 'tracking_number',
          value: audit.tracking_number ?? 'null',
          tone: audit.tracking_number === null ? 'bad' : 'default',
        },
        {
          label: 'vendor',
          value: audit.vendor ?? 'no match',
          tone: audit.vendor === null ? 'bad' : 'default',
        },
        { label: 'sla_terms', value: audit.sla_terms ?? 'n/a', tone: audit.sla_terms === null ? 'bad' : 'default' },
        { label: 'po_match', value: bool(audit.po_match), tone: audit.po_match ? 'good' : 'bad' },
      ]
    : null
  const auditBadge = audit
    ? audit.po_match === false
      ? { severity: 'ERR' as const, text: 'NO MATCH' }
      : { severity: 'OK' as const, text: 'MATCH' }
    : null

  // ---- Stage A3: Dispute Coordinator --------------------------------------
  const dispatchStatus = state === 'dispatching' ? 'running' : dispatch !== null ? 'done' : 'idle'
  const dispatchFields: StageField[] | null = dispatch
    ? [
        {
          label: 'action',
          value: dispatch.action,
          tone: dispatch.action === 'SILENT_DISPUTE' ? 'good' : 'warn',
        },
        { label: 'audit_trail_id', value: dispatch.audit_trail_id },
        { label: 'timestamp', value: dispatch.timestamp },
      ]
    : null

  // The photo scans while the inspector runs (covers the brief window before
  // the machine has flipped to 'inspecting' but a run is already underway).
  const photoProcessing = state === 'inspecting' || (isRunning && vision === null)

  return (
    <div className="rounded-xl border border-border bg-surface/40 p-5 shadow-panel">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_1.4fr]">
        <div>
          <PackagePhoto src={scenario.packageImage} alt={scenario.packageAlt} isProcessing={photoProcessing} />
        </div>

        <div className="space-y-4">
          <PipelineStage
            index={0}
            name="Vision Inspector"
            tech="GMI Cloud · VLM"
            accent="gmi"
            status={visionStatus}
            fields={visionFields}
            badge={visionBadge}
          />
          <PipelineStage
            index={1}
            name="Audit Core"
            tech="Phinite · mock ERP"
            accent="phinite"
            status={auditStatus}
            fields={auditFields}
            badge={auditBadge}
          />
          <PipelineStage
            index={2}
            name="Dispute Coordinator"
            tech="Phinite · Slack"
            accent="amber"
            status={dispatchStatus}
            fields={dispatchFields}
            badge={null}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 font-mono text-xs">
        <span className="text-ink-dim">
          STATE: <span className="text-ink-code">{state}</span>
        </span>
        <span className="tabular-nums text-ink-code">{(elapsedMs / 1000).toFixed(1)}s</span>
        <span className="min-w-[7rem] text-right">
          {state === 'done' ? (
            <TerminalBadge severity={scenario.outcomeSeverity === 'HIGH' ? 'HIGH' : 'LOW'}>
              {scenario.outcome}
            </TerminalBadge>
          ) : null}
        </span>
      </div>

      <div className="mt-4">
        <PipelineControls state={state} isRunning={isRunning} onPlay={play} onReset={reset} />
      </div>
    </div>
  )
}
