import {
  getDateOfBirthAsync,
  getMostRecentQuantitySample,
  isHealthDataAvailable,
  queryCategorySamples,
  queryQuantitySamples,
  queryStatisticsCollectionForQuantity,
  queryStatisticsForQuantity,
  queryWorkoutSamples,
  requestAuthorization,
  subscribeToChanges,
} from '@kingstinct/react-native-healthkit'
import {
  WorkoutActivityType,
  WorkoutEventType,
  type WorkoutEvent,
} from '@kingstinct/react-native-healthkit/types'
import { Platform } from 'react-native'

import { localDateKey, localDaysEnding } from '@/lib/healthSnapshot/dateKey'
import type {
  DailyActivityReading,
  DailyFoodLog,
  DailyHealthSnapshot,
  DailyStepReading,
  DailyWaterReading,
  DailyWorkouts,
  HealthBodyMassSample,
  HealthSnapshotSource,
  HealthWorkout,
  MealEntry,
  StairSessionHeartRate,
} from '@/lib/healthSnapshot/types'

const READ_PERMISSIONS = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
  'HKQuantityTypeIdentifierAppleExerciseTime',
  'HKQuantityTypeIdentifierHeartRate',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKQuantityTypeIdentifierDietaryWater',
  'HKQuantityTypeIdentifierFlightsClimbed',
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierHeight',
  'HKQuantityTypeIdentifierDietaryEnergyConsumed',
  'HKQuantityTypeIdentifierDietaryProtein',
  'HKQuantityTypeIdentifierDietaryCarbohydrates',
  'HKQuantityTypeIdentifierDietaryFatTotal',
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKWorkoutTypeIdentifier',
  'HKCharacteristicTypeIdentifierDateOfBirth',
] as const

const ASLEEP_SLEEP_VALUES = new Set([1, 3, 4, 5])

interface DateRangeLike {
  startDate: Date | string
  endDate: Date | string
}

interface CategoryLike extends DateRangeLike {
  value?: number
}

type NativeWorkout = Awaited<ReturnType<typeof queryWorkoutSamples>>[number]

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

/** One bulk daily-sum query; days with no valid reading are absent, observed zeroes kept. */
async function dailyTotals(
  identifier:
    | 'HKQuantityTypeIdentifierStepCount'
    | 'HKQuantityTypeIdentifierDietaryWater'
    | 'HKQuantityTypeIdentifierActiveEnergyBurned'
    | 'HKQuantityTypeIdentifierDistanceWalkingRunning'
    | 'HKQuantityTypeIdentifierAppleExerciseTime',
  unit: 'count' | 'l' | 'kcal' | 'km' | 'min',
  endDate: Date,
  days: number,
): Promise<Map<string, number>> {
  const totals = new Map<string, number>()
  const startDate = dayWindow(localDaysEnding(endDate, days)[0]).startDate
  const end = dayWindow(endDate).endDate
  if (startDate >= end) return totals

  const daily = await queryStatisticsCollectionForQuantity(
    identifier,
    ['cumulativeSum'],
    startDate,
    { day: 1 },
    { unit, filter: { date: { startDate, endDate: end } } },
  )
  for (const statistics of daily) {
    const quantity = statistics.sumQuantity?.quantity
    if (
      !statistics.startDate ||
      quantity == null ||
      !Number.isFinite(quantity) ||
      quantity < 0
    ) {
      continue
    }
    totals.set(localDateKey(toDate(statistics.startDate)), quantity)
  }
  return totals
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

/** Spans when the workout was paused by hand or by motion; an open pause runs to the end. */
function workoutPauses(
  events: readonly WorkoutEvent[] | undefined,
  endISO: string,
): { startISO: string; endISO: string }[] {
  const pauses: { startISO: string; endISO: string }[] = []
  let manual = false
  let motion = false
  let from: string | null = null
  for (const event of events ?? []) {
    if (event.type === WorkoutEventType.pause) manual = true
    else if (event.type === WorkoutEventType.resume) manual = false
    else if (event.type === WorkoutEventType.motionPaused) motion = true
    else if (event.type === WorkoutEventType.motionResumed) motion = false
    else continue
    const at = toDate(event.startDate).toISOString()
    if ((manual || motion) && from === null) from = at
    else if (!manual && !motion && from !== null) {
      pauses.push({ startISO: from, endISO: at })
      from = null
    }
  }
  if (from !== null) pauses.push({ startISO: from, endISO })
  return pauses
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

function workoutKind(activityType: number): HealthWorkout['kind'] {
  switch (activityType) {
    case WorkoutActivityType.running:
      return 'running'
    case WorkoutActivityType.stairClimbing:
      return 'stairClimber'
    case WorkoutActivityType.traditionalStrengthTraining:
    case WorkoutActivityType.functionalStrengthTraining:
      return 'strength'
    default:
      return 'other'
  }
}

function mapWorkout(workout: NativeWorkout): HealthWorkout {
  const start = toDate(workout.startDate)
  const end = toDate(workout.endDate)
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end < start ||
    !Number.isFinite(workout.duration.quantity) ||
    workout.duration.quantity < 0
  ) {
    throw new TypeError('Invalid workout')
  }

  return {
    kind: workoutKind(workout.workoutActivityType),
    activityName: workoutActivityName(workout.workoutActivityType),
    averageHeartRate: null,
    calories:
      workout.totalEnergyBurned?.quantity == null
        ? null
        : roundInt(workout.totalEnergyBurned.quantity),
    distance: workout.totalDistance?.quantity ?? null,
    durationMinutes: workout.duration.quantity / 60,
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

async function readBodyMassHistory(
  date: Date,
): Promise<HealthBodyMassSample[] | null> {
  const readings = await readBodyMassSamples(date, 14)
  return readings.length > 0 ? readings : null
}

async function readBodyMassSamples(
  date: Date,
  days: number,
): Promise<HealthBodyMassSample[]> {
  const { startDate, endDate } = dayWindow(date)
  startDate.setDate(startDate.getDate() - (days - 1))
  const samples = await queryQuantitySamples(
    'HKQuantityTypeIdentifierBodyMass',
    {
      limit: 0,
      ascending: true,
      unit: 'kg',
      filter: { date: { startDate, endDate, strictStartDate: true } },
    },
  )
  return samples
    .filter((sample) => sample.quantity != null)
    .map((sample) => {
      const start = toDate(sample.startDate)
      if (
        !Number.isFinite(start.getTime()) ||
        !Number.isFinite(sample.quantity) ||
        sample.quantity < 0
      ) {
        throw new TypeError('Invalid body mass sample')
      }
      return { kilograms: sample.quantity, startISO: start.toISOString() }
    })
}

async function readWorkouts(date: Date): Promise<HealthWorkout[]> {
  const workouts = await queryWorkoutSamples({
    limit: 0,
    filter: { date: dayWindow(date) },
  })
  const mapped = workouts.map(mapWorkout)
  const stairIndex = mapped.reduce(
    (best, workout, index) =>
      workout.kind === 'stairClimber' &&
      localDateKey(new Date(workout.startISO)) === localDateKey(date) &&
      (best === -1 || workout.durationMinutes > mapped[best].durationMinutes)
        ? index
        : best,
    -1,
  )
  // Only the displayed stair session needs an extra statistics query.
  if (stairIndex !== -1) {
    mapped[stairIndex].averageHeartRate = await readAverageHeartRate(
      workouts[stairIndex],
    )
  }
  return mapped
}

function readAverageHeartRate(workout: NativeWorkout): Promise<number | null> {
  return readMetric('stair workout heart rate', async () => {
    const statistics = await workout.getStatistic(
      'HKQuantityTypeIdentifierHeartRate',
      'count/min',
    )
    const bpm = statistics?.averageQuantity?.quantity
    if (bpm == null) return null
    if (!Number.isFinite(bpm) || bpm < 0) {
      throw new TypeError('Invalid workout heart rate')
    }
    return roundInt(bpm)
  })
}

/** Age-predicted max heart rate (220 − age) on `on`, or null without a plausible birth date. */
function maxHeartRateOn(birth: Date | null, on: Date): number | null {
  if (!birth) return null
  let age = on.getFullYear() - birth.getFullYear()
  if (
    on.getMonth() < birth.getMonth() ||
    (on.getMonth() === birth.getMonth() && on.getDate() < birth.getDate())
  ) {
    age--
  }
  return age > 0 && age < 120 ? 220 - age : null
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
        bodyMassHistory: null,
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
      bodyMassHistory,
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
      readMetric('body mass history', () => readBodyMassHistory(date)),
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
      bodyMassHistory,
      dietaryCalories,
      workouts: workouts ?? [],
    }
  },

  async getStepHistory(
    endDate: Date,
    days: number,
  ): Promise<DailyStepReading[]> {
    const totals = this.isAvailable()
      ? await dailyTotals(
          'HKQuantityTypeIdentifierStepCount',
          'count',
          endDate,
          days,
        )
      : new Map<string, number>()
    return localDaysEnding(endDate, days).map((day) => {
      const date = localDateKey(day)
      const steps = totals.get(date)
      return { date, steps: steps === undefined ? null : roundInt(steps) }
    })
  },

  async getActivityHistory(
    endDate: Date,
    days: number,
  ): Promise<DailyActivityReading[]> {
    const results = this.isAvailable()
      ? await Promise.all([
          readMetric('step history', () =>
            dailyTotals(
              'HKQuantityTypeIdentifierStepCount',
              'count',
              endDate,
              days,
            ),
          ),
          readMetric('calorie history', () =>
            dailyTotals(
              'HKQuantityTypeIdentifierActiveEnergyBurned',
              'kcal',
              endDate,
              days,
            ),
          ),
          readMetric('walking distance history', () =>
            dailyTotals(
              'HKQuantityTypeIdentifierDistanceWalkingRunning',
              'km',
              endDate,
              days,
            ),
          ),
          readMetric('active minutes history', () =>
            dailyTotals(
              'HKQuantityTypeIdentifierAppleExerciseTime',
              'min',
              endDate,
              days,
            ),
          ),
        ])
      : null
    if (results?.every((totals) => totals === null)) {
      throw new Error('Activity history unavailable')
    }
    const [steps, calories, distance, activeMinutes] = results ?? [
      null,
      null,
      null,
      null,
    ]
    const total = (
      totals: Map<string, number> | null,
      date: string,
      round: (value: number) => number,
    ) => {
      const value = totals?.get(date)
      return value === undefined ? null : round(value)
    }

    return localDaysEnding(endDate, days).map((day) => {
      const date = localDateKey(day)
      return {
        date,
        steps: total(steps, date, roundInt),
        calories: total(calories, date, roundInt),
        walkingDistanceKm: total(distance, date, roundTenths),
        activeMinutes: total(activeMinutes, date, roundInt),
      }
    })
  },

  async getWaterHistory(
    endDate: Date,
    days: number,
  ): Promise<DailyWaterReading[]> {
    const totals = this.isAvailable()
      ? await dailyTotals(
          'HKQuantityTypeIdentifierDietaryWater',
          'l',
          endDate,
          days,
        )
      : new Map<string, number>()
    return localDaysEnding(endDate, days).map((day) => {
      const date = localDateKey(day)
      const liters = totals.get(date)
      return { date, liters: liters === undefined ? null : roundTenths(liters) }
    })
  },

  async getBodyMassHistory(
    endDate: Date,
    days: number,
  ): Promise<HealthBodyMassSample[]> {
    return this.isAvailable() ? readBodyMassSamples(endDate, days) : []
  },

  async getHeightMeters(): Promise<number | null> {
    if (!this.isAvailable()) return null
    const sample = await getMostRecentQuantitySample(
      'HKQuantityTypeIdentifierHeight',
      'm',
    )
    const meters = sample?.quantity
    return meters != null && Number.isFinite(meters) && meters > 0
      ? meters
      : null
  },

  async getWorkoutHistory(
    endDate: Date,
    days: number,
  ): Promise<DailyWorkouts[]> {
    const range = localDaysEnding(endDate, days)
    const byDay = new Map<string, HealthWorkout[]>()
    const startDate = dayWindow(range[0]).startDate
    const end = dayWindow(endDate).endDate

    if (this.isAvailable() && startDate < end) {
      try {
        const samples = await queryWorkoutSamples({
          limit: 0,
          filter: { date: { startDate, endDate: end } },
        })
        for (const sample of samples) {
          const workout = mapWorkout(sample)
          const day = localDateKey(new Date(workout.startISO))
          const workouts = byDay.get(day) ?? []
          workouts.push(workout)
          byDay.set(day, workouts)
        }
      } catch (err) {
        warnHealthSnapshotFailure('workout history read', err)
        throw err
      }
    }

    return range.map((day) => {
      const date = localDateKey(day)
      return { date, workouts: byDay.get(date) ?? [] }
    })
  },

  async getFoodLog(date: Date): Promise<DailyFoodLog> {
    if (!this.isAvailable()) {
      return { proteinGrams: null, carbsGrams: null, fatGrams: null, meals: [] }
    }
    const grams = (
      label: string,
      identifier: Parameters<typeof readQuantitySum>[0],
    ) =>
      readMetric(label, () => readQuantitySum(identifier, date, roundInt, 'g'))
    try {
      const [proteinGrams, carbsGrams, fatGrams, samples] = await Promise.all([
        grams('protein', 'HKQuantityTypeIdentifierDietaryProtein'),
        grams('carbs', 'HKQuantityTypeIdentifierDietaryCarbohydrates'),
        grams('fat', 'HKQuantityTypeIdentifierDietaryFatTotal'),
        queryQuantitySamples('HKQuantityTypeIdentifierDietaryEnergyConsumed', {
          limit: 0,
          ascending: true,
          unit: 'kcal',
          filter: { date: dayWindow(date) },
        }),
      ])
      const meals = samples.flatMap((sample): MealEntry[] => {
        if (!Number.isFinite(sample.quantity) || sample.quantity < 0) return []
        const name = sample.metadata?.HKFoodType
        return [
          {
            name: typeof name === 'string' && name.trim() ? name.trim() : null,
            kcal: roundInt(sample.quantity),
            startISO: toDate(sample.startDate).toISOString(),
          },
        ]
      })
      return { proteinGrams, carbsGrams, fatGrams, meals }
    } catch (err) {
      warnHealthSnapshotFailure('food log read', err)
      throw err
    }
  },

  async getStairWorkouts(): Promise<HealthWorkout[]> {
    if (!this.isAvailable()) return []
    const workouts = await queryWorkoutSamples({
      limit: 0,
      ascending: true,
      filter: { workoutActivityType: WorkoutActivityType.stairClimbing },
    })
    return workouts.map(mapWorkout)
  },

  async getStairSessions(date: Date): Promise<StairSessionHeartRate[]> {
    if (!this.isAvailable()) return []
    const key = localDateKey(date)
    const stairs = (
      await queryWorkoutSamples({
        limit: 0,
        ascending: true,
        filter: { date: dayWindow(date) },
      })
    ).filter(
      (w) =>
        w.workoutActivityType === WorkoutActivityType.stairClimbing &&
        localDateKey(toDate(w.startDate)) === key,
    )
    if (!stairs.length) return []
    const birth = await readMetric('date of birth', () => getDateOfBirthAsync())
    return Promise.all(
      stairs.map(async (native) => {
        const workout = mapWorkout(native)
        const [samples, averageHeartRate] = await Promise.all([
          readMetric('stair heart rate', () =>
            queryQuantitySamples('HKQuantityTypeIdentifierHeartRate', {
              limit: 0,
              ascending: true,
              unit: 'count/min',
              filter: {
                date: {
                  startDate: new Date(workout.startISO),
                  endDate: new Date(workout.endISO),
                },
              },
            }),
          ),
          readAverageHeartRate(native),
        ])
        return {
          workout: { ...workout, averageHeartRate },
          samples: (samples ?? [])
            .filter((s) => Number.isFinite(s.quantity) && s.quantity > 0)
            .map((s) => ({
              bpm: roundInt(s.quantity),
              startISO: toDate(s.startDate).toISOString(),
            })),
          maxHeartRate: maxHeartRateOn(
            birth ?? null,
            new Date(workout.startISO),
          ),
          pauses: workoutPauses(native.events, workout.endISO),
        }
      }),
    )
  },

  subscribeToWorkoutChanges(onChange) {
    if (!this.isAvailable()) return null
    try {
      const subscription = subscribeToChanges(
        'HKWorkoutTypeIdentifier',
        ({ errorMessage }) => {
          if (errorMessage) {
            warnHealthSnapshotFailure('workout observation', new Error())
          } else {
            onChange()
          }
        },
      )
      return () => subscription.remove()
    } catch (err) {
      warnHealthSnapshotFailure('workout observation', err)
      return null
    }
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
