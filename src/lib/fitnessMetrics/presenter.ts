import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'

import type { MetricPresentation, MetricStatus } from './types'
import { METRIC_IDS } from './types'

export const DASHBOARD_GOALS = {
  stepsGoal: 10_000,
  caloriesGoal: 600,
  sleepGoalHours: 8,
  hrvOptimal: 80,
  hrMin: 50,
  hrMax: 200,
  restingHrMin: 40,
  restingHrMax: 100,
  flightsGoal: 20,
} as const

export const FITNESS_METRIC_ORDER = METRIC_IDS

type SnapshotMetric = keyof Pick<
  DailyHealthSnapshot,
  | 'steps'
  | 'calories'
  | 'sleepHours'
  | 'heartRate'
  | 'hrv'
  | 'restingHeartRate'
  | 'flightsClimbed'
>

export function presentSteps(
  snapshot: DailyHealthSnapshot | null,
): MetricPresentation {
  const steps = readMetric(snapshot, 'steps')

  return goalMetric({
    id: 'steps',
    label: 'Steps',
    value: formatWhole(steps),
    subtitle: `Goal: ${DASHBOARD_GOALS.stepsGoal.toLocaleString()}`,
    iconName: 'footsteps',
    accentColorToken: 'metricSteps',
    route: '/steps',
    actual: steps,
    goal: DASHBOARD_GOALS.stepsGoal,
  })
}

export function presentCalories(
  snapshot: DailyHealthSnapshot | null,
): MetricPresentation {
  const calories = readMetric(snapshot, 'calories')

  return goalMetric({
    id: 'calories',
    label: 'Calories',
    value: formatWhole(calories),
    unit: 'kcal',
    subtitle: `Goal: ${DASHBOARD_GOALS.caloriesGoal} kcal`,
    iconName: 'flame',
    accentColorToken: 'metricCalories',
    actual: calories,
    goal: DASHBOARD_GOALS.caloriesGoal,
  })
}

export function presentSleep(
  snapshot: DailyHealthSnapshot | null,
): MetricPresentation {
  const sleepHours = readMetric(snapshot, 'sleepHours')

  return goalMetric({
    id: 'sleep',
    label: 'Sleep',
    value: sleepHours > 0 ? sleepHours.toFixed(1) : '--',
    unit: 'hrs',
    subtitle: `Goal: ${DASHBOARD_GOALS.sleepGoalHours} hrs`,
    iconName: 'moon',
    accentColorToken: 'metricSleep',
    actual: sleepHours,
    goal: DASHBOARD_GOALS.sleepGoalHours,
  })
}

export function presentHeartRate(
  snapshot: DailyHealthSnapshot | null,
): MetricPresentation {
  const heartRate = readMetric(snapshot, 'heartRate')
  const { hrMin, hrMax } = DASHBOARD_GOALS

  return {
    id: 'heart-rate',
    label: 'Heart Rate',
    value: heartRate > 0 ? `${heartRate}` : '--',
    unit: 'bpm',
    subtitle: 'Latest reading',
    iconName: 'heart',
    accentColorToken: 'metricHeart',
    progress:
      heartRate > 0 ? clamp(1 - (heartRate - hrMin) / (hrMax - hrMin)) : 0,
    status: bandStatus(heartRate, hrMin, hrMax),
  }
}

export function presentHrv(
  snapshot: DailyHealthSnapshot | null,
): MetricPresentation {
  const hrv = readMetric(snapshot, 'hrv')

  return goalMetric({
    id: 'hrv',
    label: 'HRV',
    value: hrv > 0 ? `${hrv}` : '--',
    unit: 'ms',
    subtitle: 'Heart rate variability',
    iconName: 'pulse',
    accentColorToken: 'metricHrv',
    actual: hrv,
    goal: DASHBOARD_GOALS.hrvOptimal,
  })
}

export function presentRestingHr(
  snapshot: DailyHealthSnapshot | null,
): MetricPresentation {
  const restingHeartRate = readMetric(snapshot, 'restingHeartRate')
  const { restingHrMin, restingHrMax } = DASHBOARD_GOALS

  return {
    id: 'resting-hr',
    label: 'Resting HR',
    value: restingHeartRate > 0 ? `${restingHeartRate}` : '--',
    unit: 'bpm',
    subtitle: 'Resting heart rate',
    iconName: 'heart-half',
    accentColorToken: 'metricRestingHr',
    progress:
      restingHeartRate > 0
        ? clamp(
            1 -
              (restingHeartRate - restingHrMin) / (restingHrMax - restingHrMin),
          )
        : 0,
    status: bandStatus(restingHeartRate, restingHrMin, restingHrMax),
  }
}

export function presentFlightsClimbed(
  snapshot: DailyHealthSnapshot | null,
): MetricPresentation {
  const flightsClimbed = readMetric(snapshot, 'flightsClimbed')

  return goalMetric({
    id: 'flights-climbed',
    label: 'Flights Climbed',
    value: flightsClimbed > 0 ? `${flightsClimbed}` : '--',
    subtitle: 'Floors climbed today',
    iconName: 'trending-up',
    accentColorToken: 'metricFlights',
    actual: flightsClimbed,
    goal: DASHBOARD_GOALS.flightsGoal,
  })
}

function goalMetric(
  params: Omit<MetricPresentation, 'progress' | 'status'> & {
    actual: number
    goal: number
  },
): MetricPresentation {
  const { actual, goal, ...presentation } = params

  return {
    ...presentation,
    progress: goal > 0 ? clamp(actual / goal) : 0,
    status: goalStatus(actual, goal),
  }
}

function goalStatus(actual: number, goal: number): MetricStatus {
  if (actual <= 0) {
    return 'empty'
  }

  if (actual > goal) {
    return 'over'
  }

  if (actual === goal) {
    return 'reached'
  }

  return 'progress'
}

function bandStatus(actual: number, min: number, max: number): MetricStatus {
  if (actual <= 0) {
    return 'empty'
  }

  if (actual > max) {
    return 'over'
  }

  if (actual <= min) {
    return 'reached'
  }

  return 'progress'
}

function readMetric(
  snapshot: DailyHealthSnapshot | null,
  key: SnapshotMetric,
): number {
  return snapshot?.[key] ?? 0
}

function formatWhole(value: number): string {
  return value > 0 ? value.toLocaleString() : '--'
}

function clamp(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}
