import type { ReactNode } from 'react'

export interface MonoLabelProps {
  children: ReactNode
  dim?: boolean
  className?: string
}

/**
 * A small monospace label used for data keys, metadata, and terminal-style
 * captions. Uses `text-ink-code` by default, switching to the dimmer
 * `text-ink-dim` when `dim` is set.
 */
export default function MonoLabel({ children, dim = false, className }: MonoLabelProps) {
  return (
    <span
      className={
        'font-mono text-xs ' + (dim ? 'text-ink-dim' : 'text-ink-code') + (className ? ' ' + className : '')
      }
    >
      {children}
    </span>
  )
}
