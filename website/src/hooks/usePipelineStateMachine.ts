import { useCallback, useEffect, useRef, useState } from 'react'

import type { Scenario, VisionOutput, AuditOutput, DispatchOutput } from '../data/scenarios'

/**
 * Headless state machine that drives the VisionOps "simulated live pipeline".
 *
 * A single package photo is processed by three agents in sequence, and each
 * agent's output is revealed on a staged delay taken verbatim from the passed
 * scenario. The machine is identical for every run (run1 vs run2 differ ONLY
 * by their data), so this hook contains no scenario-specific branching.
 *
 * Lifecycle: idle -> inspecting -> auditing -> dispatching -> done.
 */

export type PipelineState = 'idle' | 'inspecting' | 'auditing' | 'dispatching' | 'done'

export interface PipelineSnapshot {
  state: PipelineState
  vision: VisionOutput | null
  audit: AuditOutput | null
  dispatch: DispatchOutput | null
  elapsedMs: number
}

export interface PipelineController {
  snapshot: PipelineSnapshot
  /** True while the pipeline is actively running (not idle, not done). */
  isRunning: boolean
  play: () => void
  reset: () => void
}

const IDLE_SNAPSHOT: PipelineSnapshot = {
  state: 'idle',
  vision: null,
  audit: null,
  dispatch: null,
  elapsedMs: 0,
}

/**
 * Drive a staged, three-agent reveal for the given scenario.
 *
 * Behavioral contract:
 * - Initial render / `reset()`: snapshot is the idle baseline and every pending
 *   timer / animation frame is cleared.
 * - `play()` while idle: transitions to `inspecting` immediately and starts a
 *   `requestAnimationFrame` ticker that updates `elapsedMs` from the start
 *   moment. Vision output is revealed after `inspectMs`, audit after a further
 *   `auditMs`, dispatch after a further `dispatchMs`; on the final reveal the
 *   state becomes `done` and `elapsedMs` is FROZEN at the total run duration
 *   (the ticker stops).
 * - `play()` while already running (`inspecting` / `auditing` / `dispatching`):
 *   no-op.
 * - `play()` while `done`: RESTART — the snapshot is reset to idle and a fresh
 *   run begins immediately.
 * - When `scenario.id` changes, the machine resets automatically.
 *
 * All state updates are guarded against firing after unmount, and all timers /
 * frames are cleaned up on reset and on unmount.
 */
export function usePipelineStateMachine(scenario: Scenario): PipelineController {
  const [snapshot, setSnapshot] = useState<PipelineSnapshot>(IDLE_SNAPSHOT)

  // Handles for the staged-reveal timeouts so `reset` can clear them all.
  const timerIdsRef = useRef<number[]>([])
  // Handle for the elapsed-time animation frame loop.
  const rafIdRef = useRef<number | null>(null)
  // Wall-clock start of the current run, used to derive `elapsedMs`.
  const startMsRef = useRef<number>(0)
  // Total run duration; the ticker clamps to this and `done` freezes here.
  const totalMsRef = useRef<number>(0)
  // Guards against state updates after unmount.
  const mountedRef = useRef<boolean>(true)
  // Latest scenario, read inside `play` without making `play` identity churn.
  const scenarioRef = useRef<Scenario>(scenario)

  scenarioRef.current = scenario

  /** Cancel every pending reveal timeout and the elapsed-time frame loop. */
  const clearTimers = useCallback((): void => {
    for (const id of timerIdsRef.current) {
      window.clearTimeout(id)
    }
    timerIdsRef.current = []
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }, [])

  const reset = useCallback((): void => {
    clearTimers()
    if (mountedRef.current) {
      setSnapshot(IDLE_SNAPSHOT)
    }
  }, [clearTimers])

  const play = useCallback((): void => {
    setSnapshot((prev) => {
      // Ignore play() while a run is in flight.
      if (prev.state === 'inspecting' || prev.state === 'auditing' || prev.state === 'dispatching') {
        return prev
      }

      // Fresh start (from idle or as a restart from done): clear any leftover
      // handles, then schedule the staged reveals for the current scenario.
      clearTimers()

      const active = scenarioRef.current
      const { inspectMs, auditMs, dispatchMs } = active.timings
      const total = inspectMs + auditMs + dispatchMs

      startMsRef.current = Date.now()
      totalMsRef.current = total

      // Elapsed-time ticker. Runs frame-aligned and clamps to the total so the
      // displayed value never overshoots the final freeze value.
      const tick = (): void => {
        if (!mountedRef.current) {
          return
        }
        const elapsed = Math.min(Date.now() - startMsRef.current, totalMsRef.current)
        setSnapshot((curr) => {
          // Once done (or reset to idle), stop updating elapsed from the ticker.
          if (curr.state === 'done' || curr.state === 'idle') {
            return curr
          }
          if (curr.elapsedMs === elapsed) {
            return curr
          }
          return { ...curr, elapsedMs: elapsed }
        })
        rafIdRef.current = requestAnimationFrame(tick)
      }
      rafIdRef.current = requestAnimationFrame(tick)

      // Reveal vision output, advance to auditing.
      timerIdsRef.current.push(
        window.setTimeout(() => {
          if (!mountedRef.current) {
            return
          }
          setSnapshot((curr) => ({ ...curr, state: 'auditing', vision: active.vision }))
        }, inspectMs),
      )

      // Reveal audit output, advance to dispatching.
      timerIdsRef.current.push(
        window.setTimeout(() => {
          if (!mountedRef.current) {
            return
          }
          setSnapshot((curr) => ({ ...curr, state: 'dispatching', audit: active.audit }))
        }, inspectMs + auditMs),
      )

      // Reveal dispatch output, finish, and freeze elapsed at the total.
      timerIdsRef.current.push(
        window.setTimeout(() => {
          if (!mountedRef.current) {
            return
          }
          clearTimers()
          setSnapshot((curr) => ({
            ...curr,
            state: 'done',
            dispatch: active.dispatch,
            elapsedMs: totalMsRef.current,
          }))
        }, total),
      )

      // Enter the running state immediately.
      return {
        state: 'inspecting',
        vision: null,
        audit: null,
        dispatch: null,
        elapsedMs: 0,
      }
    })
  }, [clearTimers])

  // Reset whenever the scenario identity changes (and on first mount).
  useEffect(() => {
    reset()
    // `reset` is stable; we intentionally re-run only on scenario change.
  }, [scenario.id, reset])

  // Track mount status and tear down all timers / frames on unmount.
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimers()
    }
  }, [clearTimers])

  const isRunning = snapshot.state !== 'idle' && snapshot.state !== 'done'

  return { snapshot, isRunning, play, reset }
}

export default usePipelineStateMachine
