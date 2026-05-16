import { renderHook, waitFor } from '@testing-library/react-native'

import type {
  DailyHealthSnapshot,
  HealthSnapshotSource,
} from '@/lib/healthSnapshot/types'
import { computeRecoveryScore, DEFAULT_SLEEP_GOAL_HOURS } from '@/lib/recovery'

import { useReadiness } from '../useReadiness'

let mockHealthSnapshot: jest.Mocked<HealthSnapshotSource>

jest.mock('@/lib/healthSnapshot/HealthSnapshotSource', () => ({
  healthSnapshot: {
    getDailySnapshot: (date: Date) => mockHealthSnapshot.getDailySnapshot(date),
    getRangeIntensity: (daysBack: number) =>
      mockHealthSnapshot.getRangeIntensity(daysBack),
    getRangeWorkouts: (daysBack: number) =>
      mockHealthSnapshot.getRangeWorkouts(daysBack),
    saveCardioWorkout: (
      params: Parameters<HealthSnapshotSource['saveCardioWorkout']>[0],
    ) => mockHealthSnapshot.saveCardioWorkout(params),
    requestAuthorization: () => mockHealthSnapshot.requestAuthorization(),
    isAvailable: () => mockHealthSnapshot.isAvailable(),
  },
}))

const TODAY_ISO = '2026-02-20'

function makeSnapshot(
  overrides: Partial<DailyHealthSnapshot> = {},
): DailyHealthSnapshot {
  return {
    date: TODAY_ISO,
    steps: 8_000,
    calories: 400,
    sleepHours: 7.5,
    heartRate: 90,
    hrv: 55,
    restingHeartRate: 58,
    waterLiters: 2.0,
    flightsClimbed: 5,
    workouts: [],
    ...overrides,
  }
}

function createSource(
  overrides: Partial<jest.Mocked<HealthSnapshotSource>> = {},
) {
  const source: jest.Mocked<HealthSnapshotSource> = {
    getDailySnapshot: jest.fn(async (_date: Date) => makeSnapshot()),
    getRangeIntensity: jest.fn(async (_daysBack: number) => new Map()),
    getRangeWorkouts: jest.fn(async (_daysBack: number) => []),
    saveCardioWorkout: jest.fn(async (_params) => true),
    requestAuthorization: jest.fn(async () => true),
    isAvailable: jest.fn(() => true),
    ...overrides,
  }
  mockHealthSnapshot = source
  return source
}

describe('useReadiness – recoveryScore', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-20T10:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  // Behavior 1: null while baseline is loading
  it('returns recoveryScore: null while baseline is still loading', () => {
    createSource({
      // unavailable → today's snapshot uses mock data immediately (no getDailySnapshot)
      isAvailable: jest.fn(() => false),
      // baseline calls never settle → baselineStatus stays 'loading'
      getDailySnapshot: jest.fn(
        (_date: Date) => new Promise<DailyHealthSnapshot>(() => {}),
      ),
    })

    const { result } = renderHook(() => useReadiness())

    // baseline is loading → overall status is 'loading' → score must be null
    expect(result.current.status).toBe('loading')
    expect(result.current.recoveryScore).toBeNull()
  })

  // Behavior 2: numeric score 0–100 once both today + baseline are ready
  it('returns a numeric recoveryScore between 0 and 100 once loaded with valid HRV+RHR', async () => {
    createSource({
      isAvailable: jest.fn(() => true),
      getDailySnapshot: jest.fn(async (_date: Date) => makeSnapshot()),
    })

    const { result } = renderHook(() => useReadiness())

    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(result.current.recoveryScore).not.toBeNull()
    expect(result.current.recoveryScore).toBeGreaterThanOrEqual(0)
    expect(result.current.recoveryScore).toBeLessThanOrEqual(100)
  })

  // Behavior 3: score equals computeRecoveryScore with the same fixture inputs
  it('score matches computeRecoveryScore called with the same HRV, RHR, sleep, and 7-day baseline', async () => {
    const todaySnap = makeSnapshot({
      hrv: 60,
      restingHeartRate: 55,
      sleepHours: 7.5,
    })
    // All 7 baseline days return identical values → average == those values
    const baselineSnap = makeSnapshot({
      hrv: 50,
      restingHeartRate: 62,
      sleepHours: 7.0,
    })

    createSource({
      isAvailable: jest.fn(() => true),
      getDailySnapshot: jest.fn(async (date: Date) => {
        if (date.toISOString().slice(0, 10) === TODAY_ISO) return todaySnap
        return baselineSnap
      }),
    })

    const { result } = renderHook(() => useReadiness())

    await waitFor(() => expect(result.current.status).toBe('ready'))

    const expected = computeRecoveryScore({
      hrv: todaySnap.hrv!,
      restingHR: todaySnap.restingHeartRate!,
      sleepHours: todaySnap.sleepHours!,
      hrvBaseline: baselineSnap.hrv,
      rhrBaseline: baselineSnap.restingHeartRate,
      sleepGoalHours: DEFAULT_SLEEP_GOAL_HOURS,
    }).score

    expect(result.current.recoveryScore).toBe(expected)
  })

  // Behavior 4: null when BOTH HRV and RHR are zero / missing today
  it('returns recoveryScore: null when both HRV and RHR are zero today', async () => {
    createSource({
      isAvailable: jest.fn(() => true),
      getDailySnapshot: jest.fn(async (date: Date) => {
        // Today's snapshot has no usable HRV or RHR readings
        if (date.toISOString().slice(0, 10) === TODAY_ISO) {
          return makeSnapshot({ hrv: 0, restingHeartRate: 0 })
        }
        // Baseline days have valid readings so the hook reaches 'ready'
        return makeSnapshot()
      }),
    })

    const { result } = renderHook(() => useReadiness())

    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(result.current.recoveryScore).toBeNull()
  })

  // Behavior 5: null when status is 'error'
  it('returns recoveryScore: null when status is error', async () => {
    createSource({
      isAvailable: jest.fn(() => true),
      // Today's fetch fails → snapshotStatus becomes 'error' → overall status 'error'
      getDailySnapshot: jest.fn().mockRejectedValue(new Error('network error')),
    })

    const { result } = renderHook(() => useReadiness())

    await waitFor(() => expect(result.current.status).toBe('error'))

    expect(result.current.recoveryScore).toBeNull()
  })
})
