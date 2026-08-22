import { renderHook } from '@testing-library/react-native'

import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import type { RecoveryPresentation } from '@/utils/recovery'

import { useFitnessMetricsDashboard } from '..'

const mockUseHealthSnapshot = jest.fn()
const mockUseRecoveryPresentation = jest.fn()

jest.mock('@/hooks/useHealthSnapshot', () => ({
  useHealthSnapshot: () => mockUseHealthSnapshot(),
}))

jest.mock('@/utils/recovery', () => ({
  useRecoveryPresentation: (input: unknown) =>
    mockUseRecoveryPresentation(input),
}))

function snapshot(): DailyHealthSnapshot {
  return {
    date: '2026-02-20',
    steps: 5_000,
    calories: 300,
    sleepHours: 7.5,
    heartRate: 125,
    hrv: 40,
    restingHeartRate: 45,
    waterLiters: 1.5,
    flightsClimbed: 10,
    bodyMassKg: 78.5,
    dietaryCalories: 2_100,
    workouts: [],
  }
}

const recovery: RecoveryPresentation = {
  score: 80,
  label: 'Primed to Perform',
  description: 'Ready',
  tone: 'primed',
  accentColorToken: 'success',
  shortHint: 'Ready for higher intensity.',
}

describe('useFitnessMetricsDashboard', () => {
  beforeEach(() => {
    mockUseHealthSnapshot.mockReturnValue({ snapshot: snapshot() })
    mockUseRecoveryPresentation.mockReturnValue(recovery)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('composes every dashboard metric from the health snapshot and recovery alone', () => {
    const { result } = renderHook(() => useFitnessMetricsDashboard())

    expect(result.current.map((metric) => metric.id)).toEqual([
      'recovery',
      'steps',
      'calories',
      'nutrition-intake',
      'sleep',
      'hydration',
      'heart-rate',
      'hrv',
      'resting-hr',
      'flights-climbed',
      'body-mass',
    ])
  })

  it('reads intake, hydration and weight from HealthKit rather than manual stores', () => {
    const { result } = renderHook(() => useFitnessMetricsDashboard())
    const byId = new Map(result.current.map((metric) => [metric.id, metric]))

    expect(byId.get('nutrition-intake')).toMatchObject({
      value: '2,100',
      unit: 'kcal',
      status: 'progress',
    })
    expect(byId.get('hydration')).toMatchObject({
      value: '1.5',
      unit: 'L',
      status: 'progress',
    })
    expect(byId.get('body-mass')).toMatchObject({
      value: '78.5',
      unit: 'kg',
      status: 'progress',
    })
  })

  it('renders an absent weigh-in as empty rather than zero', () => {
    mockUseHealthSnapshot.mockReturnValue({
      snapshot: { ...snapshot(), bodyMassKg: null },
    })

    const { result } = renderHook(() => useFitnessMetricsDashboard())
    const bodyMass = result.current.find((metric) => metric.id === 'body-mass')

    expect(bodyMass).toMatchObject({ value: '--', status: 'empty' })
  })
})
