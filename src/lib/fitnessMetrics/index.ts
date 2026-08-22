import { useMemo } from 'react'

import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useRecoveryPresentation } from '@/utils/recovery'

import {
  DASHBOARD_GOALS,
  presentBodyMass,
  presentCalories,
  presentFlightsClimbed,
  presentHeartRate,
  presentHrv,
  presentHydration,
  presentNutritionIntake,
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
      presentNutritionIntake(snapshot),
      presentSleep(snapshot),
      presentHydration(snapshot),
      presentHeartRate(snapshot),
      presentHrv(snapshot),
      presentRestingHr(snapshot),
      presentFlightsClimbed(snapshot),
      presentBodyMass(snapshot),
    ],
    [snapshot, recovery],
  )
}
