import type { DailyCoachContext } from '@/lib/coach/types'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import { computeRecoveryScore, type RecoveryResult } from '@/utils/recovery'

export type EvaluationSplit = 'tuning' | 'held-out'
export type EvaluationFixture = {
  id: string
  split: EvaluationSplit
} & (
  | { kind: 'daily-insight'; context: DailyCoachContext }
  | {
      kind: 'meal-estimate'
      labels: { label: string; confidence: number }[]
    }
)

const baseline: DailyHealthSnapshot = {
  date: '2026-06-12',
  steps: 8200,
  calories: 380,
  sleepHours: 7.5,
  heartRate: 70,
  hrv: 58,
  restingHeartRate: 62,
  waterLiters: 1.5,
  flightsClimbed: 8,
  bodyMassKg: 81.4,
  bodyMassHistory: null,
  dietaryCalories: 1800,
  workouts: [],
}

const missing: DailyHealthSnapshot = {
  ...baseline,
  steps: null,
  calories: null,
  sleepHours: null,
  heartRate: null,
  hrv: null,
  restingHeartRate: null,
  waterLiters: null,
  flightsClimbed: null,
  bodyMassKg: null,
  dietaryCalories: null,
}

function insight(
  id: string,
  split: EvaluationSplit,
  snapshot: DailyHealthSnapshot,
  recovery: RecoveryResult | null = computeRecoveryScore({
    hrv: snapshot.hrv,
    restingHR: snapshot.restingHeartRate,
    sleepHours: snapshot.sleepHours,
  }),
): EvaluationFixture {
  return {
    id,
    split,
    kind: 'daily-insight',
    context: { dateISO: snapshot.date, snapshot, recovery },
  }
}

// These fixtures belong only to developer evaluations, never product fallbacks.
export const AI_EVALUATION_FIXTURES: readonly EvaluationFixture[] = [
  insight('insight-populated', 'tuning', baseline),
  {
    id: 'meal-specific-labels',
    split: 'tuning',
    kind: 'meal-estimate',
    labels: [
      { label: 'food', confidence: 0.95 },
      { label: 'pizza', confidence: 0.86 },
      { label: 'baked_goods', confidence: 0.4 },
    ],
  },
  insight('insight-all-missing', 'held-out', missing),
  insight('insight-observed-zero', 'held-out', {
    ...missing,
    steps: 0,
    calories: 0,
    waterLiters: 0,
    flightsClimbed: 0,
    dietaryCalories: 0,
  }),
  insight('insight-no-recovery', 'held-out', { ...baseline, hrv: null }, null),
  insight('insight-long-input', 'held-out', {
    ...baseline,
    workouts: [
      {
        kind: 'other',
        activityName: 'Synthetic walking activity '.repeat(100).trim(),
        averageHeartRate: null,
        calories: null,
        distance: null,
        durationMinutes: 20,
        startISO: '2026-06-12T08:00:00.000Z',
        endISO: '2026-06-12T08:20:00.000Z',
      },
    ],
  }),
  {
    id: 'meal-ambiguous-labels',
    split: 'held-out',
    kind: 'meal-estimate',
    labels: [
      { label: 'food', confidence: 0.8 },
      { label: 'soup', confidence: 0.35 },
      { label: 'salad', confidence: 0.33 },
    ],
  },
]
