import { useMemo } from 'react'

import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useReadiness } from '@/hooks/useReadiness'
import { presentRecoveryScore } from '@/lib/recovery'
import { useDailyHydration } from '@/stores/HydrationStore'
import { useDailyNutrition } from '@/stores/MealStore'

import {
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
  const { recoveryScore } = useReadiness()

  const hydration = useDailyHydration()
  const nutrition = useDailyNutrition()

  return useMemo(() => {
    const score = recoveryScore ?? 0
    const recovery = presentRecoveryScore({ score, label: '', description: '' })

    return [
      {
        id: 'recovery',
        label: 'Recovery Score',
        value: `${score}`,
        unit: '%',
        subtitle: recovery.label,
        iconName: 'shield-checkmark',
        accentColorToken: recovery.accentColorToken,
        progress: Math.min(Math.max(score / 100, 0), 1),
        status: score <= 0 ? 'empty' : score >= 100 ? 'reached' : 'progress',
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
    ]
  }, [snapshot, recoveryScore, hydration, nutrition])
}
