import {
  getMostRecentQuantitySample,
  isHealthDataAvailable,
  queryCategorySamples,
  queryQuantitySamples,
  queryWorkoutSamples,
  requestAuthorization,
  saveWorkoutSample,
} from '@kingstinct/react-native-healthkit'
import { WorkoutActivityType } from '@kingstinct/react-native-healthkit/types'
import { Platform } from 'react-native'

import { classifyHealthKitActivity } from '@/lib/training/pillars'

import type {
  DailyHealthSnapshot,
  HealthSnapshotSource,
  HealthWorkout,
  IntensityMap,
  SaveCardioWorkoutParams,
} from './types'

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

const WRITE_PERMISSIONS = [
  'HKWorkoutTypeIdentifier',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
] as const

const ASLEEP_SLEEP_VALUES = new Set([1, 3, 4, 5])

interface QuantityLike {
  quantity?: number
  startDate?: Date | string
}

interface DateRangeLike {
  startDate: Date | string
  endDate: Date | string
}

interface CategoryLike extends DateRangeLike {
  value?: number
}

interface WorkoutLike extends DateRangeLike {
  workoutActivityType?: unknown
  totalEnergyBurned?: { quantity?: number }
  totalDistance?: { quantity?: number; unit?: string }
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function dayWindow(date: Date): { startDate: Date; endDate: Date } {
  const startDate = new Date(date)
  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 1)

  const now = new Date()
  return { startDate, endDate: endDate > now ? now : endDate }
}

function sleepWindow(date: Date): { startDate: Date; endDate: Date } {
  const { startDate: dayStart } = dayWindow(date)
  const startDate = new Date(dayStart)
  startDate.setDate(startDate.getDate() - 1)
  startDate.setHours(18, 0, 0, 0)

  const endDate = new Date(dayStart)
  endDate.setHours(12, 0, 0, 0)
  return { startDate, endDate }
}

function rangeWindow(daysBack: number): { startDate: Date; endDate: Date } {
  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - daysBack)
  startDate.setHours(0, 0, 0, 0)
  return { startDate, endDate }
}

function roundInt(value: number): number {
  return Math.round(value)
}

function roundTenths(value: number): number {
  return Math.round(value * 10) / 10
}

function sumQuantities(samples: readonly QuantityLike[]): number {
  return samples.reduce((sum, sample) => sum + (sample.quantity ?? 0), 0)
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value)
}

function toMeters(distance?: { quantity?: number; unit?: string }): number {
  const quantity = distance?.quantity ?? 0
  if (!Number.isFinite(quantity)) return 0

  switch (distance?.unit) {
    case 'm':
    case 'meter':
      return quantity
    case 'km':
      return quantity * 1_000
    case 'mi':
      return quantity * 1_609.344
    case 'yd':
      return quantity * 0.9144
    case 'ft':
      return quantity * 0.3048
    case 'cm':
      return quantity / 100
    default:
      // HealthKit may omit a unit for workouts; treat that as meters.
      return quantity
  }
}

function mapWorkout(workout: WorkoutLike): HealthWorkout {
  const start = toDate(workout.startDate)
  const end = toDate(workout.endDate)
  const rawType = workout.workoutActivityType
  const rawForClassifier =
    typeof rawType === 'number' || typeof rawType === 'string' ? rawType : null

  return {
    activityName: String(rawType ?? 'Unknown'),
    activityType: classifyHealthKitActivity(rawForClassifier),
    calories: roundInt(workout.totalEnergyBurned?.quantity ?? 0),
    distanceMeters: toMeters(workout.totalDistance),
    durationMinutes: roundInt((end.getTime() - start.getTime()) / 60_000),
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  }
}

function errorKind(err: unknown): string {
  return err instanceof Error ? err.name : typeof err
}

function warnHealthSnapshotFailure(label: string, err: unknown): void {
  console.warn(`[HealthSnapshotSource] ${label} failed (${errorKind(err)})`)
}

async function readMetric<T>(
  label: string,
  read: () => Promise<T>,
): Promise<T | null> {
  try {
    return await read()
  } catch (err) {
    warnHealthSnapshotFailure(`${label} read`, err)
    return null
  }
}

async function readQuantitySum(
  identifier: Parameters<typeof queryQuantitySamples>[0],
  date: Date,
  round: (value: number) => number,
  unit?: string,
): Promise<number> {
  const samples = await queryQuantitySamples(identifier, {
    limit: 0,
    unit,
    filter: { date: dayWindow(date) },
  })
  return round(sumQuantities(samples))
}

async function readMostRecent(
  identifier: Parameters<typeof getMostRecentQuantitySample>[0],
): Promise<number> {
  const sample = await getMostRecentQuantitySample(identifier)
  return roundInt(sample?.quantity ?? 0)
}

async function readSleepHours(date: Date): Promise<number> {
  const samples = await queryCategorySamples(
    'HKCategoryTypeIdentifierSleepAnalysis',
    {
      limit: 0,
      filter: { date: sleepWindow(date) },
    },
  )
  const totalMinutes = samples.reduce((sum, sample: CategoryLike) => {
    if (!ASLEEP_SLEEP_VALUES.has(sample.value ?? -1)) return sum
    return (
      sum +
      (toDate(sample.endDate).getTime() - toDate(sample.startDate).getTime()) /
        60_000
    )
  }, 0)

  return roundTenths(totalMinutes / 60)
}

async function readWorkouts(date: Date): Promise<HealthWorkout[]> {
  const workouts = await queryWorkoutSamples({
    limit: 0,
    filter: { date: dayWindow(date) },
  })
  return workouts.map((workout) => mapWorkout(workout))
}

export const iosHealthKitAdapter: HealthSnapshotSource = {
  isAvailable() {
    return Platform.OS === 'ios'
  },

  async getDailySnapshot(date: Date): Promise<DailyHealthSnapshot> {
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
      readMetric('steps', () =>
        readQuantitySum(
          'HKQuantityTypeIdentifierStepCount',
          date,
          roundInt,
          'count',
        ),
      ),
      readMetric('calories', () =>
        readQuantitySum(
          'HKQuantityTypeIdentifierActiveEnergyBurned',
          date,
          roundInt,
          'kcal',
        ),
      ),
      readMetric('sleep', () => readSleepHours(date)),
      readMetric('heart rate', () =>
        readMostRecent('HKQuantityTypeIdentifierHeartRate'),
      ),
      readMetric('HRV', () =>
        readMostRecent('HKQuantityTypeIdentifierHeartRateVariabilitySDNN'),
      ),
      readMetric('resting heart rate', () =>
        readMostRecent('HKQuantityTypeIdentifierRestingHeartRate'),
      ),
      readMetric('water', () =>
        readQuantitySum(
          'HKQuantityTypeIdentifierDietaryWater',
          date,
          roundTenths,
          'l',
        ),
      ),
      readMetric('flights climbed', () =>
        readQuantitySum(
          'HKQuantityTypeIdentifierFlightsClimbed',
          date,
          roundInt,
          'count',
        ),
      ),
      readMetric('workouts', () => readWorkouts(date)),
    ])

    return {
      date: isoDate(date),
      steps,
      calories,
      sleepHours,
      heartRate,
      hrv,
      restingHeartRate,
      waterLiters,
      flightsClimbed,
      workouts: workouts ?? [],
    }
  },

  async getRangeWorkouts(daysBack: number): Promise<HealthWorkout[]> {
    if (!this.isAvailable()) return []

    try {
      const workouts = await queryWorkoutSamples({
        limit: 0,
        filter: { date: rangeWindow(daysBack) },
      })
      return workouts.map((workout) => mapWorkout(workout))
    } catch (err) {
      warnHealthSnapshotFailure('range workouts read', err)
      return []
    }
  },

  async getRangeIntensity(daysBack: number): Promise<IntensityMap> {
    if (!this.isAvailable()) return new Map()

    const intensity = new Map<string, number>()
    const filter = { date: rangeWindow(daysBack) }

    try {
      const stepSamples = await queryQuantitySamples(
        'HKQuantityTypeIdentifierStepCount',
        {
          limit: 0,
          unit: 'count',
          filter,
        },
      )
      for (const sample of stepSamples) {
        if (!sample.startDate) continue
        const day = isoDate(toDate(sample.startDate))
        intensity.set(
          day,
          (intensity.get(day) ?? 0) + roundInt(sample.quantity ?? 0),
        )
      }
    } catch (err) {
      warnHealthSnapshotFailure('intensity steps read', err)
    }

    try {
      const workoutSamples = await queryWorkoutSamples({
        limit: 0,
        filter,
      })
      for (const workout of workoutSamples) {
        const day = isoDate(toDate(workout.startDate))
        intensity.set(day, (intensity.get(day) ?? 0) + 5_000)
      }
    } catch (err) {
      warnHealthSnapshotFailure('intensity workouts read', err)
    }

    return intensity
  },

  async saveCardioWorkout(params: SaveCardioWorkoutParams): Promise<boolean> {
    if (params.durationMinutes <= 0 || !this.isAvailable()) return false

    try {
      const { caloriesBurned, startDate, endDate } = params
      const quantities = caloriesBurned
        ? [
            {
              quantityType:
                'HKQuantityTypeIdentifierActiveEnergyBurned' as const,
              quantity: caloriesBurned,
              unit: 'kcal',
              startDate,
              endDate,
            },
          ]
        : []

      await saveWorkoutSample(
        WorkoutActivityType.mixedCardio,
        quantities,
        startDate,
        endDate,
        caloriesBurned ? { energyBurned: caloriesBurned } : {},
      )
      return true
    } catch (err) {
      warnHealthSnapshotFailure('save cardio workout', err)
      return false
    }
  },

  async requestAuthorization(): Promise<boolean> {
    if (!this.isAvailable()) return false

    const available = await Promise.resolve(isHealthDataAvailable())
    if (!available) return false

    return requestAuthorization({
      toRead: [...READ_PERMISSIONS],
      toShare: [...WRITE_PERMISSIONS],
    })
  },
}
