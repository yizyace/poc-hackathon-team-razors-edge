/**
 * VisionOps demo scenarios — the single source of truth for the simulated
 * pipeline. Both runs flow through the identical state machine; they differ
 * ONLY by the data here. Swap these values (and the package images in
 * public/images/) for real captures later without touching any component.
 */

const BASE = import.meta.env.BASE_URL

export type Severity = 'HIGH' | 'LOW'

/** Agent 1 — Vision Inspector (GMI Cloud VLM) output. */
export interface VisionOutput {
  damage_detected: boolean
  severity: Severity | null
  tracking_number: string | null
  schema_valid: boolean
  retry_attempted: boolean
}

/** Agent 2 — Audit Core (Phinite + mock ERP) output. */
export interface AuditOutput {
  tracking_number: string | null
  vendor: string | null
  sla_terms: string | null
  po_match: boolean
}

/** Agent 3 — Dispute Coordinator (Phinite + Slack) output. */
export interface DispatchOutput {
  action: 'SLACK_ALERT' | 'SILENT_DISPUTE' | 'MANUAL_REVIEW'
  audit_trail_id: string
  timestamp: string
  message: string
}

export type ScenarioId = 'run1' | 'run2'

export interface Scenario {
  id: ScenarioId
  /** Full descriptive label for section headers. */
  label: string
  /** Short chip label, e.g. "RUN 1 · GUARDRAIL". */
  shortLabel: string
  /** One-line framing of what this run proves. */
  proves: string
  packageImage: string
  packageAlt: string
  /** Delays (ms) before each agent's output is revealed. */
  timings: {
    inspectMs: number
    auditMs: number
    dispatchMs: number
  }
  vision: VisionOutput
  audit: AuditOutput
  dispatch: DispatchOutput
  outcome: 'ESCALATED' | 'RESOLVED'
  outcomeSeverity: Severity
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  run1: {
    id: 'run1',
    label: 'Run 1 — Guardrail: crushed box, torn label',
    shortLabel: 'RUN 1 · GUARDRAIL',
    proves: 'The system knows when it doesn’t know — it escalates instead of fabricating a dispute.',
    packageImage: `${BASE}images/run1-package.svg`,
    packageAlt:
      'Heavily crushed cardboard box; the shipping label is torn across the tracking number, leaving it partly unreadable.',
    timings: { inspectMs: 2200, auditMs: 1800, dispatchMs: 1400 },
    vision: {
      damage_detected: true,
      severity: 'HIGH',
      tracking_number: null, // torn label — unreadable after retry
      schema_valid: false,
      retry_attempted: true,
    },
    audit: {
      tracking_number: null,
      vendor: null,
      sla_terms: null,
      po_match: false,
    },
    dispatch: {
      action: 'SLACK_ALERT',
      audit_trail_id: 'ATL-20260603-0042',
      timestamp: '2026-06-03T14:22:07.341Z',
      message:
        'HIGH severity damage; tracking number unreadable after retry. No PO match. Escalating to #ops-alerts for manual review.',
    },
    outcome: 'ESCALATED',
    outcomeSeverity: 'HIGH',
  },
  run2: {
    id: 'run2',
    label: 'Run 2 — Happy path: scuffed box, clean label',
    shortLabel: 'RUN 2 · HAPPY PATH',
    proves: 'The system routes on context — low severity is resolved silently, with a full audit trail.',
    packageImage: `${BASE}images/run2-package.svg`,
    packageAlt: 'Lightly scuffed cardboard box with an intact, clearly readable shipping label.',
    timings: { inspectMs: 1600, auditMs: 1200, dispatchMs: 900 },
    vision: {
      damage_detected: true,
      severity: 'LOW',
      tracking_number: '1Z999AA10123456784',
      schema_valid: true,
      retry_attempted: false,
    },
    audit: {
      tracking_number: '1Z999AA10123456784',
      vendor: 'Pacific Freight Partners LLC',
      sla_terms: '48h claim window · insured up to $2,500',
      po_match: true,
    },
    dispatch: {
      action: 'SILENT_DISPUTE',
      audit_trail_id: 'ATL-20260603-0043',
      timestamp: '2026-06-03T14:34:51.882Z',
      message: 'LOW severity; PO matched. Dispute filed automatically. No human action required.',
    },
    outcome: 'RESOLVED',
    outcomeSeverity: 'LOW',
  },
}

export const SCENARIO_LIST: Scenario[] = [SCENARIOS.run1, SCENARIOS.run2]

/** Headline ROI numbers, shared by the hero and metrics sections. */
export const METRICS = {
  manualMinutes: 27,
  manualCostUsd: 43,
  visionopsSeconds: 11,
  visionopsCostUsd: 0.03,
  inferenceLatencyS: 11.2,
} as const
