import { act, renderHook } from '@testing-library/react-native'

import type { ReadinessMetric, ReadinessSummary } from '@/hooks/useReadiness'
import { useReadiness } from '@/hooks/useReadiness'
import { computeTodaySuggestion } from '@/hooks/useTodaySuggestion'
import type { WeeklyTrainingResult } from '@/hooks/useWeeklyTraining'
import { useWeeklyTraining } from '@/hooks/useWeeklyTraining'

jest.mock('@/hooks/useReadiness', () => ({
  useReadiness: jest.fn(),
}))
jest.mock('@/hooks/useWeeklyTraining', () => ({
  useWeeklyTraining: jest.fn(),
}))

const mockReadiness = useReadiness as jest.MockedFunction<typeof useReadiness>
const mockTraining = useWeeklyTraining as jest.MockedFunction<
  typeof useWeeklyTraining
>

// Import after mock declarations so Jest hoisting works correctly.
// eslint-disable-next-line import/first
import { useTodaySnapshot } from '../useTodaySnapshot'

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function metric(
  value: number,
  baseline: number,
  direction: ReadinessMetric['direction'],
): ReadinessMetric {
  return { value, baseline, delta: value - baseline, direction }
}

function makeReadiness(
  overrides: Partial<ReadinessSummary> = {},
): ReadinessSummary {
  return {
    status: 'ready',
    isDemoMode: false,
    hrv: metric(50, 50, 'neutral'),
    restingHeartRate: metric(55, 55, 'neutral'),
    sleepHours: metric(7.5, 7.5, 'neutral'),
    recoveryScore: 75,
    refresh: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeTraining(
  overrides: Partial<WeeklyTrainingResult> = {},
): WeeklyTrainingResult {
  return {
    status: 'ready',
    error: null,
    sessions: [],
    weekly: [],
    dailyBars: [],
    targets: {
      strengthMinutes: 180,
      runMinutes: 180,
      conditioningMinutes: 120,
      source: 'fallback',
      weeksObserved: 0,
    },
    acwr: {
      value: null,
      status: 'unavailable',
      acuteMinutes: 0,
      chronicMinutes: 0,
    },
    refresh: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------

describe('useTodaySnapshot', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  // Behavior 1 — status is 'loading' when readiness is loading
  it('status is loading when readiness is loading', () => {
    mockReadiness.mockReturnValue(makeReadiness({ status: 'loading' }))
    mockTraining.mockReturnValue(makeTraining({ status: 'ready' }))

    const { result } = renderHook(() => useTodaySnapshot())
    expect(result.current.status).toBe('loading')
  })

  // Behavior 2 — status is 'loading' when training is loading (readiness ready)
  it('status is loading when training is loading and readiness is ready', () => {
    mockReadiness.mockReturnValue(makeReadiness({ status: 'ready' }))
    mockTraining.mockReturnValue(makeTraining({ status: 'loading' }))

    const { result } = renderHook(() => useTodaySnapshot())
    expect(result.current.status).toBe('loading')
  })

  // Behavior 3 — status is 'ready' when both are ready
  it('status is ready when both readiness and training are ready', () => {
    mockReadiness.mockReturnValue(makeReadiness({ status: 'ready' }))
    mockTraining.mockReturnValue(makeTraining({ status: 'ready' }))

    const { result } = renderHook(() => useTodaySnapshot())
    expect(result.current.status).toBe('ready')
  })

  // Behavior 4 — status is 'error' only when BOTH sources error
  it('status is error only when both readiness and training are error', () => {
    mockReadiness.mockReturnValue(makeReadiness({ status: 'error' }))
    mockTraining.mockReturnValue(makeTraining({ status: 'error' }))

    const { result } = renderHook(() => useTodaySnapshot())
    expect(result.current.status).toBe('error')
  })

  it('status is ready when readiness errors but training is ready (partial data is useful)', () => {
    mockReadiness.mockReturnValue(makeReadiness({ status: 'error' }))
    mockTraining.mockReturnValue(makeTraining({ status: 'ready' }))

    const { result } = renderHook(() => useTodaySnapshot())
    expect(result.current.status).toBe('ready')
  })

  // Behavior 5 — suggestion matches computeTodaySuggestion with the same inputs
  it('suggestion matches computeTodaySuggestion called with the same readiness and sessions', () => {
    const readiness = makeReadiness()
    const training = makeTraining({ sessions: [] })
    mockReadiness.mockReturnValue(readiness)
    mockTraining.mockReturnValue(training)

    const { result } = renderHook(() => useTodaySnapshot())
    const expected = computeTodaySuggestion({
      readiness,
      sessions: training.sessions,
    })
    expect(result.current.suggestion).toEqual(expected)
  })

  // Behavior 6 — recoveryScore is a pass-through of readiness.recoveryScore
  it('recoveryScore equals readiness.recoveryScore', () => {
    mockReadiness.mockReturnValue(makeReadiness({ recoveryScore: 82 }))
    mockTraining.mockReturnValue(makeTraining())

    const { result } = renderHook(() => useTodaySnapshot())
    expect(result.current.recoveryScore).toBe(82)
  })

  it('recoveryScore is null when readiness.recoveryScore is null', () => {
    mockReadiness.mockReturnValue(makeReadiness({ recoveryScore: null }))
    mockTraining.mockReturnValue(makeTraining())

    const { result } = renderHook(() => useTodaySnapshot())
    expect(result.current.recoveryScore).toBeNull()
  })

  // Behavior 7 — refresh() invokes both underlying refreshes exactly once
  it('refresh() calls readiness.refresh and training.refresh each exactly once', async () => {
    const readinessRefresh = jest.fn().mockResolvedValue(undefined)
    const trainingRefresh = jest.fn().mockResolvedValue(undefined)
    mockReadiness.mockReturnValue(makeReadiness({ refresh: readinessRefresh }))
    mockTraining.mockReturnValue(makeTraining({ refresh: trainingRefresh }))

    const { result } = renderHook(() => useTodaySnapshot())
    await act(async () => {
      await result.current.refresh()
    })

    expect(readinessRefresh).toHaveBeenCalledTimes(1)
    expect(trainingRefresh).toHaveBeenCalledTimes(1)
  })

  // Behavior 8 — refresh() resolves even if one underlying refresh rejects
  it('refresh() resolves without throwing even if one underlying refresh rejects', async () => {
    const readinessRefresh = jest
      .fn()
      .mockRejectedValue(new Error('HealthKit unavailable'))
    const trainingRefresh = jest.fn().mockResolvedValue(undefined)
    mockReadiness.mockReturnValue(makeReadiness({ refresh: readinessRefresh }))
    mockTraining.mockReturnValue(makeTraining({ refresh: trainingRefresh }))

    const { result } = renderHook(() => useTodaySnapshot())
    await expect(
      act(async () => {
        await result.current.refresh()
      }),
    ).resolves.not.toThrow()
  })
})
