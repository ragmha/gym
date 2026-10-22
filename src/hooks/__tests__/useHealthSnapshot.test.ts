import { act, renderHook, waitFor } from '@testing-library/react-native'
import { useFocusEffect } from 'expo-router'
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  type PropsWithChildren,
} from 'react'
import { AppState, Platform } from 'react-native'

import type {
  DailyHealthSnapshot,
  HealthSnapshotSource,
} from '@/lib/healthSnapshot/types'
import { createDeterministicMockSnapshot } from '@/lib/healthSnapshot/mockAdapter'

import { useHealthSnapshot } from '../useHealthSnapshot'

let mockHealthSnapshot: jest.Mocked<HealthSnapshotSource>
const FocusContext = createContext(true)
const originalAppState = Object.getOwnPropertyDescriptor(
  AppState,
  'currentState',
)

function useTestFocusEffect(effect: Parameters<typeof useFocusEffect>[0]) {
  const focused = useContext(FocusContext)
  useEffect(() => {
    if (focused) return effect()
  }, [effect, focused])
}

jest.mock('@/lib/healthSnapshot/HealthSnapshotSource', () => ({
  get healthSnapshot() {
    return mockHealthSnapshot
  },
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function createSource(
  overrides: Partial<jest.Mocked<HealthSnapshotSource>> = {},
) {
  const source: jest.Mocked<HealthSnapshotSource> = {
    getDailySnapshot: jest.fn(async (date: Date) =>
      createDeterministicMockSnapshot(date),
    ),
    getStepHistory: jest.fn(async (_endDate: Date, _days: number) => []),
    getActivityHistory: jest.fn(async (_endDate: Date, _days: number) => []),
    getWaterHistory: jest.fn(async (_endDate: Date, _days: number) => []),
    getBodyMassHistory: jest.fn(async (_endDate: Date, _days: number) => []),
    getHeightMeters: jest.fn(async () => null),
    getFoodLog: jest.fn(async (_date: Date) => ({
      proteinGrams: null,
      carbsGrams: null,
      fatGrams: null,
      meals: [],
    })),
    getWorkoutHistory: jest.fn(async (_endDate: Date, _days: number) => []),
    getStairWorkouts: jest.fn(async () => []),
    getStairSessions: jest.fn(async (_date: Date) => []),
    subscribeToWorkoutChanges: jest.fn((_onChange: () => void) => null),
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
    jest.replaceProperty(Platform, 'OS', 'ios')
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      writable: true,
      value: 'active',
    })
    jest.mocked(useFocusEffect).mockImplementation(useTestFocusEffect)
    createSource()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
    jest.restoreAllMocks()
    if (originalAppState) {
      Object.defineProperty(AppState, 'currentState', originalAppState)
    }
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

  it('starts loading and fetches on mount when the source is available', async () => {
    const date = new Date('2026-02-15T12:00:00.000Z')
    const snapshot = createDeterministicMockSnapshot(date)
    const source = createSource({
      isAvailable: jest.fn(() => true),
      getDailySnapshot: jest.fn(async (_date: Date) => snapshot),
    })

    const { result } = renderHook(() => useHealthSnapshot(date))

    expect(result.current.status).toBe('loading')
    expect(result.current.snapshot).toBeNull()
    expect(result.current.isDemoMode).toBe(false)

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(source.getDailySnapshot).toHaveBeenCalledWith(date)
    expect(result.current.snapshot).toEqual(snapshot)
  })

  it('coalesces saved-workout updates and removes the observer on unmount', async () => {
    const remove = jest.fn()
    const source = createSource({
      isAvailable: jest.fn(() => true),
      subscribeToWorkoutChanges: jest.fn((_onChange: () => void) => remove),
    })
    const { result, unmount } = renderHook(() => useHealthSnapshot())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    const notify = source.subscribeToWorkoutChanges.mock.calls[0][0]

    await act(async () => {
      notify()
      notify()
      jest.advanceTimersByTime(300)
    })
    expect(source.getDailySnapshot).toHaveBeenCalledTimes(2)

    act(notify)
    unmount()
    await act(async () => {
      notify()
      jest.advanceTimersByTime(300)
    })
    expect(remove).toHaveBeenCalledTimes(1)
    expect(source.getDailySnapshot).toHaveBeenCalledTimes(2)
  })

  it('does not load or subscribe while its mounted screen is unfocused', () => {
    const listen = jest.spyOn(AppState, 'addEventListener')
    const source = createSource({ isAvailable: jest.fn(() => true) })
    const { result } = renderHook(() => useHealthSnapshot(), {
      wrapper: ({ children }: PropsWithChildren) =>
        createElement(FocusContext.Provider, { value: false }, children),
    })

    expect(result.current.snapshot).toBeNull()
    expect(source.getDailySnapshot).not.toHaveBeenCalled()
    expect(source.subscribeToWorkoutChanges).not.toHaveBeenCalled()
    expect(listen).not.toHaveBeenCalled()
  })

  it('cancels queued and late callbacks on blur, then refreshes the latest date once on refocus', async () => {
    let focused = true
    const unsubscribe = jest.fn()
    const foregroundRemove = jest.fn()
    const listen = jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({ remove: foregroundRemove })
    const source = createSource({
      isAvailable: jest.fn(() => true),
      subscribeToWorkoutChanges: jest.fn(
        (_onChange: () => void) => unsubscribe,
      ),
    })
    const firstDate = new Date(2026, 1, 15, 12)
    const nextDate = new Date(2026, 1, 16, 12)
    const { result, rerender } = renderHook(
      ({ date }: { date: Date }) => useHealthSnapshot(date),
      {
        initialProps: { date: firstDate },
        wrapper: ({ children }: PropsWithChildren) =>
          createElement(FocusContext.Provider, { value: focused }, children),
      },
    )
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(source.getDailySnapshot).toHaveBeenCalledTimes(1)
    const notify = source.subscribeToWorkoutChanges.mock.calls[0][0]
    const foreground = listen.mock.calls[0][1]
    act(notify)

    focused = false
    rerender({ date: firstDate })
    rerender({ date: nextDate })
    await act(async () => {
      notify()
      foreground('active')
      jest.advanceTimersByTime(300)
    })
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    expect(foregroundRemove).toHaveBeenCalledTimes(1)
    expect(source.getDailySnapshot).toHaveBeenCalledTimes(1)
    expect(source.subscribeToWorkoutChanges).toHaveBeenCalledTimes(1)

    const refreshed = {
      ...createDeterministicMockSnapshot(nextDate),
      steps: 9200,
    }
    source.getDailySnapshot.mockResolvedValueOnce(refreshed)
    focused = true
    rerender({ date: nextDate })
    await waitFor(() => expect(result.current.snapshot).toBe(refreshed))

    expect(source.getDailySnapshot).toHaveBeenCalledTimes(2)
    expect(source.getDailySnapshot).toHaveBeenLastCalledWith(nextDate)
    expect(source.subscribeToWorkoutChanges).toHaveBeenCalledTimes(2)
    expect(listen).toHaveBeenCalledTimes(2)
    expect(source.requestAuthorization).not.toHaveBeenCalled()
  })

  it('refreshes only the focused route when another screen remains mounted underneath', async () => {
    let focused = 'home'
    const observers = new Set<() => void>()
    const listen = jest.spyOn(AppState, 'addEventListener')
    const source = createSource({
      isAvailable: jest.fn(() => true),
      subscribeToWorkoutChanges: jest.fn((onChange: () => void) => {
        observers.add(onChange)
        return () => {
          observers.delete(onChange)
        }
      }),
    })
    const homeDate = new Date(2026, 1, 15, 12)
    const detailsDate = new Date(2026, 1, 16, 12)
    const home = renderHook(() => useHealthSnapshot(homeDate), {
      wrapper: ({ children }: PropsWithChildren) =>
        createElement(
          FocusContext.Provider,
          { value: focused === 'home' },
          children,
        ),
    })
    const details = renderHook(() => useHealthSnapshot(detailsDate), {
      wrapper: ({ children }: PropsWithChildren) =>
        createElement(
          FocusContext.Provider,
          { value: focused === 'details' },
          children,
        ),
    })
    await waitFor(() => expect(home.result.current.status).toBe('ready'))
    expect(source.getDailySnapshot).toHaveBeenCalledTimes(1)
    expect(observers.size).toBe(1)
    const coveredSnapshot = home.result.current.snapshot
    const oldNotify = source.subscribeToWorkoutChanges.mock.calls[0][0]
    const oldForeground = listen.mock.calls[0][1]

    focused = 'details'
    home.rerender(undefined)
    details.rerender(undefined)
    await waitFor(() => expect(details.result.current.status).toBe('ready'))
    expect(source.getDailySnapshot).toHaveBeenCalledTimes(2)
    expect(observers.size).toBe(1)
    await act(async () => {
      oldNotify()
      oldForeground('active')
      for (const notify of observers) notify()
      listen.mock.calls[1][1]('active')
      jest.advanceTimersByTime(300)
    })

    expect(source.getDailySnapshot).toHaveBeenCalledTimes(3)
    expect(source.getDailySnapshot).toHaveBeenLastCalledWith(detailsDate)
    expect(home.result.current.snapshot).toBe(coveredSnapshot)
    home.unmount()
    details.unmount()
    expect(observers.size).toBe(0)
  })

  it.each([null, 78.4])(
    'rereads the selected day after weight entry without inventing the returned weight %s',
    async (kilograms) => {
      let focused = true
      const date = new Date(2026, 1, 15, 12)
      const empty = {
        ...createDeterministicMockSnapshot(date),
        bodyMassKg: null,
        bodyMassHistory: null,
      }
      const source = createSource({
        isAvailable: jest.fn(() => true),
        getDailySnapshot: jest.fn(async (_date: Date) => empty),
      })
      const { result, rerender } = renderHook(() => useHealthSnapshot(date), {
        wrapper: ({ children }: PropsWithChildren) =>
          createElement(FocusContext.Provider, { value: focused }, children),
      })
      await waitFor(() => expect(result.current.status).toBe('ready'))

      focused = false
      rerender(undefined)
      const reread = {
        ...empty,
        bodyMassKg: kilograms,
        bodyMassHistory:
          kilograms === null
            ? null
            : [{ kilograms, startISO: new Date(2026, 1, 15, 7).toISOString() }],
      }
      source.getDailySnapshot.mockResolvedValueOnce(reread)
      expect(result.current.snapshot?.bodyMassHistory).toBeNull()
      focused = true
      rerender(undefined)
      await waitFor(() => expect(result.current.snapshot).toBe(reread))

      expect(source.getDailySnapshot).toHaveBeenCalledTimes(2)
      expect(source.getDailySnapshot).toHaveBeenLastCalledWith(date)
      expect(source.requestAuthorization).not.toHaveBeenCalled()
    },
  )

  it('refreshes the selected date on foreground without fetching while backgrounded', async () => {
    const listen = jest.spyOn(AppState, 'addEventListener')
    const source = createSource({ isAvailable: jest.fn(() => true) })
    const date = new Date(2026, 1, 15, 12)
    const { result } = renderHook(() => useHealthSnapshot(date))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    const notify = source.subscribeToWorkoutChanges.mock.calls[0][0]
    const onStateChange = listen.mock.calls[0][1]

    jest.replaceProperty(AppState, 'currentState', 'background')
    await act(async () => {
      notify()
      onStateChange('background')
      jest.advanceTimersByTime(300)
    })
    expect(source.getDailySnapshot).toHaveBeenCalledTimes(1)

    jest.replaceProperty(AppState, 'currentState', 'active')
    await act(async () => {
      onStateChange('active')
      jest.advanceTimersByTime(300)
    })
    expect(source.getDailySnapshot).toHaveBeenCalledTimes(2)
    expect(source.getDailySnapshot).toHaveBeenLastCalledWith(date)
  })

  it('does not register native workout observation for demo data', () => {
    const listen = jest.spyOn(AppState, 'addEventListener')
    const source = createSource()
    renderHook(() => useHealthSnapshot())
    expect(source.subscribeToWorkoutChanges).not.toHaveBeenCalled()
    expect(listen).not.toHaveBeenCalled()
  })

  it('tracks request progress separately from data readiness and permits repeat requests', async () => {
    const date = new Date('2026-02-15T12:00:00.000Z')
    const snapshot = createDeterministicMockSnapshot(date)
    const authorization = deferred<boolean>()
    const source = createSource({
      isAvailable: jest.fn(() => true),
      requestAuthorization: jest.fn(() => authorization.promise),
      getDailySnapshot: jest.fn(async (_date: Date) => snapshot),
    })
    const { result } = renderHook(() => useHealthSnapshot(date))
    await waitFor(() => expect(result.current.status).toBe('ready'))

    let requestPromise!: Promise<boolean>
    let duplicateRequest!: Promise<boolean>
    act(() => {
      requestPromise = result.current.requestAuthorization()
      duplicateRequest = result.current.requestAuthorization()
    })

    expect(result.current.status).toBe('ready')
    expect(result.current.authorizationStatus).toBe('requesting')
    expect(duplicateRequest).toBe(requestPromise)

    await act(async () => {
      authorization.resolve(true)
      expect(await requestPromise).toBe(true)
    })

    expect(result.current.status).toBe('ready')
    expect(result.current.authorizationStatus).toBe('completed')
    expect(result.current.snapshot).toEqual(snapshot)
    expect(source.requestAuthorization).toHaveBeenCalledTimes(1)

    await act(async () => {
      expect(await result.current.requestAuthorization()).toBe(true)
    })
    expect(source.requestAuthorization).toHaveBeenCalledTimes(2)
    expect(source.getDailySnapshot).toHaveBeenCalledTimes(3)
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

  it.each(['false result', 'rejection'])(
    'surfaces an authorization %s without changing a ready snapshot and allows retry',
    async (failure) => {
      const source = createSource({ isAvailable: jest.fn(() => true) })
      const { result } = renderHook(() => useHealthSnapshot())
      await waitFor(() => expect(result.current.status).toBe('ready'))
      const snapshot = result.current.snapshot
      if (failure === 'rejection') {
        source.requestAuthorization.mockRejectedValueOnce(
          new Error('unavailable'),
        )
      } else {
        source.requestAuthorization.mockResolvedValueOnce(false)
      }

      await act(async () => {
        expect(await result.current.requestAuthorization()).toBe(false)
      })

      expect(result.current.authorizationStatus).toBe('error')
      expect(result.current.authorizationError).toContain(
        'Unable to request Health access',
      )
      expect(result.current.status).toBe('ready')
      expect(result.current.snapshot).toBe(snapshot)
      expect(result.current.error).toBeNull()

      await act(async () => {
        expect(await result.current.requestAuthorization()).toBe(true)
      })
      expect(result.current.authorizationStatus).toBe('completed')
      expect(result.current.authorizationError).toBeNull()
    },
  )

  it.each(['ios', 'web', 'android'] as const)(
    'does not request Health access for an unavailable source on %s',
    async (platform) => {
      jest.replaceProperty(Platform, 'OS', platform)
      const source = createSource()
      const { result } = renderHook(() => useHealthSnapshot())

      await act(async () => {
        expect(await result.current.requestAuthorization()).toBe(false)
      })

      expect(source.requestAuthorization).not.toHaveBeenCalled()
      expect(result.current.authorizationStatus).toBe('idle')
      expect(result.current.authorizationError).toBeNull()
      expect(result.current.status).toBe('ready')
      expect(result.current.isDemoMode).toBe(true)
    },
  )

  it('never renders the previous day snapshot while the new day starts loading', async () => {
    const firstDate = new Date('2026-02-15T12:00:00.000Z')
    const secondDate = new Date('2026-02-16T12:00:00.000Z')
    const pending = deferred<DailyHealthSnapshot>()
    const source = createSource({ isAvailable: jest.fn(() => true) })
    const renders: {
      date: Date
      snapshot: DailyHealthSnapshot | null
      status: string
    }[] = []
    const { result, rerender } = renderHook(
      ({ date }: { date: Date }) => {
        const state = useHealthSnapshot(date)
        renders.push({ date, snapshot: state.snapshot, status: state.status })
        return state
      },
      { initialProps: { date: firstDate } },
    )
    await waitFor(() => expect(result.current.status).toBe('ready'))
    source.getDailySnapshot.mockReturnValueOnce(pending.promise)

    rerender({ date: secondDate })

    expect(result.current.status).toBe('loading')
    expect(result.current.snapshot).toBeNull()
    expect(renders.filter(({ date }) => date === secondDate)).toEqual(
      expect.arrayContaining([
        { date: secondDate, snapshot: null, status: 'loading' },
      ]),
    )
    expect(
      renders
        .filter(({ date }) => date === secondDate)
        .every(({ snapshot }) => snapshot === null),
    ).toBe(true)

    await act(async () => {
      pending.resolve(createDeterministicMockSnapshot(secondDate))
    })
    expect(result.current.snapshot?.date).toBe('2026-02-16')
  })

  it.each(['success', 'failure'])(
    'ignores an old date %s that arrives after the selected date succeeds',
    async (outcome) => {
      const firstDate = new Date('2026-02-15T12:00:00.000Z')
      const secondDate = new Date('2026-02-16T12:00:00.000Z')
      const first = deferred<DailyHealthSnapshot>()
      const second = deferred<DailyHealthSnapshot>()
      createSource({
        isAvailable: jest.fn(() => true),
        getDailySnapshot: jest
          .fn()
          .mockReturnValueOnce(first.promise)
          .mockReturnValueOnce(second.promise),
      })
      const { result, rerender } = renderHook(
        ({ date }: { date: Date }) => useHealthSnapshot(date),
        { initialProps: { date: firstDate } },
      )

      rerender({ date: secondDate })
      await act(async () => {
        second.resolve(createDeterministicMockSnapshot(secondDate))
      })
      const selectedSnapshot = result.current.snapshot
      await act(async () => {
        if (outcome === 'failure') {
          first.reject(new Error('old date failed'))
        } else {
          first.resolve(createDeterministicMockSnapshot(firstDate))
        }
      })

      expect(result.current.snapshot).toBe(selectedSnapshot)
      expect(result.current.snapshot?.date).toBe('2026-02-16')
      expect(result.current.status).toBe('ready')
      expect(result.current.error).toBeNull()
    },
  )

  it('keeps the newest refresh when same-day requests finish in reverse order', async () => {
    const date = new Date('2026-02-15T12:00:00.000Z')
    const first = deferred<DailyHealthSnapshot>()
    const second = deferred<DailyHealthSnapshot>()
    const source = createSource({ isAvailable: jest.fn(() => true) })
    const { result } = renderHook(() => useHealthSnapshot(date))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    source.getDailySnapshot
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    let firstRefresh!: Promise<void>
    let secondRefresh!: Promise<void>
    act(() => {
      firstRefresh = result.current.refresh()
      secondRefresh = result.current.refresh()
    })
    const newest = { ...createDeterministicMockSnapshot(date), steps: 9200 }

    await act(async () => {
      second.resolve(newest)
      await secondRefresh
    })
    await act(async () => {
      first.resolve({ ...newest, steps: 1000 })
      await firstRefresh
    })

    expect(result.current.snapshot).toBe(newest)
    expect(result.current.status).toBe('ready')
    expect(result.current.error).toBeNull()
  })

  it('ignores a failed initialization read after a manual refresh succeeds', async () => {
    const initial = deferred<DailyHealthSnapshot>()
    const date = new Date('2026-02-15T12:00:00.000Z')
    const source = createSource({
      isAvailable: jest.fn(() => true),
      getDailySnapshot: jest.fn().mockReturnValueOnce(initial.promise),
    })
    const { result } = renderHook(() => useHealthSnapshot(date))
    const snapshot = createDeterministicMockSnapshot(date)
    source.getDailySnapshot.mockResolvedValueOnce(snapshot)

    await act(async () => {
      await result.current.refresh()
    })
    await act(async () => {
      initial.reject(new Error('initial load failed'))
    })

    expect(result.current.snapshot).toBe(snapshot)
    expect(result.current.status).toBe('ready')
    expect(result.current.error).toBeNull()
  })

  it('refreshes the latest selected day after a pending access request completes', async () => {
    const firstDate = new Date('2026-02-15T12:00:00.000Z')
    const secondDate = new Date('2026-02-16T12:00:00.000Z')
    const authorization = deferred<boolean>()
    const source = createSource({
      isAvailable: jest.fn(() => true),
      requestAuthorization: jest.fn(() => authorization.promise),
    })
    const { result, rerender } = renderHook(
      ({ date }: { date: Date }) => useHealthSnapshot(date),
      { initialProps: { date: firstDate } },
    )
    await waitFor(() => expect(result.current.status).toBe('ready'))
    let request!: Promise<boolean>
    act(() => {
      request = result.current.requestAuthorization()
    })
    rerender({ date: secondDate })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.authorizationStatus).toBe('requesting')

    await act(async () => {
      authorization.resolve(true)
      await request
    })

    expect(source.getDailySnapshot).toHaveBeenCalledTimes(3)
    expect(source.getDailySnapshot).toHaveBeenLastCalledWith(secondDate)
    expect(result.current.snapshot?.date).toBe('2026-02-16')
    expect(result.current.authorizationStatus).toBe('completed')
  })

  it('does not let an authorization-triggered read overwrite a later refresh', async () => {
    const date = new Date('2026-02-15T12:00:00.000Z')
    const authRead = deferred<DailyHealthSnapshot>()
    const source = createSource({ isAvailable: jest.fn(() => true) })
    const { result } = renderHook(() => useHealthSnapshot(date))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    source.getDailySnapshot.mockReturnValueOnce(authRead.promise)
    let request!: Promise<boolean>
    act(() => {
      request = result.current.requestAuthorization()
    })
    await waitFor(() =>
      expect(result.current.authorizationStatus).toBe('completed'),
    )
    expect(result.current.status).toBe('loading')
    const newest = { ...createDeterministicMockSnapshot(date), steps: 9200 }
    source.getDailySnapshot.mockResolvedValueOnce(newest)

    await act(async () => {
      await result.current.refresh()
    })
    await act(async () => {
      authRead.resolve({ ...newest, steps: 1000 })
      await request
    })

    expect(result.current.snapshot).toBe(newest)
    expect(result.current.status).toBe('ready')
    expect(result.current.authorizationStatus).toBe('completed')
  })

  it('ignores pending reads and access requests from a replaced source', async () => {
    const date = new Date('2026-02-15T12:00:00.000Z')
    const oldRead = deferred<DailyHealthSnapshot>()
    const oldAuthorization = deferred<boolean>()
    const originalSource = createSource({
      isAvailable: jest.fn(() => true),
      getDailySnapshot: jest.fn((_date: Date) => oldRead.promise),
      requestAuthorization: jest.fn(() => oldAuthorization.promise),
    })
    const { result, rerender } = renderHook(() => useHealthSnapshot(date))
    let request!: Promise<boolean>
    await act(async () => {
      request = result.current.requestAuthorization()
    })
    const replacement = createSource({ isAvailable: jest.fn(() => true) })

    rerender(undefined)
    await waitFor(() => expect(result.current.status).toBe('ready'))
    const currentSnapshot = result.current.snapshot
    await act(async () => {
      oldRead.reject(new Error('old source failed'))
      oldAuthorization.resolve(true)
      expect(await request).toBe(false)
    })

    expect(result.current.snapshot).toBe(currentSnapshot)
    expect(result.current.status).toBe('ready')
    expect(result.current.error).toBeNull()
    expect(result.current.authorizationStatus).toBe('idle')
    expect(originalSource.getDailySnapshot).toHaveBeenCalledTimes(1)
    expect(replacement.getDailySnapshot).toHaveBeenCalledTimes(1)
  })

  it('does not refresh or update after unmount with a pending access request and read', async () => {
    const read = deferred<DailyHealthSnapshot>()
    const authorization = deferred<boolean>()
    const source = createSource({
      isAvailable: jest.fn(() => true),
      getDailySnapshot: jest.fn((_date: Date) => read.promise),
      requestAuthorization: jest.fn(() => authorization.promise),
    })
    let renders = 0
    const { result, unmount } = renderHook(() => {
      renders += 1
      return useHealthSnapshot()
    })
    let request!: Promise<boolean>
    await act(async () => {
      request = result.current.requestAuthorization()
    })
    unmount()
    const renderedBeforeUnmount = renders

    await act(async () => {
      read.reject(new Error('late failure'))
      authorization.resolve(true)
      expect(await request).toBe(false)
      await result.current.refresh()
      expect(await result.current.requestAuthorization()).toBe(false)
    })

    expect(renders).toBe(renderedBeforeUnmount)
    expect(source.getDailySnapshot).toHaveBeenCalledTimes(1)
    expect(source.requestAuthorization).toHaveBeenCalledTimes(1)
  })
})
