import { act, renderHook, waitFor } from '@testing-library/react-native'

import type { HealthSnapshotSource } from '@/lib/healthSnapshot/types'
import { createDeterministicMockSnapshot } from '@/lib/healthSnapshot/mockAdapter'

import { useHealthSnapshot } from '../useHealthSnapshot'

let mockHealthSnapshot: jest.Mocked<HealthSnapshotSource>

jest.mock('@/lib/healthSnapshot/HealthSnapshotSource', () => ({
  healthSnapshot: {
    getDailySnapshot: (date: Date) => mockHealthSnapshot.getDailySnapshot(date),
    getRangeIntensity: (daysBack: number) =>
      mockHealthSnapshot.getRangeIntensity(daysBack),
    saveCardioWorkout: (
      params: Parameters<HealthSnapshotSource['saveCardioWorkout']>[0],
    ) => mockHealthSnapshot.saveCardioWorkout(params),
    requestAuthorization: () => mockHealthSnapshot.requestAuthorization(),
    isAvailable: () => mockHealthSnapshot.isAvailable(),
  },
}))

function createSource(
  overrides: Partial<jest.Mocked<HealthSnapshotSource>> = {},
) {
  const source: jest.Mocked<HealthSnapshotSource> = {
    getDailySnapshot: jest.fn(async (date: Date) =>
      createDeterministicMockSnapshot(date),
    ),
    getRangeIntensity: jest.fn(async (_daysBack: number) => new Map()),
    saveCardioWorkout: jest.fn(async (_params) => true),
    requestAuthorization: jest.fn(async () => true),
    isAvailable: jest.fn(() => false),
    ...overrides,
  }
  mockHealthSnapshot = source
  return source
}

describe('useHealthSnapshot', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-20T10:00:00.000Z'))
    createSource()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it('starts ready with a deterministic mock snapshot and demo mode when the source is unavailable', () => {
    const date = new Date('2026-02-15T12:00:00.000Z')
    createSource({ isAvailable: jest.fn(() => false) })

    const { result } = renderHook(() => useHealthSnapshot(date))

    expect(result.current.status).toBe('ready')
    expect(result.current.isDemoMode).toBe(true)
    expect(result.current.error).toBeNull()
    expect(result.current.snapshot).toEqual(
      createDeterministicMockSnapshot(date),
    )
  })

  it('starts unauthorized with no snapshot when the source is available but not yet authorized', () => {
    createSource({ isAvailable: jest.fn(() => true) })

    const { result } = renderHook(() => useHealthSnapshot())

    expect(result.current.status).toBe('unauthorized')
    expect(result.current.snapshot).toBeNull()
    expect(result.current.isDemoMode).toBe(false)
  })

  it('requestAuthorization flips to loading, then ready, and populates the snapshot when granted', async () => {
    const date = new Date('2026-02-15T12:00:00.000Z')
    const snapshot = createDeterministicMockSnapshot(date)
    let resolveAuthorization: (value: boolean) => void = () => undefined
    const authorizationPromise = new Promise<boolean>((resolve) => {
      resolveAuthorization = resolve
    })
    createSource({
      isAvailable: jest.fn(() => true),
      requestAuthorization: jest.fn(() => authorizationPromise),
      getDailySnapshot: jest.fn(async (_date: Date) => snapshot),
    })
    const { result } = renderHook(() => useHealthSnapshot(date))

    let requestPromise: Promise<boolean>
    act(() => {
      requestPromise = result.current.requestAuthorization()
    })

    expect(result.current.status).toBe('loading')

    await act(async () => {
      resolveAuthorization(true)
      await requestPromise!
    })

    expect(result.current.status).toBe('ready')
    expect(result.current.snapshot).toEqual(snapshot)
  })

  it('re-fetches through the same source path when the date changes', async () => {
    const firstDate = new Date('2026-02-15T12:00:00.000Z')
    const secondDate = new Date('2026-02-16T12:00:00.000Z')
    const source = createSource({ isAvailable: jest.fn(() => false) })

    const { result, rerender } = renderHook<
      ReturnType<typeof useHealthSnapshot>,
      { date: Date }
    >(({ date }) => useHealthSnapshot(date), {
      initialProps: { date: firstDate },
    })

    expect(result.current.snapshot?.date).toBe('2026-02-15')
    expect(source.getDailySnapshot).not.toHaveBeenCalled()

    rerender({ date: secondDate })

    await waitFor(() =>
      expect(source.getDailySnapshot).toHaveBeenCalledTimes(1),
    )
    expect(source.getDailySnapshot).toHaveBeenCalledWith(secondDate)
    await waitFor(() =>
      expect(result.current.snapshot?.date).toBe('2026-02-16'),
    )
  })

  it('refresh re-runs the source fetch and clears stale errors', async () => {
    const date = new Date('2026-02-15T12:00:00.000Z')
    const recoveredSnapshot = createDeterministicMockSnapshot(date)
    const source = createSource({
      isAvailable: jest.fn(() => false),
      getDailySnapshot: jest
        .fn()
        .mockRejectedValueOnce(new Error('temporary failure'))
        .mockResolvedValueOnce(recoveredSnapshot),
    })
    const { result } = renderHook(() => useHealthSnapshot(date))

    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('Unable to load health data')

    await act(async () => {
      await result.current.refresh()
    })

    expect(source.getDailySnapshot).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('ready')
    expect(result.current.error).toBeNull()
    expect(result.current.snapshot).toEqual(recoveredSnapshot)
  })
})
