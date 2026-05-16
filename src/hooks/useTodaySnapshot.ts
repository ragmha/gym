/**
 * Composing hook that provides the complete "today's view of the athlete"
 * as a single snapshot object.
 *
 * Merges three sources of truth:
 *   - `useReadiness`      — HRV / RHR / Sleep + recovery score
 *   - `useWeeklyTraining` — sessions, weekly volume, load chart, ACWR
 *   - `useTodaySuggestion`— today's recommended pillar (pure decision tree)
 *
 * Status composition rules:
 *   - 'loading' if EITHER underlying hook is loading.
 *   - 'error'   only if BOTH are error (one erroring while the other is ready
 *               is still useful — surface as 'ready').
 *   - 'ready'   otherwise.
 *
 * `refresh` calls `Promise.allSettled` on both underlying refreshes so a
 * failure in one never blocks the other.
 */

import { useCallback, useMemo } from 'react'

import type { ReadinessSummary } from './useReadiness'
import { useReadiness } from './useReadiness'
import type { TodaySuggestion } from './useTodaySuggestion'
import { useTodaySuggestion } from './useTodaySuggestion'
import type { WeeklyTrainingResult } from './useWeeklyTraining'
import { useWeeklyTraining } from './useWeeklyTraining'

export type TodaySnapshotStatus = 'loading' | 'ready' | 'error'

export interface TodaySnapshot {
  status: TodaySnapshotStatus
  /** Today's date, frozen at first mount. Stays stable across refreshes. */
  date: Date
  readiness: ReadinessSummary
  training: WeeklyTrainingResult
  suggestion: TodaySuggestion
  /** Convenience pass-through; same value as `readiness.recoveryScore`. */
  recoveryScore: number | null
  /** Refreshes both readiness and training in parallel. */
  refresh: () => Promise<void>
}

export function useTodaySnapshot(): TodaySnapshot {
  const readiness = useReadiness()
  const training = useWeeklyTraining()
  const suggestion = useTodaySuggestion(readiness, training.sessions)

  // Freeze the date at first mount; refresh does not shift the date.
  const date = useMemo(() => new Date(), [])

  const status: TodaySnapshotStatus = (() => {
    if (readiness.status === 'loading' || training.status === 'loading') {
      return 'loading'
    }
    if (readiness.status === 'error' && training.status === 'error') {
      return 'error'
    }
    return 'ready'
  })()

  const refresh = useCallback(async () => {
    await Promise.allSettled([readiness.refresh(), training.refresh()])
    // We intentionally depend on the stable `.refresh` function references
    // (each is wrapped in useCallback inside its hook) rather than the whole
    // `readiness` / `training` objects, which change on every metric update
    // and would needlessly re-create `refresh`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readiness.refresh, training.refresh])

  return {
    status,
    date,
    readiness,
    training,
    suggestion,
    recoveryScore: readiness.recoveryScore,
    refresh,
  }
}
