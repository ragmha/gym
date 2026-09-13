import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'

export function makeSnapshot(
  overrides: Partial<DailyHealthSnapshot> = {},
): DailyHealthSnapshot {
  return {
    date: '2026-09-12',
    steps: 5_000,
    calories: 300,
    sleepHours: 8,
    heartRate: 72,
    hrv: 50,
    restingHeartRate: 65,
    waterLiters: 1.5,
    flightsClimbed: 8,
    bodyMassKg: 78.4,
    dietaryCalories: null,
    workouts: [],
    ...overrides,
  }
}
