import {
  getMostRecentQuantitySample,
  isHealthDataAvailable,
  queryCategorySamples,
  queryQuantitySamples,
  queryStatisticsCollectionForQuantity,
  queryStatisticsForQuantity,
  queryWorkoutSamples,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit'
import { WorkoutActivityType } from '@kingstinct/react-native-healthkit/types'
import { Platform } from 'react-native'

import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import type {
  DailyHealthSnapshot,
  HealthSnapshotSource,
  HealthWorkout,
  IntensityMap,
} from '@/lib/healthSnapshot/types'

const READ_PERMISSIONS = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierHeartRate',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKQuantityTypeIdentifierDietaryWater',
  'HKQuantityTypeIdentifierFlightsClimbed',
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierDietaryEnergyConsumed',
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKWorkoutTypeIdentifier',
] as const

const ASLEEP_SLEEP_VALUES = new Set([1, 3, 4, 5])

interface DateRangeLike {
  startDate: Date | string
  endDate: Date | string
}

interface CategoryLike extends DateRangeLike {
  value?: number
}

interface WorkoutLike extends DateRangeLike {
  workoutActivityType?: unknown
  duration: { quantity: number }
  totalEnergyBurned?: { quantity?: number }
  totalDistance?: { quantity?: number }
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
  startDate.setDate(startDate.getDate() - (daysBack - 1))
  startDate.setHours(0, 0, 0, 0)
  return { startDate, endDate }
}

function roundInt(value: number): number {
  return Math.round(value)
}

function roundTenths(value: number): number {
  return Math.round(value * 10) / 10
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value)
}

function workoutActivityName(activityType: unknown): string {
  const name =
    typeof activityType === 'number'
      ? WorkoutActivityType[activityType]
      : undefined

  if (name === undefined) {
    warnHealthSnapshotFailure('workout activity type', new TypeError())
    return 'Unknown workout'
  }

  const words = name.replace(/([a-z])([A-Z])/g, '$1 $2')
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase()
}

function mapWorkout(workout: WorkoutLike): HealthWorkout {
  const start = toDate(workout.startDate)
  const end = toDate(workout.endDate)

  return {
    activityName: workoutActivityName(workout.workoutActivityType),
    calories:
      workout.totalEnergyBurned?.quantity == null
        ? null
        : roundInt(workout.totalEnergyBurned.quantity),
    distance: workout.totalDistance?.quantity ?? null,
    durationMinutes: roundInt(workout.duration.quantity / 60),
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
  identifier: Parameters<typeof queryStatisticsForQuantity>[0],
  date: Date,
  round: (value: number) => number,
  unit?: string,
): Promise<number | null> {
  const statistics = await queryStatisticsForQuantity(
    identifier,
    ['cumulativeSum'],
    { unit, filter: { date: dayWindow(date) } },
  )
  const total = statistics.sumQuantity?.quantity
  return total == null ? null : round(total)
}

async function readLatestForDay(
  identifier: Parameters<typeof queryQuantitySamples>[0],
  date: Date,
  unit: string,
): Promise<number | null> {
  const samples = await queryQuantitySamples(identifier, {
    limit: 1,
    ascending: false,
    unit,
    filter: { date: dayWindow(date) },
  })
  const quantity = samples[0]?.quantity
  return quantity == null ? null : roundInt(quantity)
}

async function readSleepHours(date: Date): Promise<number | null> {
  const window = sleepWindow(date)
  const samples = await queryCategorySamples(
    'HKCategoryTypeIdentifierSleepAnalysis',
    {
      limit: 0,
      filter: { date: window },
    },
  )
  const intervals = samples
    .filter((sample: CategoryLike) =>
      ASLEEP_SLEEP_VALUES.has(sample.value ?? -1),
    )
    .map((sample: CategoryLike) => {
      const start = toDate(sample.startDate).getTime()
      const end = toDate(sample.endDate).getTime()
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
        throw new TypeError('Invalid sleep interval')
      }
      return {
        start: Math.max(start, window.startDate.getTime()),
        end: Math.min(end, window.endDate.getTime()),
        observedZero: start === end,
      }
    })
    .filter(({ start, end, observedZero }) =>
      observedZero ? end === start : end > start,
    )
    .sort((left, right) => left.start - right.start)
  if (intervals.length === 0) return null

  let coveredUntil = intervals[0].start
  let totalMilliseconds = 0
  for (const { start, end } of intervals) {
    if (end > coveredUntil) {
      totalMilliseconds += end - Math.max(start, coveredUntil)
      coveredUntil = end
    }
  }
  return roundTenths(totalMilliseconds / 3_600_000)
}

async function readBodyMassKg(): Promise<number | null> {
  const sample = await getMostRecentQuantitySample(
    'HKQuantityTypeIdentifierBodyMass',
    'kg',
  )
  // An empty read may mean no samples or no read access; HealthKit hides which.
  if (sample?.quantity == null) return null
  return roundTenths(sample.quantity)
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
    if (!this.isAvailable()) {
      return {
        date: localDateKey(date),
        steps: null,
        calories: null,
        sleepHours: null,
        heartRate: null,
        hrv: null,
        restingHeartRate: null,
        waterLiters: null,
        flightsClimbed: null,
        bodyMassKg: null,
        dietaryCalories: null,
        workouts: [],
      }
    }

    const [
      steps,
      calories,
      sleepHours,
      heartRate,
      hrv,
      restingHeartRate,
      waterLiters,
      flightsClimbed,
      bodyMassKg,
      dietaryCalories,
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
        readLatestForDay(
          'HKQuantityTypeIdentifierHeartRate',
          date,
          'count/min',
        ),
      ),
      readMetric('HRV', () =>
        readLatestForDay(
          'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
          date,
          'ms',
        ),
      ),
      readMetric('resting heart rate', () =>
        readLatestForDay(
          'HKQuantityTypeIdentifierRestingHeartRate',
          date,
          'count/min',
        ),
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
      readMetric('body mass', () => readBodyMassKg()),
      readMetric('dietary calories', () =>
        readQuantitySum(
          'HKQuantityTypeIdentifierDietaryEnergyConsumed',
          date,
          roundInt,
          'kcal',
        ),
      ),
      readMetric('workouts', () => readWorkouts(date)),
    ])

    return {
      date: localDateKey(date),
      steps,
      calories,
      sleepHours,
      heartRate,
      hrv,
      restingHeartRate,
      waterLiters,
      flightsClimbed,
      bodyMassKg: bodyMassKg ?? null,
      dietaryCalories,
      workouts: workouts ?? [],
    }
  },

  async getRangeIntensity(daysBack: number): Promise<IntensityMap> {
    if (!this.isAvailable()) return new Map()

    const intensity = new Map<string, number>()
    const filter = { date: rangeWindow(daysBack) }

    try {
      const dailySteps = await queryStatisticsCollectionForQuantity(
        'HKQuantityTypeIdentifierStepCount',
        ['cumulativeSum'],
        filter.date.startDate,
        { day: 1 },
        {
          unit: 'count',
          filter,
        },
      )
      for (const statistics of dailySteps) {
        const quantity = statistics.sumQuantity?.quantity
        if (!statistics.startDate || quantity == null) continue
        const day = localDateKey(toDate(statistics.startDate))
        intensity.set(day, roundInt(quantity))
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
        const day = localDateKey(toDate(workout.startDate))
        intensity.set(day, (intensity.get(day) ?? 0) + 5_000)
      }
    } catch (err) {
      warnHealthSnapshotFailure('intensity workouts read', err)
    }

    return intensity
  },

  async requestAuthorization(): Promise<boolean> {
    if (!this.isAvailable()) return false

    const available = await Promise.resolve(isHealthDataAvailable())
    if (!available) return false

    return requestAuthorization({
      toRead: [...READ_PERMISSIONS],
      toShare: [],
    })
  },
}
