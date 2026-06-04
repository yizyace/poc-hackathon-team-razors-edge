import Nav from './components/layout/Nav'
import HeroSection from './components/sections/HeroSection'
import ProblemSection from './components/sections/ProblemSection'
import AgentsSection from './components/sections/AgentsSection'
import HowItWorksSection from './components/sections/HowItWorksSection'
import LiveIntegrationSection from './components/sections/LiveIntegrationSection'
import DemoRun1Section from './components/sections/DemoRun1Section'
import DemoRun2Section from './components/sections/DemoRun2Section'
import EvidenceSection from './components/sections/EvidenceSection'
import MetricsSection from './components/sections/MetricsSection'
import PoweredBySection from './components/sections/PoweredBySection'
import TeamSection from './components/sections/TeamSection'
import CtaSection from './components/sections/CtaSection'

// Anchor targets for the section nav (in scroll order).
const NAV_SECTIONS = [
  { id: 'problem', label: 'Problem' },
  { id: 'agents', label: 'Agents' },
  { id: 'how-it-works', label: 'Pipeline' },
  { id: 'live-graph', label: 'Live' },
  { id: 'demo-run-1', label: 'Run 1' },
  { id: 'demo-run-2', label: 'Run 2' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'metrics', label: 'ROI' },
  { id: 'powered-by', label: 'Stack' },
  { id: 'team', label: 'Team' },
]

export default function App() {
  return (
    <div className="scanlines min-h-screen bg-void text-ink">
      <Nav sections={NAV_SECTIONS} />
      <main>
        <HeroSection />
        <ProblemSection />
        <AgentsSection />
        <HowItWorksSection />
        <LiveIntegrationSection />
        <DemoRun1Section />
        <DemoRun2Section />
        <EvidenceSection />
        <MetricsSection />
        <PoweredBySection />
        <TeamSection />
        <CtaSection />
      </main>
    </div>
  )
}
