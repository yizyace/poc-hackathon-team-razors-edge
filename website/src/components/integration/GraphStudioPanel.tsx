import { useReducedMotion } from '../../hooks/useReducedMotion'

/**
 * A faithful recreation of the team's real Phinite Graph Studio "VisionOps"
 * agent graph (Default_Workspace / Razor). Node names, edge labels, and tool
 * integrations match the live, wired-up workflow:
 *
 *   Start --image_input_received--> Audit Core Orchestrator
 *     --delegate_image_analysis--> Vision Inspector Specialist
 *     --vendor_lookup_completed--> Dispute Coordinator --workflow_completed--> End
 *
 * Rendered as scalable SVG (with HTML chrome) rather than a screenshot so it
 * stays crisp at any size and on-brand with the rest of the deck.
 */

const C = {
  surface: '#15181F',
  surfaceHi: '#1B1F2A',
  border: '#2A2F3F',
  ink: '#E8EAF0',
  inkDim: '#8B92A8',
  inkCode: '#AEB6CE',
  void: '#0A0B0D',
  phinite: '#8B7CF0',
  gmi: '#22CCEE',
  amber: '#F5A623',
  green: '#3DD68C',
}

interface Chip {
  label: string
  kind: 'api' | 'json'
}

function ToolChips({ x, y, chips }: { x: number; y: number; chips: Chip[] }) {
  return (
    <>
      {chips.map((chip, i) => {
        const cy = y + i * 26
        return (
          <g key={chip.label}>
            <rect x={x} y={cy} width={186} height={20} rx={4} fill={C.surfaceHi} stroke={C.border} />
            <text
              x={x + 9}
              y={cy + 14}
              fontFamily="'JetBrains Mono', monospace"
              fontSize={10}
              fill={chip.kind === 'api' ? C.gmi : C.inkDim}
            >
              {chip.kind === 'api' ? '✂' : '{ }'}
            </text>
            <text x={x + 28} y={cy + 14} fontFamily="'JetBrains Mono', monospace" fontSize={10.5} fill={C.inkCode}>
              {chip.label}
            </text>
          </g>
        )
      })}
    </>
  )
}

interface NodeProps {
  x: number
  y: number
  w: number
  h: number
  accent: string
  title: string
  mission: string[]
  chips: Chip[]
}

function AgentNode({ x, y, w, h, accent, title, mission, chips }: NodeProps) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={C.surface} stroke={accent} strokeOpacity={0.55} />
      {/* accent header strip */}
      <rect x={x} y={y} width={w} height={30} rx={10} fill={accent} fillOpacity={0.12} />
      <circle cx={x + 16} cy={y + 15} r={4} fill={accent} />
      <text x={x + 28} y={y + 19} fontFamily="'JetBrains Mono', monospace" fontSize={12.5} fontWeight={600} fill={C.ink}>
        {title}
      </text>
      <text x={x + 14} y={y + 48} fontFamily="'JetBrains Mono', monospace" fontSize={9.5} fill={C.inkDim}>
        Prompt
      </text>
      {mission.map((line, i) => (
        <text
          key={i}
          x={x + 14}
          y={y + 64 + i * 14}
          fontFamily="'JetBrains Mono', monospace"
          fontSize={10.5}
          fill={C.inkCode}
        >
          {line}
        </text>
      ))}
      <ToolChips x={x + 14} y={y + h - 14 - chips.length * 26 + 6} chips={chips} />
    </g>
  )
}

function Edge({ d, label, lx, ly }: { d: string; label: string; lx: number; ly: number; }) {
  return (
    <g>
      <path d={d} fill="none" stroke={C.amber} strokeWidth={1.4} strokeOpacity={0.75} markerEnd="url(#vo-arrow)" />
      <rect x={lx} y={ly - 11} width={label.length * 6.0 + 12} height={17} rx={4} fill={C.void} stroke={C.border} />
      <text
        x={lx + 6}
        y={ly + 1}
        fontFamily="'JetBrains Mono', monospace"
        fontSize={9.5}
        fill={C.inkDim}
      >
        {label}
      </text>
    </g>
  )
}

export default function GraphStudioPanel({ className }: { className?: string }) {
  const reducedMotion = useReducedMotion()
  const flowClass = reducedMotion ? '' : 'animate-flow'

  return (
    <div
      className={
        'overflow-hidden rounded-xl border border-border bg-[#0d0f14] shadow-panel ' + (className ?? '')
      }
    >
      {/* Toolbar chrome */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-2.5">
        <span className="font-mono text-xs font-semibold text-ink">Graph Studio</span>
        <span className="font-mono text-[11px] text-ink-dim">Default_Workspace / Razor</span>
        <span className="mx-1 h-3 w-px bg-border" />
        <span className="font-mono text-xs text-ink">VisionOps</span>
        <span className="rounded border border-green/40 bg-green-dim px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-green">
          Saved
        </span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-green">
          <span className="h-1.5 w-1.5 rounded-full bg-green" />
          Connected
        </span>
        <span className="font-mono text-[11px] text-ink-dim">Blocks: 5</span>
      </div>

      {/* Graph canvas */}
      <svg viewBox="0 0 1060 500" className="block h-auto w-full" role="img" aria-label="Phinite Graph Studio VisionOps agent graph: Start to Audit Core Orchestrator, which delegates image analysis to the Vision Inspector Specialist and routes vendor lookups to the Dispute Coordinator, ending the workflow.">
        <defs>
          <marker id="vo-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={C.amber} fillOpacity={0.85} />
          </marker>
          <pattern id="vo-grid" width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M34 0H0V34" fill="none" stroke="#161A24" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="1060" height="500" fill="url(#vo-grid)" />

        {/* Edges (under nodes) */}
        <g className={flowClass} strokeDasharray={reducedMotion ? undefined : '5 4'}>
          <Edge d="M300 78 C 300 122 332 130 360 162" label="image_input_received" lx={252} ly={120} />
          <Edge d="M590 196 C 666 196 700 134 760 134" label="delegate_image_analysis" lx={602} ly={150} />
          <Edge d="M590 250 C 668 250 700 360 760 360" label="vendor_lookup_completed" lx={600} ly={300} />
          <Edge d="M885 470 C 892 486 908 470 930 466" label="workflow_completed" lx={788} ly={494} />
        </g>

        {/* Start */}
        <g>
          <rect x="212" y="60" width="88" height="34" rx="17" fill={C.green} fillOpacity={0.16} stroke={C.green} strokeOpacity={0.7} />
          <circle cx="232" cy="77" r="4" fill={C.green} />
          <text x="246" y="81" fontFamily="'JetBrains Mono', monospace" fontSize={12} fill={C.ink}>Start</text>
        </g>

        {/* Audit Core Orchestrator (hub) */}
        <AgentNode
          x={360}
          y={150}
          w={230}
          h={160}
          accent={C.phinite}
          title="Audit Core Orchestrator"
          mission={['## Mission', 'Orchestrate the complete', 'damage-claim workflow…']}
          chips={[
            { label: 'lookup_vendor_api', kind: 'api' },
            { label: 'image_input', kind: 'json' },
          ]}
        />

        {/* Vision Inspector Specialist */}
        <AgentNode
          x={760}
          y={70}
          w={252}
          h={128}
          accent={C.gmi}
          title="Vision Inspector Specialist"
          mission={['## Mission', 'Multimodal image analysis', 'for damage — GMI Cloud…']}
          chips={[{ label: 'image_input', kind: 'json' }]}
        />

        {/* Dispute Coordinator */}
        <AgentNode
          x={760}
          y={292}
          w={252}
          h={172}
          accent={C.amber}
          title="Dispute Coordinator"
          mission={['## Mission', 'Apply intelligent', 'conditional routing…']}
          chips={[
            { label: 'slack_webhook_api', kind: 'api' },
            { label: 'match_found', kind: 'json' },
            { label: 'damage_severity', kind: 'json' },
          ]}
        />

        {/* End */}
        <g>
          <rect x="930" y="450" width="78" height="32" rx="16" fill={C.amber} fillOpacity={0.14} stroke={C.amber} strokeOpacity={0.7} />
          <circle cx="950" cy="466" r="4" fill={C.amber} />
          <text x="964" y="470" fontFamily="'JetBrains Mono', monospace" fontSize={12} fill={C.ink}>End</text>
        </g>
      </svg>

      {/* Footer chrome */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2 font-mono text-[11px] text-ink-dim">
        <span>With Prompt · 53%</span>
        <span>Last Saved: 8:57 PM</span>
        <span>Triggers: 0</span>
        <span className="ml-auto flex items-center gap-1.5 text-green">
          <span className="h-1.5 w-1.5 rounded-full bg-green" />
          Connected
        </span>
      </div>
    </div>
  )
}
