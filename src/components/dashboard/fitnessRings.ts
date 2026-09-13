import type { MetricRing } from '@/components/dashboard/WorkoutXPCard'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'

export const SLEEP_GOAL_HOURS = 8

const GOALS = {
  calories: 600,
  waterLiters: 2.5,
  steps: 10_000,
  workoutMinutes: 45,
} as const

const round1 = (value: number | null) =>
  value === null ? null : Math.round(value * 10) / 10

/**
 * Builds the five dashboard rings from a HealthKit snapshot.
 *
 * Every value here is read from Health — nothing is entered by hand — so a
 * missing measurement stays null; only the ring geometry defaults to zero.
 */
export function buildFitnessRings(
  snapshot: DailyHealthSnapshot | null,
): MetricRing[] {
  const workouts = snapshot?.workouts ?? []
  // An empty query can also mean no read access, not a measured zero.
  const workoutMinutes =
    workouts.length > 0 &&
    workouts.every(
      ({ durationMinutes }) =>
        Number.isFinite(durationMinutes) && durationMinutes >= 0,
    )
      ? Math.round(workouts.reduce((sum, w) => sum + w.durationMinutes, 0))
      : null

  return [
    {
      label: 'Calories',
      value: snapshot?.calories ?? null,
      goal: GOALS.calories,
      unit: 'kcal',
      color: '#FF6B35',
      icon: 'flame',
    },
    {
      label: 'Hydration',
      value: round1(snapshot?.waterLiters ?? null),
      goal: GOALS.waterLiters,
      unit: 'L',
      color: '#2563EB',
      icon: 'water',
    },
    {
      label: 'Sleep',
      value: round1(snapshot?.sleepHours ?? null),
      goal: SLEEP_GOAL_HOURS,
      unit: 'hrs',
      color: '#30D158',
      icon: 'moon',
    },
    {
      label: 'Steps',
      value: snapshot?.steps ?? null,
      goal: GOALS.steps,
      unit: 'steps',
      color: '#0EA5E9',
      icon: 'footsteps',
    },
    {
      label: 'Workouts',
      value: workoutMinutes,
      goal: GOALS.workoutMinutes,
      unit: 'min',
      color: '#E8707A',
      icon: 'heart-circle',
    },
  ]
}
