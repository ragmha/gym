import { useCallback, useEffect, useRef, useState } from 'react'

import {
  getDailyCalories,
  getDailySteps,
  getRecentWorkouts,
  type HealthKitWorkout,
  initializeHealthKit,
  isHealthKitAvailable,
} from '@/lib/healthkit'

interface HealthKitState {
  isAvailable: boolean
  isAuthorized: boolean
  isLoading: boolean
  error: string | null
  steps: number
  calories: number
  workouts: HealthKitWorkout[]
}

export function useHealthKit() {
  const hasInitialized = useRef(false)
  const [state, setState] = useState<HealthKitState>({
    isAvailable: isHealthKitAvailable(),
    isAuthorized: false,
    isLoading: false,
    error: null,
    steps: 0,
    calories: 0,
    workouts: [],
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
    if (state.isAuthorized) {
      await fetchData()
    }
  }, [state.isAuthorized, fetchData])

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
