import { useCallback, useEffect, useRef, useState } from 'react'

import {
  getDailyCalories,
  getDailySteps,
  getRecentWorkouts,
  type HealthKitWorkout,
  initializeHealthKit,
  isHealthKitAvailable,
} from '@/lib/healthkit'

function generateMockData(): {
  steps: number
  calories: number
  workouts: HealthKitWorkout[]
} {
  const today = new Date()
  const morningStart = new Date(today)
  morningStart.setHours(7, 30, 0, 0)
  const morningEnd = new Date(today)
  morningEnd.setHours(8, 15, 0, 0)

  return {
    steps: 6_543,
    calories: 320,
    workouts: [
      {
        activityName: 'Running',
        calories: 280,
        distance: 4.2,
        duration: 45,
        start: morningStart.toISOString(),
        end: morningEnd.toISOString(),
      },
    ],
  }
}

interface HealthKitState {
  isAvailable: boolean
  isAuthorized: boolean
  isDemoMode: boolean
  isLoading: boolean
  error: string | null
  steps: number
  calories: number
  workouts: HealthKitWorkout[]
}

export function useHealthKit() {
  const hasInitialized = useRef(false)
  const healthKitAvailable = isHealthKitAvailable()

  const [state, setState] = useState<HealthKitState>(() => {
    if (healthKitAvailable) {
      return {
        isAvailable: true,
        isAuthorized: false,
        isDemoMode: false,
        isLoading: false,
        error: null,
        steps: 0,
        calories: 0,
        workouts: [],
      }
    }

    // Provide mock data when HealthKit is unavailable (web, Android, Expo Go)
    const mock = generateMockData()
    return {
      isAvailable: false,
      isAuthorized: true,
      isDemoMode: true,
      isLoading: false,
      error: null,
      steps: mock.steps,
      calories: mock.calories,
      workouts: mock.workouts,
    }
  })

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const [steps, calories, workouts] = await Promise.all([
        getDailySteps(),
        getDailyCalories(),
        getRecentWorkouts(7),
      ])

      setState((prev) => ({
        ...prev,
        steps,
        calories,
        workouts,
        isLoading: false,
      }))
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          err instanceof Error ? err.message : 'Failed to fetch health data',
      }))
    }
  }, [])

  const requestAuthorization = useCallback(async () => {
    if (!isHealthKitAvailable()) return false

    setState((prev) => ({ ...prev, isLoading: true }))
    const success = await initializeHealthKit()

    setState((prev) => ({
      ...prev,
      isAuthorized: success,
      isLoading: false,
      error: success ? null : 'HealthKit authorization failed',
    }))

    if (success) {
      await fetchData()
    }

    return success
  }, [fetchData])

  const refresh = useCallback(async () => {
    if (state.isDemoMode) {
      // Refresh mock data
      const mock = generateMockData()
      setState((prev) => ({
        ...prev,
        steps: mock.steps,
        calories: mock.calories,
        workouts: mock.workouts,
      }))
      return
    }
    if (state.isAuthorized) {
      await fetchData()
    }
  }, [state.isAuthorized, state.isDemoMode, fetchData])

  // Auto-initialize on mount if available
  useEffect(() => {
    if (isHealthKitAvailable() && !hasInitialized.current) {
      hasInitialized.current = true
      requestAuthorization()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    ...state,
    requestAuthorization,
    refresh,
  }
}
