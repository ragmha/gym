import { renderHook } from '@testing-library/react-native'

import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'

import { useFitnessMetricsDashboard } from '..'

const mockUseHealthSnapshot = jest.fn()

jest.mock('@/hooks/useHealthSnapshot', () => ({
  useHealthSnapshot: () => mockUseHealthSnapshot(),
}))

function snapshot(
  overrides: Partial<DailyHealthSnapshot> = {},
): DailyHealthSnapshot {
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
    ...overrides,
  }
}

const missingSnapshot = snapshot({
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
})

describe('useFitnessMetricsDashboard', () => {
  beforeEach(() => {
    mockUseHealthSnapshot.mockReturnValue({ snapshot: snapshot() })
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

  it.each([null, missingSnapshot])(
    'does not manufacture any values for unavailable health data: %j',
    (snapshot) => {
      mockUseHealthSnapshot.mockReturnValue({ snapshot })

      const { result } = renderHook(() => useFitnessMetricsDashboard())

      for (const metric of result.current) {
        expect(metric).toMatchObject({
          value: '--',
          progress: 0,
          status: 'empty',
        })
      }
      expect(result.current[0]).toMatchObject({
        subtitle: 'Not enough recovery data',
        accentColorToken: 'disabled',
      })
    },
  )

  it.each(['hrv', 'restingHeartRate', 'sleepHours'] as const)(
    'keeps recovery unavailable when %s is missing from a partial snapshot',
    (missingMetric) => {
      mockUseHealthSnapshot.mockReturnValue({
        snapshot: snapshot({ [missingMetric]: null }),
      })

      const { result } = renderHook(() => useFitnessMetricsDashboard())

      expect(result.current[0]).toMatchObject({
        value: '--',
        accentColorToken: 'disabled',
      })
      expect(
        result.current.find((metric) => metric.id === 'steps'),
      ).toMatchObject({
        value: '5,000',
      })
    },
  )

  it('keeps the complete-input recovery score and a genuine zero score', () => {
    mockUseHealthSnapshot.mockReturnValue({
      snapshot: snapshot({ hrv: 50, restingHeartRate: 65, sleepHours: 8 }),
    })
    const { result, rerender } = renderHook(() => useFitnessMetricsDashboard())

    expect(result.current[0]).toMatchObject({
      value: '85',
      accentColorToken: 'success',
    })

    mockUseHealthSnapshot.mockReturnValue({
      snapshot: snapshot({ hrv: 0, restingHeartRate: 100, sleepHours: 0 }),
    })
    rerender({})

    expect(result.current[0]).toMatchObject({
      value: '0',
      accentColorToken: 'danger',
      status: 'progress',
    })
  })
})
