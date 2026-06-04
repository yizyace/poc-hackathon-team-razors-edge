import Section from '../layout/Section'
import MonoLabel from '../primitives/MonoLabel'
import PipelineDemo from '../pipeline/PipelineDemo'
import { SCENARIOS } from '../../data/scenarios'

/**
 * Slide 05 — the happy path. A lightly scuffed box with a clean, readable
 * label: the tracking number scans, the Audit Core finds a matching PO, and
 * because the damage is only LOW severity the Dispute Coordinator files the
 * claim SILENTLY. No one gets paged for a scuffed box — but the audit trail
 * still records that it happened.
 */
export default function DemoRun2Section() {
  const { run2 } = SCENARIOS

  return (
    <Section id="demo-run-2" ariaLabel="Live demo run 2, the happy path" className="bg-void">
      <div className="space-y-8">
        <header className="max-w-3xl space-y-3">
          <MonoLabel dim>05 · LIVE DEMO</MonoLabel>
          <h2 className="text-section-title font-semibold text-ink">Run 2 — The Happy Path</h2>
          <p className="text-ink-dim">
            Same pipeline, different package. This box is only scuffed and its label is crisp, so the
            tracking number scans on the first pass and the Audit Core finds a matching PO. Because the
            damage is <span className="text-green">LOW</span> severity, the Dispute Coordinator files the
            claim <span className="text-green">silently</span> — no one gets woken up for a scuffed box. The
            difference from Run 1 is entirely in the context, not the code.
          </p>
        </header>

        <PipelineDemo scenario={run2} />

        <aside
          aria-label="Outcome note"
          className="rounded-lg border border-green/40 bg-green-dim/40 p-4 shadow-glow-green"
        >
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-green">
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-green" />
            Audit trail · {run2.dispatch.audit_trail_id}
          </div>
          <p className="mt-2 font-mono text-sm text-ink-code">
            Slack stayed silent. The dispute was filed and logged anyway.
          </p>
        </aside>
      </div>
    </Section>
  )
}
