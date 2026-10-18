import { localDateKey, localDaysEnding } from '@/lib/healthSnapshot/dateKey'
import type {
  DailyHealthSnapshot,
  DailyStepReading,
  DailyWaterReading,
  DailyWorkouts,
  HealthBodyMassSample,
  HealthSnapshotSource,
  HealthWorkout,
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
  const durationMinutes = rand(20, 60, 11)
  end.setTime(start.getTime() + durationMinutes * 60_000)

  return {
    kind: 'running',
    activityName: 'Running',
    averageHeartRate: null,
    calories: rand(180, 400, 9),
    distance: decimalFromSeed(seed + 10, 2, 8),
    durationMinutes,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  }
}

function mockWaterLiters(date: Date): number {
  return decimalFromSeed(seedForDate(date) + 7, 0.5, 3)
}

function createMockBodyMassHistory(date: Date): HealthBodyMassSample[] {
  return Array.from({ length: 14 }, (_, index) => {
    const morning = new Date(date)
    morning.setDate(morning.getDate() - index)
    morning.setHours(7, 0, 0, 0)
    return {
      kilograms: decimalFromSeed(seedForDate(morning) + 12, 70, 82),
      startISO: morning.toISOString(),
    }
  })
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
    waterLiters: mockWaterLiters(date),
    flightsClimbed: rand(0, 20, 8),
    bodyMassKg: decimalFromSeed(seed + 12, 70, 82),
    bodyMassHistory: createMockBodyMassHistory(date),
    dietaryCalories: rand(1_400, 2_900, 13),
    workouts: [createMockWorkout(date, seed, rand)],
  }
}

export const deterministicMockAdapter: HealthSnapshotSource = {
  async getDailySnapshot(date: Date): Promise<DailyHealthSnapshot> {
    return createDeterministicMockSnapshot(date)
  },

  async getStepHistory(
    endDate: Date,
    days: number,
  ): Promise<DailyStepReading[]> {
    return localDaysEnding(endDate, days).map((day) => ({
      date: localDateKey(day),
      steps: createDeterministicMockSnapshot(day).steps,
    }))
  },

  async getWaterHistory(
    endDate: Date,
    days: number,
  ): Promise<DailyWaterReading[]> {
    return localDaysEnding(endDate, days).map((day) => ({
      date: localDateKey(day),
      liters: mockWaterLiters(day),
    }))
  },

  async getWorkoutHistory(
    endDate: Date,
    days: number,
  ): Promise<DailyWorkouts[]> {
    return localDaysEnding(endDate, days).map((day) => ({
      date: localDateKey(day),
      workouts: createDeterministicMockSnapshot(day).workouts,
    }))
  },

  async requestAuthorization(): Promise<boolean> {
    return true
  },

  subscribeToWorkoutChanges() {
    return null
  },

  isAvailable(): boolean {
    return false
  },
}
