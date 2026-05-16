import { useEffect } from 'react'
import { Platform } from 'react-native'

import { buildTodaySnapshot, pushTodaySnapshot } from '@/lib/widgetSnapshot'
import {
  completedSetCount,
  useWorkoutSessionStoreBase,
} from '@/stores/WorkoutSessionStore'
import { useStepsStoreBase } from '@/stores/StepsStore'

function calculateWorkoutXpAndLastWorkoutAt(
  sessions: ReturnType<typeof useWorkoutSessionStoreBase.getState>['sessions'],
): { workoutXp: number; lastWorkoutAt: string | null } {
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
  const isSameLocalDay = (iso: string | null) => {
    if (!iso) return false
    const date = new Date(iso)
    return (
      `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` === todayKey
    )
  }

  const allSessions = Object.values(sessions)
  let workoutXp = 0
  let latestCompletedAt: string | null = null

  for (const session of allSessions) {
    if (
      !(
        isSameLocalDay(session.completedAt) || isSameLocalDay(session.startedAt)
      )
    ) {
      continue
    }

    workoutXp += completedSetCount(session) * 10

    if (
      session.completedAt &&
      (!latestCompletedAt ||
        new Date(session.completedAt).getTime() >
          new Date(latestCompletedAt).getTime())
    ) {
      latestCompletedAt = session.completedAt
    }
  }

  return { workoutXp, lastWorkoutAt: latestCompletedAt }
}

export function useWidgetSync(): void {
  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return
    }

    let timeoutRef: ReturnType<typeof setTimeout> | null = null

    const syncNow = () => {
      const { steps, stepsGoal } = useStepsStoreBase.getState()
      const { sessions } = useWorkoutSessionStoreBase.getState()
      const { workoutXp, lastWorkoutAt } =
        calculateWorkoutXpAndLastWorkoutAt(sessions)

      pushTodaySnapshot(
        buildTodaySnapshot(steps, stepsGoal, workoutXp, lastWorkoutAt),
      )
    }

    const scheduleSync = () => {
      if (timeoutRef) clearTimeout(timeoutRef)
      timeoutRef = setTimeout(syncNow, 250)
    }

    const unsubscribeSteps = useStepsStoreBase.subscribe(scheduleSync)
    const unsubscribeWorkout =
      useWorkoutSessionStoreBase.subscribe(scheduleSync)

    scheduleSync()

    return () => {
      if (timeoutRef) clearTimeout(timeoutRef)
      unsubscribeSteps()
      unsubscribeWorkout()
    }
  }, [])
}
