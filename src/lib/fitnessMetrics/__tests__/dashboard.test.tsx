import { renderHook } from '@testing-library/react-native'

import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import type { DailyHydrationSummary } from '@/stores/HydrationStore'

import { useFitnessMetricsDashboard } from '..'

const mockUseHealthSnapshot = jest.fn()
const mockUseDailyHydration = jest.fn()
const mockUseReadiness = jest.fn()
const mockUseDailyNutrition = jest.fn()

jest.mock('@/hooks/useHealthSnapshot', () => ({
  useHealthSnapshot: () => mockUseHealthSnapshot(),
}))

jest.mock('@/stores/HydrationStore', () => ({
  useDailyHydration: () => mockUseDailyHydration(),
}))

jest.mock('@/hooks/useReadiness', () => ({
  useReadiness: () => mockUseReadiness(),
}))

jest.mock('@/stores/MealStore', () => ({
  useDailyNutrition: () => mockUseDailyNutrition(),
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

const recovery = {
  recoveryScore: 80,
}

const nutrition = {
  date: '2026-02-20',
  meals: [],
  totals: { caloriesKcal: 800, proteinG: 60, carbG: 100, fatG: 20 },
  remaining: { caloriesKcal: 1400, proteinG: 90, carbG: 150, fatG: 50 },
  progress: { calories: 800 / 2200, protein: 0.4, carb: 0.4, fat: 0.3 },
  targets: { caloriesKcal: 2200, proteinG: 150, carbG: 250, fatG: 70 },
}

describe('useFitnessMetricsDashboard', () => {
  beforeEach(() => {
    mockUseHealthSnapshot.mockReturnValue({ snapshot: snapshot() })
    mockUseDailyHydration.mockReturnValue(hydration)
    mockUseReadiness.mockReturnValue(recovery)
    mockUseDailyNutrition.mockReturnValue(nutrition)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('composes the dashboard Interface from health, recovery, hydration, and nutrition Modules', () => {
    const { result } = renderHook(() => useFitnessMetricsDashboard())

    expect(result.current).toHaveLength(10)
    expect(result.current[0]?.id).toBe('recovery')
    expect(result.current[result.current.length - 1]?.id).toBe(
      'flights-climbed',
    )
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
    ])
    expect(result.current[3]).toMatchObject({
      id: 'nutrition-intake',
      value: '800',
      status: 'progress',
    })
    expect(result.current[5]).toMatchObject({
      id: 'hydration',
      value: '1,000',
      route: '/hydration',
      status: 'progress',
    })
  })
})
