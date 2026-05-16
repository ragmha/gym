import { useMemo } from 'react'

import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useRecoveryPresentation } from '@/utils/recovery'
import { useDailyHydration } from '@/stores/HydrationStore'
import { useDailyNutrition } from '@/stores/MealStore'

import {
  DASHBOARD_GOALS,
  presentCalories,
  presentFlightsClimbed,
  presentHeartRate,
  presentHrv,
  presentRestingHr,
  presentSleep,
  presentSteps,
} from './presenter'
import type { MetricPresentation } from './types'

export * from './presenter'
export * from './types'

export function useFitnessMetricsDashboard(): MetricPresentation[] {
  const { snapshot } = useHealthSnapshot()

  const sleepHours = snapshot?.sleepHours ?? 0
  const hrv = snapshot?.hrv ?? 0
  const restingHeartRate = snapshot?.restingHeartRate ?? 0

  const recovery = useRecoveryPresentation({
    hrv,
    restingHR: restingHeartRate,
    sleepHours,
    hrvBaseline: null,
    rhrBaseline: null,
    sleepGoalHours: DASHBOARD_GOALS.sleepGoalHours,
  })
  const hydration = useDailyHydration()
  const nutrition = useDailyNutrition()

  return useMemo(
    () => [
      {
        id: 'recovery',
        label: 'Recovery Score',
        value: `${recovery.score}`,
        unit: '%',
        subtitle: recovery.label,
        iconName: 'shield-checkmark',
        accentColorToken: recovery.accentColorToken,
        progress: Math.min(Math.max(recovery.score / 100, 0), 1),
        status:
          recovery.score <= 0
            ? 'empty'
            : recovery.score >= 100
              ? 'reached'
              : 'progress',
      },
      presentSteps(snapshot),
      presentCalories(snapshot),
      {
        id: 'nutrition-intake',
        label: 'Calories Eaten',
        value:
          nutrition.totals.caloriesKcal > 0
            ? Math.round(nutrition.totals.caloriesKcal).toLocaleString()
            : '--',
        unit: 'kcal',
        subtitle: `Goal: ${nutrition.targets.caloriesKcal.toLocaleString()} kcal`,
        iconName: 'restaurant',
        accentColorToken: 'metricNutrition',
        progress: Math.min(Math.max(nutrition.progress.calories, 0), 1),
        route: '/nutrition',
        status:
          nutrition.totals.caloriesKcal === 0
            ? 'empty'
            : nutrition.totals.caloriesKcal >= nutrition.targets.caloriesKcal
              ? nutrition.totals.caloriesKcal >
                nutrition.targets.caloriesKcal * 1.05
                ? 'over'
                : 'reached'
              : 'progress',
      },
      presentSleep(snapshot),
      {
        id: 'hydration',
        label: 'Hydration',
        value: hydration.totalMl > 0 ? hydration.formattedTotal : '--',
        unit: 'ml',
        subtitle: `Goal: ${hydration.goalMl} ml`,
        iconName: 'water',
        accentColorToken: 'metricHydration',
        progress: Math.min(Math.max(hydration.progress, 0), 1),
        route: '/hydration',
        status: hydration.status,
      },
      presentHeartRate(snapshot),
      presentHrv(snapshot),
      presentRestingHr(snapshot),
      presentFlightsClimbed(snapshot),
    ],
    [snapshot, recovery, hydration, nutrition],
  )
}
