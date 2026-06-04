import type { ReactNode } from 'react'

export type BadgeSeverity = 'HIGH' | 'LOW' | 'OK' | 'ERR' | 'PENDING'

export interface TerminalBadgeProps {
  severity: BadgeSeverity
  children?: ReactNode
  className?: string
}

const SEVERITY_STYLES: Record<BadgeSeverity, { chip: string; dot: string }> = {
  HIGH: { chip: 'text-amber bg-amber-dim border-amber/60', dot: 'bg-amber' },
  ERR: { chip: 'text-red bg-red-dim border-red/60', dot: 'bg-red' },
  LOW: { chip: 'text-green bg-green-dim border-green/60', dot: 'bg-green' },
  OK: { chip: 'text-green bg-green-dim border-green/60', dot: 'bg-green' },
  PENDING: { chip: 'text-ink-dim bg-transparent border-border', dot: 'bg-ink-dim' },
}

/**
 * A compact monospace status chip with a leading status dot. Used to mark
 * severity / outcome states in terminal-style panels (escalate, file, error,
 * pending). Announced to assistive tech via `role="status"`.
 */
export default function TerminalBadge({ severity, children, className }: TerminalBadgeProps) {
  const styles = SEVERITY_STYLES[severity]

  return (
    <span
      role="status"
      className={
        'font-mono text-[11px] uppercase tracking-widest px-2 py-0.5 rounded-sm border inline-flex items-center gap-1.5 ' +
        styles.chip +
        (className ? ' ' + className : '')
      }
    >
      <span aria-hidden="true" className={'inline-block h-1.5 w-1.5 rounded-full ' + styles.dot} />
      {children ?? severity}
    </span>
  )
}
