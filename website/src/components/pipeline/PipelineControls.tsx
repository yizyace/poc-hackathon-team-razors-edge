import type { PipelineState } from '../../hooks/usePipelineStateMachine'

import TerminalBadge from '../primitives/TerminalBadge'

export interface PipelineControlsProps {
  state: PipelineState
  isRunning: boolean
  onPlay: () => void
  onReset: () => void
}

const BUTTON_CLASS =
  'border border-amber text-amber hover:bg-amber-dim disabled:opacity-50 disabled:hover:bg-transparent ' +
  'font-mono uppercase tracking-widest px-4 py-2 rounded-sm transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/70'

/**
 * Terminal-style run controls. Idle shows a "RUN PIPELINE" button; while
 * running the button is disabled and reads "RUNNING" with a blinking caret;
 * once complete a green "COMPLETE" tag appears alongside a "RESET" text button
 * that restarts the run. No emoji — the ">" prefix stands in for a glyph.
 */
export default function PipelineControls({ state, isRunning, onPlay, onReset }: PipelineControlsProps) {
  if (state === 'done') {
    return (
      <div className="flex items-center gap-4">
        <TerminalBadge severity="OK">Complete</TerminalBadge>
        <button
          type="button"
          onClick={onReset}
          className="font-mono text-xs uppercase tracking-widest text-ink-dim underline-offset-4 transition-colors hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/70"
        >
          Reset
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={onPlay} disabled={isRunning} className={BUTTON_CLASS}>
        {isRunning ? (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true">&gt;</span>
            Running
            <span aria-hidden="true" className="animate-blink">
              _
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true">&gt;</span>
            Run Pipeline
          </span>
        )}
      </button>
    </div>
  )
}
