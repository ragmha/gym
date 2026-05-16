import type { NormalizedActivityType } from '@/lib/training/pillars'

import type {
  DailyHealthSnapshot,
  HealthSnapshotSource,
  HealthWorkout,
  IntensityMap,
  SaveCardioWorkoutParams,
} from './types'

function seededRand(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000
  const r = x - Math.floor(x)
  return Math.round(min + r * (max - min))
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function seedForDate(date: Date): number {
  return (
    date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  )
}

function decimalFromSeed(seed: number, min: number, max: number): number {
  return (
    Math.round((min + (seededRand(seed, 0, 100) / 100) * (max - min)) * 10) / 10
  )
}

/**
 * Seed for "today's" demo snapshot. Derived from `Date.now()` so each
 * pull-to-refresh produces a slightly different number, but never uses
 * Math.random() (which CodeQL flags as cryptographically insecure even
 * though this is demo data, not a security context).
 */
function nowSeed(): number {
  return Date.now()
}

function createMockWorkout(
  date: Date,
  seed: number,
  rand: (min: number, max: number, offset: number) => number,
): HealthWorkout {
  const start = new Date(date)
  start.setHours(7, 30, 0, 0)
  const end = new Date(date)
  end.setHours(8, 15, 0, 0)

  const today = isSameDay(date, new Date())
  const distanceKm = today
    ? decimalFromSeed(nowSeed() + 100, 2, 8)
    : decimalFromSeed(seed + 10, 2, 8)

  return {
    activityName: 'Running',
    activityType: 'running',
    calories: rand(180, 400, 9),
    distanceMeters: Math.round(distanceKm * 1000),
    durationMinutes: rand(20, 60, 11),
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  }
}

export function createDeterministicMockSnapshot(
  date: Date = new Date(),
): DailyHealthSnapshot {
  const today = isSameDay(date, new Date())
  const seed = today ? nowSeed() : seedForDate(date)
  const rand = (min: number, max: number, offset: number) =>
    seededRand(seed + offset, min, max)

  return {
    date: isoDate(date),
    steps: rand(3_000, 12_000, 1),
    calories: rand(150, 800, 2),
    sleepHours: decimalFromSeed(seed + 3, 4, 9),
    // lgtm[js/insecure-randomness] -- demo fallback data, not a security context
    heartRate: rand(58, 95, 4),
    hrv: rand(20, 90, 5),
    // lgtm[js/insecure-randomness] -- demo fallback data, not a security context
    restingHeartRate: rand(48, 72, 6),
    waterLiters: decimalFromSeed(seed + 7, 0.5, 3),
    flightsClimbed: rand(0, 20, 8),
    workouts: [createMockWorkout(date, seed, rand)],
  }
}

/**
 * Seven-day hybrid + Hyrox training template. Repeats across the requested
 * window. Lets the load chart and weekly aggregates look like real training
 * data in demo mode, not a flat one-workout-a-day pattern.
 *
 * Strength is intentionally INCLUDED so the dashboard hook's
 * "exclude HK strength to avoid double-count with WorkoutSessionStore"
 * filter gets exercised in tests.
 */
interface MockRangeTemplate {
  dayOffsetMod7: number
  activityName: string
  activityType: NormalizedActivityType
  startHour: number
  startMinute: number
  baseDurationMinutes: number
  baseDistanceMeters: number
  baseCalories: number
}

const RANGE_WORKOUT_TEMPLATE: readonly MockRangeTemplate[] = [
  {
    dayOffsetMod7: 0,
    activityName: 'Easy Run',
    activityType: 'running',
    startHour: 7,
    startMinute: 0,
    baseDurationMinutes: 35,
    baseDistanceMeters: 6_000,
    baseCalories: 320,
  },
  {
    dayOffsetMod7: 1,
    activityName: 'Rowing',
    activityType: 'rowing',
    startHour: 18,
    startMinute: 0,
    baseDurationMinutes: 25,
    baseDistanceMeters: 5_000,
    baseCalories: 240,
  },
  {
    dayOffsetMod7: 2,
    activityName: 'Strength',
    activityType: 'strength',
    startHour: 18,
    startMinute: 30,
    baseDurationMinutes: 50,
    baseDistanceMeters: 0,
    baseCalories: 280,
  },
  {
    dayOffsetMod7: 3,
    activityName: 'Tempo Run',
    activityType: 'running',
    startHour: 7,
    startMinute: 0,
    baseDurationMinutes: 40,
    baseDistanceMeters: 8_000,
    baseCalories: 420,
  },
  {
    dayOffsetMod7: 4,
    activityName: 'HIIT',
    activityType: 'hiit',
    startHour: 17,
    startMinute: 30,
    baseDurationMinutes: 35,
    baseDistanceMeters: 0,
    baseCalories: 380,
  },
  {
    dayOffsetMod7: 5,
    activityName: 'Long Run',
    activityType: 'running',
    startHour: 7,
    startMinute: 0,
    baseDurationMinutes: 70,
    baseDistanceMeters: 12_000,
    baseCalories: 720,
  },
  {
    dayOffsetMod7: 6,
    activityName: 'Cycling',
    activityType: 'cycling',
    startHour: 9,
    startMinute: 0,
    baseDurationMinutes: 75,
    baseDistanceMeters: 25_000,
    baseCalories: 520,
  },
]

function jitterPercent(seed: number, range: number): number {
  // returns a value in [1 - range, 1 + range], deterministic from seed
  const factor = (seededRand(seed, 0, 200) - 100) / 100 // -1..1
  return 1 + factor * range
}

export function createMockRangeWorkouts(daysBack: number): HealthWorkout[] {
  const today = new Date()
  const workouts: HealthWorkout[] = []

  for (let i = 0; i < daysBack; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const template = RANGE_WORKOUT_TEMPLATE[i % 7]
    if (!template) continue

    const seed = seedForDate(date)
    const start = new Date(date)
    start.setHours(template.startHour, template.startMinute, 0, 0)
    const durationMinutes = Math.round(
      template.baseDurationMinutes * jitterPercent(seed + 1, 0.1),
    )
    const end = new Date(start.getTime() + durationMinutes * 60_000)
    const distanceMeters =
      template.baseDistanceMeters > 0
        ? Math.round(
            template.baseDistanceMeters * jitterPercent(seed + 2, 0.08),
          )
        : 0
    const calories = Math.round(
      template.baseCalories * jitterPercent(seed + 3, 0.1),
    )

    workouts.push({
      activityName: template.activityName,
      activityType: template.activityType,
      calories,
      distanceMeters,
      durationMinutes,
      startISO: start.toISOString(),
      endISO: end.toISOString(),
    })
  }

  return workouts
}

export const deterministicMockAdapter: HealthSnapshotSource = {
  async getDailySnapshot(date: Date): Promise<DailyHealthSnapshot> {
    return createDeterministicMockSnapshot(date)
  },

  async getRangeIntensity(daysBack: number): Promise<IntensityMap> {
    const intensity = new Map<string, number>()
    const today = new Date()
    const seed = daysBack * 10_000

    for (let i = 0; i < daysBack; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const steps = seededRand(seed + i, 0, 14_000)
      intensity.set(isoDate(date), steps)
    }

    return intensity
  },

  async getRangeWorkouts(daysBack: number): Promise<HealthWorkout[]> {
    return createMockRangeWorkouts(daysBack)
  },

  async saveCardioWorkout(params: SaveCardioWorkoutParams): Promise<boolean> {
    return params.durationMinutes > 0
  },

  async requestAuthorization(): Promise<boolean> {
    return true
  },

  isAvailable(): boolean {
    return false
  },
}
