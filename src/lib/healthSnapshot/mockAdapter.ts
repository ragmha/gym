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

function randomDecimal(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 10) / 10
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
  const distance = today
    ? randomDecimal(2, 8)
    : decimalFromSeed(seed + 10, 2, 8)

  return {
    activityName: 'Running',
    calories: rand(180, 400, 9),
    distance,
    durationMinutes: rand(20, 60, 11),
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  }
}

export function createDeterministicMockSnapshot(
  date: Date = new Date(),
): DailyHealthSnapshot {
  const today = isSameDay(date, new Date())
  const seed = today ? Math.random() * 1000 : seedForDate(date)
  const rand = (min: number, max: number, offset: number) =>
    today
      ? Math.round(min + Math.random() * (max - min))
      : seededRand(seed + offset, min, max)

  return {
    date: isoDate(date),
    steps: rand(3_000, 12_000, 1),
    calories: rand(150, 800, 2),
    sleepHours: today ? randomDecimal(4, 9) : decimalFromSeed(seed + 3, 4, 9),
    heartRate: rand(58, 95, 4),
    hrv: rand(20, 90, 5),
    restingHeartRate: rand(48, 72, 6),
    waterLiters: today
      ? randomDecimal(0.5, 3)
      : decimalFromSeed(seed + 7, 0.5, 3),
    flightsClimbed: rand(0, 20, 8),
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
    const seed = daysBack * 10_000

    for (let i = 0; i < daysBack; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const steps = seededRand(seed + i, 0, 14_000)
      intensity.set(isoDate(date), steps)
    }

    return intensity
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
