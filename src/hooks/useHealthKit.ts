import { useCallback, useEffect, useRef, useState } from 'react'

import {
  getDailyCalories,
  getDailyFlightsClimbed,
  getDailySleepHours,
  getDailySteps,
  getDailyWaterLiters,
  getLatestHeartRate,
  getLatestHRV,
  getLatestRestingHeartRate,
  getRecentWorkouts,
  type HealthKitWorkout,
  initializeHealthKit,
  isHealthKitAvailable,
} from '@/lib/healthkit'

/** Deterministic seeded random so a specific date always shows the same demo data. */
function seededRand(seed: number, min: number, max: number): number {
  const x = Math.sin(seed++) * 10000
  const r = x - Math.floor(x)
  return Math.round(min + r * (max - min))
}

function generateMockData(date?: Date): {
  steps: number
  calories: number
  sleepHours: number
  heartRate: number
  hrv: number
  restingHeartRate: number
  waterLiters: number
  flightsClimbed: number
  workouts: HealthKitWorkout[]
} {
  const d = date ?? new Date()
  const morningStart = new Date(d)
  morningStart.setHours(7, 30, 0, 0)
  const morningEnd = new Date(d)
  morningEnd.setHours(8, 15, 0, 0)

  // Use date as seed for deterministic demo data; fall back to random for today
  const isToday =
    !date ||
    (d.getFullYear() === new Date().getFullYear() &&
      d.getMonth() === new Date().getMonth() &&
      d.getDate() === new Date().getDate())

  const seed = isToday
    ? Math.random() * 1000
    : d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()

  const rand = (min: number, max: number, offset = 0) =>
    isToday
      ? Math.round(min + Math.random() * (max - min))
      : seededRand(seed + offset, min, max)

  const steps = rand(3_000, 12_000, 1)
  const calories = rand(150, 800, 2)
  const sleepHours =
    Math.round(
      (isToday
        ? 4 + Math.random() * 5
        : 4 + (seededRand(seed + 3, 0, 100) / 100) * 5) * 10,
    ) / 10
  const heartRate = rand(58, 95, 4)
  const hrv = rand(20, 90, 5)
  const restingHeartRate = rand(48, 72, 6)
  const waterLiters =
    Math.round(
      (isToday
        ? 0.5 + Math.random() * 2.5
        : 0.5 + (seededRand(seed + 7, 0, 100) / 100) * 2.5) * 10,
    ) / 10
  const flightsClimbed = rand(0, 20, 8)

  return {
    steps,
    calories,
    sleepHours,
    heartRate,
    hrv,
    restingHeartRate,
    waterLiters,
    flightsClimbed,
    workouts: [
      {
        activityName: 'Running',
        calories: rand(180, 400, 9),
        distance:
          Math.round(
            (isToday
              ? 2 + Math.random() * 6
              : 2 + (seededRand(seed + 10, 0, 100) / 100) * 6) * 10,
          ) / 10,
        duration: rand(20, 60, 11),
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
  restingHeartRate: number
  waterLiters: number
  flightsClimbed: number
  workouts: HealthKitWorkout[]
}

export function useHealthKit(date?: Date) {
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
        restingHeartRate: 0,
        waterLiters: 0,
        flightsClimbed: 0,
        workouts: [],
      }
    }

    const mock = generateMockData(date)
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
      restingHeartRate: mock.restingHeartRate,
      waterLiters: mock.waterLiters,
      flightsClimbed: mock.flightsClimbed,
      workouts: mock.workouts,
    }
  })

  const fetchData = useCallback(
    async (fetchDate?: Date) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const target = fetchDate ?? date
        const [
          steps,
          calories,
          sleepHours,
          heartRate,
          hrv,
          restingHeartRate,
          waterLiters,
          flightsClimbed,
          workouts,
        ] = await Promise.all([
          getDailySteps(target),
          getDailyCalories(target),
          getDailySleepHours(target),
          getLatestHeartRate(),
          getLatestHRV(),
          getLatestRestingHeartRate(),
          getDailyWaterLiters(target),
          getDailyFlightsClimbed(target),
          getRecentWorkouts(7),
        ])

        setState((prev) => ({
          ...prev,
          steps,
          calories,
          sleepHours,
          heartRate,
          hrv,
          restingHeartRate,
          waterLiters,
          flightsClimbed,
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
    },
    [date],
  )

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
      const mock = generateMockData(date)
      setState((prev) => ({
        ...prev,
        steps: mock.steps,
        calories: mock.calories,
        sleepHours: mock.sleepHours,
        heartRate: mock.heartRate,
        hrv: mock.hrv,
        restingHeartRate: mock.restingHeartRate,
        waterLiters: mock.waterLiters,
        flightsClimbed: mock.flightsClimbed,
        workouts: mock.workouts,
      }))
      return
    }
    if (state.isAuthorized) {
      await fetchData()
    }
  }, [date, state.isAuthorized, state.isDemoMode, fetchData])

  // Re-fetch (or regenerate demo data) when `date` changes
  useEffect(() => {
    if (state.isDemoMode) {
      const mock = generateMockData(date)
      setState((prev) => ({
        ...prev,
        steps: mock.steps,
        calories: mock.calories,
        sleepHours: mock.sleepHours,
        heartRate: mock.heartRate,
        hrv: mock.hrv,
        restingHeartRate: mock.restingHeartRate,
        waterLiters: mock.waterLiters,
        flightsClimbed: mock.flightsClimbed,
        workouts: mock.workouts,
      }))
    } else if (state.isAuthorized) {
      fetchData()
    }
    // Only re-run when date changes (skip initial — handled by requestAuthorization / init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date?.toDateString()])

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
