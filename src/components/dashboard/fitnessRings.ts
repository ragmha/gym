import type { MetricRing } from '@/components/dashboard/WorkoutXPCard'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'

export const SLEEP_GOAL_HOURS = 8

const GOALS = {
  calories: 600,
  waterLiters: 2.5,
  steps: 10_000,
  cardioMinutes: 45,
} as const

const round1 = (value: number) => Math.round(value * 10) / 10

/**
 * Builds the five dashboard rings from a HealthKit snapshot.
 *
 * Every value here is read from Health — nothing is entered by hand — so a
 * missing snapshot renders empty rings rather than a blank screen.
 */
export function buildFitnessRings(
  snapshot: DailyHealthSnapshot | null,
): MetricRing[] {
  const workouts = snapshot?.workouts ?? []
  const cardioMinutes = Math.round(
    workouts.reduce((sum, w) => sum + (w.durationMinutes ?? 0), 0),
  )

  return [
    {
      label: 'Calories',
      value: snapshot?.calories ?? 0,
      goal: GOALS.calories,
      unit: 'kcal',
      color: '#FF6B35',
      icon: 'flame',
    },
    {
      label: 'Hydration',
      value: round1(snapshot?.waterLiters ?? 0),
      goal: GOALS.waterLiters,
      unit: 'L',
      color: '#2563EB',
      icon: 'water',
    },
    {
      label: 'Sleep',
      value: round1(snapshot?.sleepHours ?? 0),
      goal: SLEEP_GOAL_HOURS,
      unit: 'hrs',
      color: '#30D158',
      icon: 'moon',
    },
    {
      label: 'Steps',
      value: snapshot?.steps ?? 0,
      goal: GOALS.steps,
      unit: 'steps',
      color: '#0EA5E9',
      icon: 'footsteps',
    },
    {
      label: 'Cardio',
      value: cardioMinutes,
      goal: GOALS.cardioMinutes,
      unit: 'min',
      color: '#E8707A',
      icon: 'heart-circle',
    },
  ]
}
