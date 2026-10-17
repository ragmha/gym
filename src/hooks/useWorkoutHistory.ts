import { useEffect, useState } from 'react'

import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import type {
  DailyHealthSnapshot,
  DailyWorkouts,
} from '@/lib/healthSnapshot/types'

/**
 * Workouts for the `days` days ending on `date`, oldest first; null while
 * loading or on failure. Rereads whenever `refreshKey` changes so history
 * stays in step with a live `useHealthSnapshot` for the same day.
 */
export function useWorkoutHistory(
  date: Date,
  days: number,
  refreshSnapshot: DailyHealthSnapshot | null,
): DailyWorkouts[] | null {
  const key = localDateKey(date)
  const [state, setState] = useState<{
    key: string
    history: DailyWorkouts[] | null
  }>({ key: '', history: null })

  useEffect(() => {
    let active = true
    healthSnapshot
      .getWorkoutHistory(new Date(`${key}T12:00:00`), days)
      .then((history) => {
        if (active) setState({ key, history })
      })
      .catch(() => {
        if (active) setState({ key, history: null })
      })
    return () => {
      active = false
    }
  }, [key, days, refreshSnapshot])

  return state.key === key ? state.history : null
}
