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
  presentRecovery,
  presentRestingHr,
  presentSleep,
  presentSteps,
} from './presenter'
import type { MetricPresentation } from './types'

export * from './presenter'
export * from './types'

export function useFitnessMetricsDashboard(): MetricPresentation[] {
  const { snapshot } = useHealthSnapshot()

  const recovery = useRecoveryPresentation({
    hrv: snapshot?.hrv ?? null,
    restingHR: snapshot?.restingHeartRate ?? null,
    sleepHours: snapshot?.sleepHours ?? null,
    hrvBaseline: null,
    rhrBaseline: null,
    sleepGoalHours: DASHBOARD_GOALS.sleepGoalHours,
  })

  return useMemo(
    () => [
      presentRecovery(recovery),
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
