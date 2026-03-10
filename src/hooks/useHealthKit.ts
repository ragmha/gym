import { useCallback, useEffect, useRef, useState } from 'react'

import {
  getDailyCalories,
  getDailySleepHours,
  getDailySteps,
  getDailyWaterLiters,
  getLatestHeartRate,
  getLatestHRV,
  getRecentWorkouts,
  type HealthKitWorkout,
  initializeHealthKit,
  isHealthKitAvailable,
} from '@/lib/healthkit'

function generateMockData(): {
  steps: number
  calories: number
  sleepHours: number
  heartRate: number
  hrv: number
  waterLiters: number
  workouts: HealthKitWorkout[]
} {
  const today = new Date()
  const morningStart = new Date(today)
  morningStart.setHours(7, 30, 0, 0)
  const morningEnd = new Date(today)
  morningEnd.setHours(8, 15, 0, 0)

  // Randomize so refreshes show different data in demo mode
  const rand = (min: number, max: number) =>
    Math.round(min + Math.random() * (max - min))

  const steps = rand(3_000, 12_000)
  const calories = rand(150, 800)
  const sleepHours = Math.round((4 + Math.random() * 5) * 10) / 10 // 4.0–9.0
  const heartRate = rand(58, 95)
  const hrv = rand(20, 90)
  const waterLiters = Math.round((0.5 + Math.random() * 2.5) * 10) / 10 // 0.5–3.0

  return {
    steps,
    calories,
    sleepHours,
    heartRate,
    hrv,
    waterLiters,
    workouts: [
      {
        activityName: 'Running',
        calories: rand(180, 400),
        distance: Math.round((2 + Math.random() * 6) * 10) / 10,
        duration: rand(20, 60),
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
  sleepHours: number
  heartRate: number
  hrv: number
  waterLiters: number
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
        sleepHours: 0,
        heartRate: 0,
        hrv: 0,
        waterLiters: 0,
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
      sleepHours: mock.sleepHours,
      heartRate: mock.heartRate,
      hrv: mock.hrv,
      waterLiters: mock.waterLiters,
      workouts: mock.workouts,
    }
  })

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const [
        steps,
        calories,
        sleepHours,
        heartRate,
        hrv,
        waterLiters,
        workouts,
      ] = await Promise.all([
        getDailySteps(),
        getDailyCalories(),
        getDailySleepHours(),
        getLatestHeartRate(),
        getLatestHRV(),
        getDailyWaterLiters(),
        getRecentWorkouts(7),
      ])

      setState((prev) => ({
        ...prev,
        steps,
        calories,
        sleepHours,
        heartRate,
        hrv,
        waterLiters,
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
        sleepHours: mock.sleepHours,
        heartRate: mock.heartRate,
        hrv: mock.hrv,
        waterLiters: mock.waterLiters,
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
