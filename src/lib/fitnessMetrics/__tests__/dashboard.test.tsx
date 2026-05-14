import { renderHook } from '@testing-library/react-native'

import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import type { RecoveryPresentation } from '@/lib/recovery'
import type { DailyHydrationSummary } from '@/stores/HydrationStore'

import { useFitnessMetricsDashboard } from '..'

const mockUseHealthSnapshot = jest.fn()
const mockUseDailyHydration = jest.fn()
const mockUseRecoveryPresentation = jest.fn()

jest.mock('@/hooks/useHealthSnapshot', () => ({
  useHealthSnapshot: () => mockUseHealthSnapshot(),
}))

jest.mock('@/stores/HydrationStore', () => ({
  useDailyHydration: () => mockUseDailyHydration(),
}))

jest.mock('@/lib/recovery', () => ({
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
    waterLiters: null,
    flightsClimbed: 10,
    workouts: [],
  }
}

const hydration: DailyHydrationSummary = {
  todayEntries: [],
  totalMl: 1_000,
  remainingMl: 1_000,
  goalMl: 2_000,
  progress: 0.5,
  percentOfGoal: 50,
  goalReached: false,
  status: 'progress',
  formattedTotal: '1,000',
  formattedRemaining: '1,000',
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
    mockUseDailyHydration.mockReturnValue(hydration)
    mockUseRecoveryPresentation.mockReturnValue(recovery)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('composes the dashboard Interface from health, recovery, and hydration Modules', () => {
    const { result } = renderHook(() => useFitnessMetricsDashboard())

    expect(result.current).toHaveLength(9)
    expect(result.current[0]?.id).toBe('recovery')
    expect(result.current[result.current.length - 1]?.id).toBe(
      'flights-climbed',
    )
    expect(result.current.map((metric) => metric.id)).toEqual([
      'recovery',
      'steps',
      'calories',
      'sleep',
      'hydration',
      'heart-rate',
      'hrv',
      'resting-hr',
      'flights-climbed',
    ])
    expect(result.current[4]).toMatchObject({
      id: 'hydration',
      value: '1,000',
      route: '/hydration',
      status: 'progress',
    })
  })
})
