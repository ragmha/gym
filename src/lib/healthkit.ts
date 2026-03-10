import {
  getMostRecentQuantitySample,
  isHealthDataAvailable,
  queryCategorySamples,
  queryQuantitySamples,
  queryWorkoutSamples,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit'
import { Platform } from 'react-native'

export interface HealthKitWorkout {
  activityName: string
  calories: number
  distance: number
  duration: number // minutes
  start: string
  end: string
}

const READ_PERMISSIONS = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierHeartRate',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKQuantityTypeIdentifierDietaryWater',
  'HKQuantityTypeIdentifierFlightsClimbed',
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKWorkoutTypeIdentifier',
] as const

export function isHealthKitAvailable(): boolean {
  return Platform.OS === 'ios'
}

export async function initializeHealthKit(): Promise<boolean> {
  if (!isHealthKitAvailable()) return false

  try {
    const available = await isHealthDataAvailable()
    if (!available) return false

    await requestAuthorization({ toRead: [...READ_PERMISSIONS] })
    return true
  } catch (err) {
    console.warn('[HealthKit] Authorization error:', err)
    return false
  }
}

export async function getDailySteps(date?: Date): Promise<number> {
  if (!isHealthKitAvailable()) return 0

  try {
    const d = date ?? new Date()
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    const samples = await queryQuantitySamples(
      'HKQuantityTypeIdentifierStepCount',
      {
        limit: 0,
        filter: { date: { startDate: startOfDay, endDate: d } },
      },
    )

    return Math.round(samples.reduce((sum, s) => sum + s.quantity, 0))
  } catch (err) {
    console.warn('[HealthKit] Steps error:', err)
    return 0
  }
}

/** Fetch steps for each day in a range. Returns { date: string, steps: number }[] */
export async function getStepsHistory(
  daysBack: number,
): Promise<{ date: string; steps: number }[]> {
  const today = new Date()
  const results: { date: string; steps: number }[] = []

  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const steps = await getDailySteps(d)
    results.push({
      date: d.toISOString().slice(0, 10),
      steps,
    })
  }

  return results
}

export async function getDailyFlightsClimbed(date?: Date): Promise<number> {
  if (!isHealthKitAvailable()) return 0

  try {
    const d = date ?? new Date()
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    const samples = await queryQuantitySamples(
      'HKQuantityTypeIdentifierFlightsClimbed',
      {
        limit: 0,
        filter: { date: { startDate: startOfDay, endDate: d } },
      },
    )

    return Math.round(samples.reduce((sum, s) => sum + s.quantity, 0))
  } catch (err) {
    console.warn('[HealthKit] Flights climbed error:', err)
    return 0
  }
}

/** Fetch flights climbed for each day in a range. */
export async function getFlightsHistory(
  daysBack: number,
): Promise<{ date: string; flights: number }[]> {
  const today = new Date()
  const results: { date: string; flights: number }[] = []

  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const flights = await getDailyFlightsClimbed(d)
    results.push({
      date: d.toISOString().slice(0, 10),
      flights,
    })
  }

  return results
}

export async function getDailyCalories(date?: Date): Promise<number> {
  if (!isHealthKitAvailable()) return 0

  try {
    const d = date ?? new Date()
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    const samples = await queryQuantitySamples(
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      {
        limit: 0,
        filter: { date: { startDate: startOfDay, endDate: d } },
      },
    )

    return Math.round(samples.reduce((sum, s) => sum + s.quantity, 0))
  } catch (err) {
    console.warn('[HealthKit] Calories error:', err)
    return 0
  }
}

export async function getLatestHeartRate(): Promise<number> {
  if (!isHealthKitAvailable()) return 0

  try {
    const sample = await getMostRecentQuantitySample(
      'HKQuantityTypeIdentifierHeartRate',
    )
    return Math.round(sample?.quantity ?? 0)
  } catch (err) {
    console.warn('[HealthKit] Heart rate error:', err)
    return 0
  }
}

export async function getLatestHRV(): Promise<number> {
  if (!isHealthKitAvailable()) return 0

  try {
    const sample = await getMostRecentQuantitySample(
      'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
    )
    return Math.round(sample?.quantity ?? 0)
  } catch (err) {
    console.warn('[HealthKit] HRV error:', err)
    return 0
  }
}

export async function getLatestRestingHeartRate(): Promise<number> {
  if (!isHealthKitAvailable()) return 0

  try {
    const sample = await getMostRecentQuantitySample(
      'HKQuantityTypeIdentifierRestingHeartRate',
    )
    return Math.round(sample?.quantity ?? 0)
  } catch (err) {
    console.warn('[HealthKit] Resting HR error:', err)
    return 0
  }
}

export async function getDailySleepHours(date?: Date): Promise<number> {
  if (!isHealthKitAvailable()) return 0

  try {
    const d = date ?? new Date()
    const from = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 20)

    const samples = await queryCategorySamples(
      'HKCategoryTypeIdentifierSleepAnalysis',
      {
        limit: 0,
        filter: { date: { startDate: from, endDate: d } },
      },
    )

    const totalMinutes = samples.reduce((sum, sample) => {
      const start = new Date(sample.startDate).getTime()
      const end = new Date(sample.endDate).getTime()
      return sum + (end - start) / 60_000
    }, 0)

    return Math.round((totalMinutes / 60) * 10) / 10
  } catch (err) {
    console.warn('[HealthKit] Sleep error:', err)
    return 0
  }
}

export async function getDailyWaterLiters(date?: Date): Promise<number> {
  if (!isHealthKitAvailable()) return 0

  try {
    const d = date ?? new Date()
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    const samples = await queryQuantitySamples(
      'HKQuantityTypeIdentifierDietaryWater',
      {
        limit: 0,
        filter: { date: { startDate: startOfDay, endDate: d } },
      },
    )

    return Math.round(samples.reduce((sum, s) => sum + s.quantity, 0) * 10) / 10
  } catch (err) {
    console.warn('[HealthKit] Water error:', err)
    return 0
  }
}

/**
 * Return a Map of ISO date strings → total step count for each day.
 * Days with a logged workout get a bonus of 5 000 steps to boost intensity.
 * Two bulk HealthKit queries cover the entire range.
 */
export async function getActivityIntensity(
  daysBack: number,
): Promise<Map<string, number>> {
  if (!isHealthKitAvailable()) return new Map()

  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - daysBack)

  const stepsByDay = new Map<string, number>()

  try {
    const stepSamples = await queryQuantitySamples(
      'HKQuantityTypeIdentifierStepCount',
      {
        limit: 0,
        filter: { date: { startDate: from, endDate: to } },
      },
    )
    for (const s of stepSamples) {
      const day = new Date(s.startDate).toISOString().slice(0, 10)
      stepsByDay.set(day, (stepsByDay.get(day) ?? 0) + s.quantity)
    }
  } catch (err) {
    console.warn('[HealthKit] Activity-intensity steps error:', err)
  }

  try {
    const workoutSamples = await queryWorkoutSamples({
      limit: 0,
      filter: { date: { startDate: from, endDate: to } },
    })
    for (const w of workoutSamples) {
      const day = new Date(w.startDate).toISOString().slice(0, 10)
      stepsByDay.set(day, (stepsByDay.get(day) ?? 0) + 5_000)
    }
  } catch (err) {
    console.warn('[HealthKit] Activity-intensity workouts error:', err)
  }

  return stepsByDay
}

export async function getRecentWorkouts(
  daysBack: number = 7,
): Promise<HealthKitWorkout[]> {
  if (!isHealthKitAvailable()) return []

  try {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - daysBack)

    const samples = await queryWorkoutSamples({
      limit: 0,
      filter: { date: { startDate: from, endDate: to } },
    })

    return samples.map((w) => ({
      activityName: String(w.workoutActivityType ?? 'Unknown'),
      calories: w.totalEnergyBurned?.quantity ?? 0,
      distance: w.totalDistance?.quantity ?? 0,
      duration:
        (new Date(w.endDate).getTime() - new Date(w.startDate).getTime()) /
        60_000,
      start: String(w.startDate),
      end: String(w.endDate),
    }))
  } catch (err) {
    console.warn('[HealthKit] Workouts error:', err)
    return []
  }
}
