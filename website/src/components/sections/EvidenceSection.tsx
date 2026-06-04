import Section from '../layout/Section'
import MonoLabel from '../primitives/MonoLabel'
import EvidenceTriptych from '../triptych/EvidenceTriptych'

/**
 * Slide 06 — "The evidence": the same VisionOps run shown through three
 * windows (governance, user impact, economics) so each stakeholder sees the
 * proof they care about. Header column above the {@link EvidenceTriptych}.
 */
export default function EvidenceSection() {
  return (
    <Section id="evidence" ariaLabel="The evidence" className="bg-void relative">
      <header className="mb-10 max-w-2xl">
        <MonoLabel className="tracking-[0.2em]">06 · THE EVIDENCE</MonoLabel>
        <h2 className="mt-4 text-section-title font-sans font-semibold text-ink">
          Governance. User impact. Economics.
        </h2>
        <p className="mt-4 text-ink-dim">Three windows. The whole story.</p>
      </header>

      <EvidenceTriptych />
    </Section>
  )
}
