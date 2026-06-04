import { AnimatePresence, motion } from 'framer-motion'

import TerminalBadge from '../primitives/TerminalBadge'
import MonoLabel from '../primitives/MonoLabel'
import { useReducedMotion } from '../../hooks/useReducedMotion'

export type StageAccent = 'gmi' | 'phinite' | 'amber'
export type StageStatus = 'idle' | 'running' | 'done'
export type FieldTone = 'default' | 'good' | 'bad' | 'warn'

export interface StageField {
  label: string
  value: string
  tone?: FieldTone
}

export interface StageBadge {
  severity: 'HIGH' | 'LOW' | 'OK' | 'ERR' | 'PENDING'
  text?: string
}

export interface PipelineStageProps {
  /** Zero-based position; rendered as a mono index like "A1". */
  index: number
  name: string
  tech: string
  accent: StageAccent
  status: StageStatus
  /** The agent's revealed output, or null while it has not produced one yet. */
  fields: StageField[] | null
  badge?: StageBadge | null
}

/** Map an accent token to the node's left border color. */
const ACCENT_BORDER: Record<StageAccent, string> = {
  gmi: 'border-l-gmi',
  phinite: 'border-l-phinite',
  amber: 'border-l-amber',
}

/** Map the running/done/idle status to the right-aligned status dot. */
const STATUS_DOT: Record<StageStatus, string> = {
  idle: 'bg-ink-dim',
  running: 'bg-amber animate-pulse-amber',
  done: 'bg-green',
}

/** Map a field tone to its value color. */
const TONE_TEXT: Record<FieldTone, string> = {
  default: 'text-ink-code',
  good: 'text-green',
  bad: 'text-red',
  warn: 'text-amber',
}

const CONTAINER_VARIANTS = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.06 } },
}

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 4 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
}

/**
 * One agent in the pipeline: a labeled header (mono index, name, tech
 * sublabel, status dot) over an output card. The card shows "awaiting input"
 * while idle, a shimmering "processing…" line while running, and the agent's
 * fields — staggered in — once they arrive. An optional terminal badge marks
 * the stage's verdict. Honors reduced motion by rendering fields immediately.
 */
export default function PipelineStage({
  index,
  name,
  tech,
  accent,
  status,
  fields,
  badge,
}: PipelineStageProps) {
  const reducedMotion = useReducedMotion()
  const indexLabel = 'A' + String(index + 1)
  const hasFields = fields !== null && fields.length > 0

  return (
    <div className={'rounded-lg border border-border border-l-2 bg-surface/60 p-4 ' + ACCENT_BORDER[accent]}>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs font-semibold tracking-widest text-ink-dim">{indexLabel}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-sm text-ink">{name}</div>
          <MonoLabel dim>{tech}</MonoLabel>
        </div>
        <span
          aria-hidden="true"
          className={'inline-block h-2.5 w-2.5 shrink-0 rounded-full ' + STATUS_DOT[status]}
        />
      </div>

      <div className="mt-3 rounded border border-border bg-surface-2 p-3 font-mono text-xs">
        <AnimatePresence mode="wait" initial={false}>
          {hasFields ? (
            <motion.dl
              key="fields"
              className="space-y-1.5"
              variants={CONTAINER_VARIANTS}
              initial={reducedMotion ? false : 'hidden'}
              animate="shown"
            >
              {fields.map((field) => (
                <motion.div
                  key={field.label}
                  className="flex items-baseline justify-between gap-3"
                  variants={reducedMotion ? undefined : ITEM_VARIANTS}
                >
                  <dt className="shrink-0 text-ink-dim">{field.label}:</dt>
                  <dd className={'truncate text-right ' + TONE_TEXT[field.tone ?? 'default']}>
                    {field.value}
                  </dd>
                </motion.div>
              ))}
              {badge ? (
                <motion.div
                  key="badge"
                  className="pt-1"
                  variants={reducedMotion ? undefined : ITEM_VARIANTS}
                >
                  <TerminalBadge severity={badge.severity}>{badge.text}</TerminalBadge>
                </motion.div>
              ) : null}
            </motion.dl>
          ) : status === 'running' ? (
            <motion.div
              key="processing"
              className="animate-pulse-amber text-amber"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              processing…
            </motion.div>
          ) : (
            <motion.div
              key="awaiting"
              className="text-ink-dim/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              awaiting input
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
