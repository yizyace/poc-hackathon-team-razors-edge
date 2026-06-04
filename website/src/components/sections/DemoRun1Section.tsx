import Section from '../layout/Section'
import MonoLabel from '../primitives/MonoLabel'
import PipelineDemo from '../pipeline/PipelineDemo'
import { SCENARIOS } from '../../data/scenarios'

/**
 * Slide 04 — the guardrail run. A crushed box whose label is torn across the
 * tracking number: the Vision Inspector cannot read it (even after a retry),
 * the Audit Core finds no PO match, and rather than fabricating a dispute the
 * system ESCALATES to a human. An amber Slack-alert callout shows the exact
 * message that lands in #ops-alerts.
 */
export default function DemoRun1Section() {
  const { run1 } = SCENARIOS

  return (
    <Section id="demo-run-1" ariaLabel="Live demo run 1, the guardrail" className="bg-void">
      <div className="space-y-8">
        <header className="max-w-3xl space-y-3">
          <MonoLabel dim>04 · LIVE DEMO</MonoLabel>
          <h2 className="text-section-title font-semibold text-ink">Run 1 — The Guardrail</h2>
          <p className="text-ink-dim">
            The box arrived crushed, and the same impact tore the shipping label clean across the tracking
            number. The Vision Inspector flags HIGH severity but cannot read the code — even after a retry —
            and with no readable identifier the Audit Core finds no PO match. So the pipeline does the one
            thing a careless automation never would: instead of fabricating a dispute against a vendor it
            cannot name, it <span className="text-amber">escalates</span> to a human. The system knows when
            it doesn&rsquo;t know.
          </p>
        </header>

        <PipelineDemo scenario={run1} />

        <aside
          aria-label="Slack alert preview"
          className="rounded-lg border border-amber/40 bg-amber-dim/40 p-4 shadow-glow-amber"
        >
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-amber">
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-amber animate-pulse-amber" />
            Slack · #ops-alerts
          </div>
          <p className="mt-2 font-mono text-sm text-ink-code">{run1.dispatch.message}</p>
        </aside>
      </div>
    </Section>
  )
}
