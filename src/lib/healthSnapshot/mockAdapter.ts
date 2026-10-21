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
  StairSessionHeartRate,
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

function createMockStairWorkout(
  date: Date,
  rand: (min: number, max: number, offset: number) => number,
): HealthWorkout[] {
  // ponytail: roughly 3 in 5 days have a session, and some an evening second one
  if (rand(0, 9, 20) >= 6) return []
  return [6, 18].slice(0, rand(0, 9, 24) >= 7 ? 2 : 1).map((hour, i) => {
    const start = new Date(date)
    start.setHours(hour, 0, 0, 0)
    const durationMinutes = rand(18, 42, 21 + i * 10)
    return {
      kind: 'stairClimber',
      activityName: 'Stair Climbing',
      averageHeartRate: rand(128, 156, 22 + i * 10),
      calories: rand(180, 420, 23 + i * 10),
      distance: null,
      durationMinutes,
      startISO: start.toISOString(),
      endISO: new Date(
        start.getTime() + durationMinutes * 60_000,
      ).toISOString(),
    }
  })
}

function mockWaterLiters(date: Date): number {
  return decimalFromSeed(seedForDate(date) + 7, 0.5, 3)
}

function createMockBodyMassHistory(
  date: Date,
  days = 14,
): HealthBodyMassSample[] {
  return Array.from({ length: days }, (_, index) => {
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
    workouts: [
      createMockWorkout(date, seed, rand),
      ...createMockStairWorkout(date, rand),
    ],
  }
}

// Name, hour, and share of the day's calories eaten once the meal is done.
const MOCK_MEALS = [
  ['Oatmeal', 8, 0.2],
  ['Chicken salad', 13, 0.5],
  ['Greek yogurt', 16, 0.6],
  ['Salmon & rice', 19, 1],
] as const

export const deterministicMockAdapter: HealthSnapshotSource = {
  async getDailySnapshot(date: Date): Promise<DailyHealthSnapshot> {
    return createDeterministicMockSnapshot(date)
  },

  async getFoodLog(date: Date): Promise<DailyFoodLog> {
    const total = createDeterministicMockSnapshot(date).dietaryCalories ?? 0
    return {
      proteinGrams: seededRand(seedForDate(date) + 17, 60, 160),
      carbsGrams: Math.round((total * 0.45) / 4),
      fatGrams: Math.round((total * 0.3) / 9),
      meals: MOCK_MEALS.map(([name, hour, eatenBy], index) => {
        const start = new Date(date)
        start.setHours(hour, 0, 0, 0)
        const before = index ? MOCK_MEALS[index - 1][2] : 0
        return {
          name,
          kcal: Math.round(total * eatenBy) - Math.round(total * before),
          startISO: start.toISOString(),
        }
      }),
    }
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

  async getActivityHistory(
    endDate: Date,
    days: number,
  ): Promise<DailyActivityReading[]> {
    return localDaysEnding(endDate, days).map((date) => {
      const seed = seedForDate(date)
      const snapshot = createDeterministicMockSnapshot(date)
      return {
        date: localDateKey(date),
        steps: snapshot.steps,
        calories: snapshot.calories,
        walkingDistanceKm: decimalFromSeed(seed + 15, 0, 12),
        activeMinutes: seededRand(seed + 16, 0, 180),
      }
    })
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

  async getBodyMassHistory(
    endDate: Date,
    days: number,
  ): Promise<HealthBodyMassSample[]> {
    return createMockBodyMassHistory(endDate, days).reverse()
  },

  async getHeightMeters(): Promise<number | null> {
    return 1.78
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

  async getStairWorkouts(): Promise<HealthWorkout[]> {
    // ponytail: two years of mock history, enough to swipe through
    return localDaysEnding(new Date(), 730).flatMap((day) =>
      createDeterministicMockSnapshot(day).workouts.filter(
        (w) => w.kind === 'stairClimber',
      ),
    )
  },

  async getStairSessions(date: Date): Promise<StairSessionHeartRate[]> {
    const seed = seedForDate(date)
    return createDeterministicMockSnapshot(date)
      .workouts.filter((w) => w.kind === 'stairClimber')
      .map((workout, n) => {
        const start = Date.parse(workout.startISO)
        const avg = workout.averageHeartRate ?? 140
        const samples = Array.from(
          { length: Math.floor(workout.durationMinutes * 6) },
          (_, i) => ({
            bpm: Math.round(
              95 +
                (avg + 8 - 95) * Math.min(i / 30, 1) +
                12 * Math.sin(i / 25 + seed + n) +
                seededRand(seed + n * 1000 + i, -3, 3),
            ),
            startISO: new Date(start + i * 10_000).toISOString(),
          }),
        )
        return { workout, samples, maxHeartRate: 188 }
      })
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
