import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import type {
  DailyHealthSnapshot,
  HealthBodyMassSample,
  HealthWorkout,
} from '@/lib/healthSnapshot/types'

export const DAILY_STEP_GOAL = 20_000
export const CARDIO_MINUTES_GOAL = 30

export function longestWorkout(
  snapshot: Pick<DailyHealthSnapshot, 'date' | 'workouts'> | null,
  kind: HealthWorkout['kind'],
): HealthWorkout | null {
  let longest: HealthWorkout | null = null
  for (const workout of snapshot?.workouts ?? []) {
    const start = new Date(workout.startISO)
    if (
      workout.kind !== kind ||
      !Number.isFinite(start.getTime()) ||
      localDateKey(start) !== snapshot?.date ||
      !Number.isFinite(workout.durationMinutes) ||
      workout.durationMinutes < 0
    ) {
      continue
    }
    if (!longest || workout.durationMinutes > longest.durationMinutes) {
      longest = workout
    }
  }
  return longest
}

export function summarizeMorningWeights(
  samples: HealthBodyMassSample[] | null,
  date: Date,
) {
  const currentStart = new Date(date)
  currentStart.setHours(0, 0, 0, 0)
  currentStart.setDate(currentStart.getDate() - 6)
  const previousStart = new Date(currentStart)
  previousStart.setDate(previousStart.getDate() - 7)
  const end = new Date(date)
  end.setHours(0, 0, 0, 0)
  end.setDate(end.getDate() + 1)

  const mornings = new Map<string, HealthBodyMassSample>()
  for (const sample of samples ?? []) {
    const measuredAt = new Date(sample.startISO)
    if (
      !Number.isFinite(measuredAt.getTime()) ||
      !Number.isFinite(sample.kilograms) ||
      sample.kilograms < 0 ||
      measuredAt < previousStart ||
      measuredAt >= end ||
      measuredAt.getHours() >= 12
    ) {
      continue
    }
    const key = localDateKey(measuredAt)
    const first = mornings.get(key)
    if (!first || measuredAt < new Date(first.startISO)) {
      mornings.set(key, sample)
    }
  }

  const current: number[] = []
  const previous: number[] = []
  for (const [day, sample] of mornings) {
    const values = day >= localDateKey(currentStart) ? current : previous
    values.push(sample.kilograms)
  }
  const average = (values: number[]) =>
    values.length > 0
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null

  return {
    morning: mornings.get(localDateKey(date)) ?? null,
    currentAverageKg: average(current),
    previousAverageKg: average(previous),
    currentDays: current.length,
    previousDays: previous.length,
  }
}
