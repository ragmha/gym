import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import type {
  DailyHealthSnapshot,
  HealthSnapshotSource,
  HealthWorkout,
  IntensityMap,
} from '@/lib/healthSnapshot/types'

function seededRand(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000
  const r = x - Math.floor(x)
  return Math.round(min + r * (max - min))
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

function createMockWorkout(
  date: Date,
  seed: number,
  rand: (min: number, max: number, offset: number) => number,
): HealthWorkout {
  const start = new Date(date)
  start.setHours(7, 30, 0, 0)
  const end = new Date(date)
  end.setHours(8, 15, 0, 0)

  return {
    activityName: 'Running',
    calories: rand(180, 400, 9),
    distance: decimalFromSeed(seed + 10, 2, 8),
    durationMinutes: rand(20, 60, 11),
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  }
}

export function createDeterministicMockSnapshot(
  date: Date = new Date(),
): DailyHealthSnapshot {
  const seed = seedForDate(date)
  const rand = (min: number, max: number, offset: number) =>
    seededRand(seed + offset, min, max)

  return {
    date: localDateKey(date),
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
    bodyMassKg: decimalFromSeed(seed + 12, 70, 82),
    dietaryCalories: rand(1_400, 2_900, 13),
    workouts: [createMockWorkout(date, seed, rand)],
  }
}

export const deterministicMockAdapter: HealthSnapshotSource = {
  async getDailySnapshot(date: Date): Promise<DailyHealthSnapshot> {
    return createDeterministicMockSnapshot(date)
  },

  async getRangeIntensity(daysBack: number): Promise<IntensityMap> {
    const intensity = new Map<string, number>()
    const today = new Date()
    for (let i = 0; i < daysBack; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const { steps } = createDeterministicMockSnapshot(date)
      if (steps !== null) intensity.set(localDateKey(date), steps)
    }

    return intensity
  },

  async requestAuthorization(): Promise<boolean> {
    return true
  },

  isAvailable(): boolean {
    return false
  },
}
