import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import type { RecoveryPresentation } from '@/utils/recovery'

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
  dietaryCaloriesGoal: 2_200,
  waterLitersGoal: 2.5,
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
  | 'waterLiters'
  | 'dietaryCalories'
  | 'bodyMassKg'
>

export function presentRecovery(
  recovery: RecoveryPresentation | null,
): MetricPresentation {
  return {
    id: 'recovery',
    label: 'Recovery Score',
    value: recovery ? `${recovery.score}` : '--',
    unit: '%',
    subtitle: recovery?.label ?? 'Not enough recovery data',
    iconName: 'shield-checkmark',
    accentColorToken: recovery?.accentColorToken ?? 'disabled',
    progress: recovery ? clamp(recovery.score / 100) : 0,
    status: recovery === null ? 'empty' : goalStatus(recovery.score, 100),
  }
}

export function presentNutritionIntake(
  snapshot: DailyHealthSnapshot | null,
): MetricPresentation {
  const eaten = readMetric(snapshot, 'dietaryCalories')

  return goalMetric({
    id: 'nutrition-intake',
    label: 'Calories Eaten',
    value: formatWhole(eaten),
    unit: 'kcal',
    subtitle: `Goal: ${DASHBOARD_GOALS.dietaryCaloriesGoal.toLocaleString()} kcal`,
    iconName: 'restaurant',
    accentColorToken: 'metricNutrition',
    actual: eaten,
    goal: DASHBOARD_GOALS.dietaryCaloriesGoal,
  })
}

export function presentHydration(
  snapshot: DailyHealthSnapshot | null,
): MetricPresentation {
  const liters = readMetric(snapshot, 'waterLiters')

  return goalMetric({
    id: 'hydration',
    label: 'Hydration',
    value: liters !== null ? liters.toFixed(1) : '--',
    unit: 'L',
    subtitle: `Goal: ${DASHBOARD_GOALS.waterLitersGoal} L`,
    iconName: 'water',
    accentColorToken: 'metricHydration',
    actual: liters,
    goal: DASHBOARD_GOALS.waterLitersGoal,
  })
}

export function presentBodyMass(
  snapshot: DailyHealthSnapshot | null,
): MetricPresentation {
  const bodyMassKg = snapshot?.bodyMassKg ?? null

  return {
    id: 'body-mass',
    label: 'Weight',
    value: bodyMassKg != null ? bodyMassKg.toFixed(1) : '--',
    unit: 'kg',
    subtitle: 'Latest weigh-in',
    iconName: 'body',
    accentColorToken: 'metricWeight',
    // Weight has no universal goal, so the ring stays neutral rather than
    // implying a target the user never set.
    progress: 0,
    status: bodyMassKg == null ? 'empty' : 'progress',
  }
}

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
    value: sleepHours !== null ? sleepHours.toFixed(1) : '--',
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
    value: heartRate !== null ? `${heartRate}` : '--',
    unit: 'bpm',
    subtitle: 'Latest reading',
    iconName: 'heart',
    accentColorToken: 'metricHeart',
    progress:
      heartRate !== null && heartRate > 0
        ? clamp(1 - (heartRate - hrMin) / (hrMax - hrMin))
        : 0,
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
    value: hrv !== null ? `${hrv}` : '--',
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
    value: restingHeartRate !== null ? `${restingHeartRate}` : '--',
    unit: 'bpm',
    subtitle: 'Resting heart rate',
    iconName: 'heart-half',
    accentColorToken: 'metricRestingHr',
    progress:
      restingHeartRate !== null && restingHeartRate > 0
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
    value: flightsClimbed !== null ? `${flightsClimbed}` : '--',
    subtitle: 'Floors climbed today',
    iconName: 'trending-up',
    accentColorToken: 'metricFlights',
    actual: flightsClimbed,
    goal: DASHBOARD_GOALS.flightsGoal,
  })
}

function goalMetric(
  params: Omit<MetricPresentation, 'progress' | 'status'> & {
    actual: number | null
    goal: number
  },
): MetricPresentation {
  const { actual, goal, ...presentation } = params

  return {
    ...presentation,
    progress: actual !== null && goal > 0 ? clamp(actual / goal) : 0,
    status: goalStatus(actual, goal),
  }
}

function goalStatus(actual: number | null, goal: number): MetricStatus {
  if (actual === null) {
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

function bandStatus(
  actual: number | null,
  min: number,
  max: number,
): MetricStatus {
  if (actual === null) {
    return 'empty'
  }

  if (actual <= 0) {
    return 'progress'
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
): number | null {
  return snapshot?.[key] ?? null
}

function formatWhole(value: number | null): string {
  return value !== null ? value.toLocaleString() : '--'
}

function clamp(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}
