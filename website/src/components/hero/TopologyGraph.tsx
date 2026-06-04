import { motion } from 'framer-motion'

import { useReducedMotion } from '../../hooks/useReducedMotion'

export interface TopologyGraphProps {
  className?: string
}

/** A single agent in the pipeline, positioned by its node-box top-left corner. */
interface NodeSpec {
  x: number
  title: string
  sublabel: string
  accent: string
}

// Geometry for the 640x300 viewBox. Three evenly-spaced node boxes sit on a
// shared baseline; edges connect their facing sides at the vertical midline.
const NODE_W = 168
const NODE_H = 84
const NODE_Y = 108
const MID_Y = NODE_Y + NODE_H / 2

const NODES: NodeSpec[] = [
  { x: 16, title: 'Vision Inspector', sublabel: 'GMI · vision', accent: '#22CCEE' },
  { x: 236, title: 'Audit Core', sublabel: 'Phinite · audit', accent: '#8B7CF0' },
  { x: 456, title: 'Dispute Coordinator', sublabel: 'Phinite · Slack', accent: '#F5A623' },
]

const EDGE_COLOR = '#F5A623'

/** Smooth horizontal S-curve from the right edge of one node to the left of the next. */
function edgePath(fromIndex: number): string {
  const startX = NODES[fromIndex].x + NODE_W
  const endX = NODES[fromIndex + 1].x
  const cx = (startX + endX) / 2
  return `M ${startX} ${MID_Y} C ${cx} ${MID_Y}, ${cx} ${MID_Y}, ${endX} ${MID_Y}`
}

/**
 * The hero centerpiece: a three-agent pipeline rendered as an SVG topology
 * graph. Vision Inspector → Audit Core → Dispute Coordinator, connected by
 * amber edges that draw themselves on mount and then carry a gentle flowing
 * dash. With reduced motion the edges render fully drawn and static.
 */
export default function TopologyGraph({ className }: TopologyGraphProps) {
  const reducedMotion = useReducedMotion()

  return (
    <svg
      viewBox="0 0 640 300"
      width="100%"
      height="auto"
      role="img"
      aria-label="Three-agent pipeline: Vision Inspector to Audit Core to Dispute Coordinator"
      className={className}
    >
      <defs>
        {/* Faint grid that fades toward the edges, plus a soft amber bloom. */}
        <pattern id="topo-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#1E2230" strokeWidth="1" />
        </pattern>
        <radialGradient id="topo-fade" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <mask id="topo-grid-mask">
          <rect x="0" y="0" width="640" height="300" fill="url(#topo-fade)" />
        </mask>
        <radialGradient id="topo-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F5A623" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect
        x="0"
        y="0"
        width="640"
        height="300"
        fill="url(#topo-grid)"
        mask="url(#topo-grid-mask)"
        aria-hidden="true"
      />
      <ellipse cx="320" cy={MID_Y} rx="300" ry="120" fill="url(#topo-glow)" aria-hidden="true" />

      {/* Edges, drawn behind the nodes. */}
      <g fill="none" stroke={EDGE_COLOR} strokeWidth="1.5" strokeLinecap="round">
        {[0, 1].map((i) => {
          const d = edgePath(i)
          if (reducedMotion) {
            return <path key={`edge-${i}`} d={d} opacity={0.85} />
          }
          return (
            <g key={`edge-${i}`}>
              {/* Base stroke draws itself in on mount. */}
              <motion.path
                d={d}
                opacity={0.45}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, delay: 0.2 + i * 0.45, ease: 'easeInOut' }}
              />
              {/* Flowing dash overlay, revealed after the line finishes drawing. */}
              <motion.path
                d={d}
                strokeDasharray="6 18"
                className="animate-flow"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.9 }}
                transition={{ duration: 0.6, delay: 1.4 + i * 0.45 }}
              />
            </g>
          )
        })}
      </g>

      {/* Nodes. */}
      {NODES.map((node) => {
        const cx = node.x + NODE_W / 2
        return (
          <g key={node.title}>
            <rect
              x={node.x}
              y={NODE_Y}
              width={NODE_W}
              height={NODE_H}
              rx={10}
              fill="#111318"
              stroke={node.accent}
              strokeWidth="1.5"
            />
            {/* Status dot. */}
            <circle cx={node.x + 18} cy={NODE_Y + 22} r={4} fill={node.accent} />
            <circle cx={node.x + 18} cy={NODE_Y + 22} r={7} fill="none" stroke={node.accent} strokeOpacity={0.3} />
            <text
              x={cx}
              y={NODE_Y + 26}
              textAnchor="middle"
              fontFamily='"JetBrains Mono", monospace'
              fontSize="13"
              fontWeight="500"
              fill="#E8EAF0"
            >
              {node.title}
            </text>
            <text
              x={cx}
              y={NODE_Y + 50}
              textAnchor="middle"
              fontFamily='"JetBrains Mono", monospace'
              fontSize="10"
              fill="#8B92A8"
            >
              {node.sublabel}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
