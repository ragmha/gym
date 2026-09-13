import { act, renderHook, waitFor } from '@testing-library/react-native'

import { activeCoachEngine } from '@/lib/coach'
import { createDeterministicMockSnapshot } from '@/lib/healthSnapshot/mockAdapter'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import type { CoachInsight } from '@/lib/validators'
import type { RecoveryResult } from '@/utils/recovery'

import {
  clearInsightCache,
  useDailyCoachInsight,
} from '../useDailyCoachInsight'

const recovery: RecoveryResult = {
  score: 72,
  label: 'Primed to Perform',
  description: 'Ready for a strong session.',
}

const unavailableInsight: CoachInsight = {
  headline: 'Recovery unavailable',
  body: 'Not enough Health data is available to assess recovery.',
  suggestion: 'Use available Health metrics.',
  tone: 'steady',
}

describe('useDailyCoachInsight', () => {
  beforeEach(() => {
    clearInsightCache()
    jest.restoreAllMocks()
  })

  it('caches the same snapshot across rerenders', async () => {
    const snapshot = createDeterministicMockSnapshot(
      new Date('2026-02-15T12:00:00.000Z'),
    )
    const generateSpy = jest.spyOn(activeCoachEngine, 'generateDailyInsight')

    const { result, rerender } = renderHook<
      ReturnType<typeof useDailyCoachInsight>,
      { nextSnapshot: DailyHealthSnapshot }
    >(
      ({ nextSnapshot }) =>
        useDailyCoachInsight({ snapshot: nextSnapshot, recovery }),
      { initialProps: { nextSnapshot: snapshot } },
    )

    await waitFor(() => expect(result.current.status).toBe('ready'))
    const firstInsight = result.current.insight

    rerender({ nextSnapshot: { ...snapshot } })

    await waitFor(() => expect(result.current.insight).toEqual(firstInsight))
    expect(generateSpy).toHaveBeenCalledTimes(1)
  })

  it('reuses the same daily insight for same-day metric jitter within buckets', async () => {
    const snapshot = createDeterministicMockSnapshot(
      new Date('2026-02-15T12:00:00.000Z'),
    )
    const generateSpy = jest.spyOn(activeCoachEngine, 'generateDailyInsight')

    const { result, rerender } = renderHook<
      ReturnType<typeof useDailyCoachInsight>,
      { snapshot: DailyHealthSnapshot }
    >(({ snapshot }) => useDailyCoachInsight({ snapshot, recovery }), {
      initialProps: {
        snapshot: { ...snapshot, steps: 8100, sleepHours: 7.1 },
      },
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))

    rerender({
      snapshot: { ...snapshot, steps: 8800, sleepHours: 7.2, calories: 999 },
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(generateSpy).toHaveBeenCalledTimes(1)
  })

  it('generates a new daily insight after crossing a coarse bucket boundary', async () => {
    const snapshot = createDeterministicMockSnapshot(
      new Date('2026-02-15T12:00:00.000Z'),
    )
    const generateSpy = jest.spyOn(activeCoachEngine, 'generateDailyInsight')

    const { result, rerender } = renderHook<
      ReturnType<typeof useDailyCoachInsight>,
      { snapshot: DailyHealthSnapshot }
    >(({ snapshot }) => useDailyCoachInsight({ snapshot, recovery }), {
      initialProps: {
        snapshot: { ...snapshot, steps: 8900, sleepHours: 7 },
      },
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))

    rerender({ snapshot: { ...snapshot, steps: 9100, sleepHours: 7 } })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(generateSpy).toHaveBeenCalledTimes(2)
  })

  it('evicts the oldest cached daily insights after eight entries', async () => {
    const baseSnapshot = createDeterministicMockSnapshot(
      new Date('2026-02-15T12:00:00.000Z'),
    )
    const generateSpy = jest.spyOn(activeCoachEngine, 'generateDailyInsight')
    const snapshots = Array.from({ length: 9 }, (_, index) => ({
      ...baseSnapshot,
      date: `2026-02-${String(15 + index).padStart(2, '0')}`,
    }))

    const { result, rerender } = renderHook<
      ReturnType<typeof useDailyCoachInsight>,
      { snapshot: DailyHealthSnapshot }
    >(({ snapshot }) => useDailyCoachInsight({ snapshot, recovery }), {
      initialProps: { snapshot: snapshots[0] },
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))

    for (const snapshot of snapshots.slice(1)) {
      rerender({ snapshot })
      await waitFor(() => expect(result.current.status).toBe('ready'))
    }

    expect(generateSpy).toHaveBeenCalledTimes(9)

    rerender({ snapshot: snapshots[0] })

    await waitFor(() => expect(generateSpy).toHaveBeenCalledTimes(10))
  })

  it('generates a new insight for a new snapshot date', async () => {
    const firstSnapshot = createDeterministicMockSnapshot(
      new Date('2026-02-15T12:00:00.000Z'),
    )
    const secondSnapshot = createDeterministicMockSnapshot(
      new Date('2026-02-16T12:00:00.000Z'),
    )
    const generateSpy = jest.spyOn(activeCoachEngine, 'generateDailyInsight')

    const { result, rerender } = renderHook<
      ReturnType<typeof useDailyCoachInsight>,
      { snapshot: DailyHealthSnapshot }
    >(({ snapshot }) => useDailyCoachInsight({ snapshot, recovery }), {
      initialProps: { snapshot: firstSnapshot },
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))

    rerender({ snapshot: secondSnapshot })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(generateSpy).toHaveBeenCalledTimes(2)
    expect(generateSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ dateISO: secondSnapshot.date }),
    )
  })

  it('replaces a cached assessment when recovery becomes unavailable', async () => {
    const snapshot = createDeterministicMockSnapshot(
      new Date('2026-02-15T12:00:00.000Z'),
    )
    const pending = deferred<CoachInsight>()
    const generateSpy = jest
      .spyOn(activeCoachEngine, 'generateDailyInsight')
      .mockResolvedValueOnce({
        headline: 'Ready',
        body: 'Recovery is 72/100.',
        suggestion: 'Warm up first.',
        tone: 'celebrate',
      })
      .mockReturnValueOnce(pending.promise)
    const observed: ReturnType<typeof useDailyCoachInsight>[] = []
    const { result, rerender } = renderHook<
      ReturnType<typeof useDailyCoachInsight>,
      {
        snapshot: DailyHealthSnapshot
        recovery: RecoveryResult | null
      }
    >(
      (input) => {
        const state = useDailyCoachInsight(input)
        observed.push(state)
        return state
      },
      { initialProps: { snapshot, recovery } },
    )

    await waitFor(() => expect(result.current.status).toBe('ready'))
    observed.length = 0

    const partial = { ...snapshot, hrv: null }
    rerender({ snapshot: partial, recovery: null })

    expect(result.current).toEqual({ insight: null, status: 'loading' })
    expect(observed.every((state) => state.insight === null)).toBe(true)
    expect(generateSpy).toHaveBeenLastCalledWith({
      dateISO: partial.date,
      snapshot: partial,
      recovery: null,
    })

    await act(async () => pending.resolve(unavailableInsight))
    expect(result.current).toEqual({
      insight: unavailableInsight,
      status: 'ready',
    })
  })

  it('clears insights immediately when the snapshot becomes unavailable', async () => {
    const snapshot = createDeterministicMockSnapshot(
      new Date('2026-02-15T12:00:00.000Z'),
    )
    jest
      .spyOn(activeCoachEngine, 'generateDailyInsight')
      .mockResolvedValue(unavailableInsight)
    const observed: ReturnType<typeof useDailyCoachInsight>[] = []
    const { result, rerender } = renderHook<
      ReturnType<typeof useDailyCoachInsight>,
      { snapshot: DailyHealthSnapshot | null }
    >(
      ({ snapshot }) => {
        const state = useDailyCoachInsight({ snapshot, recovery: null })
        observed.push(state)
        return state
      },
      { initialProps: { snapshot } },
    )

    await waitFor(() => expect(result.current.status).toBe('ready'))
    observed.length = 0
    rerender({ snapshot: null })

    expect(result.current).toEqual({ insight: null, status: 'idle' })
    expect(observed.every((state) => state.insight === null)).toBe(true)
  })

  it('regenerates when a previously available non-bucketed metric disappears', async () => {
    const snapshot = createDeterministicMockSnapshot(
      new Date('2026-02-15T12:00:00.000Z'),
    )
    const generateSpy = jest
      .spyOn(activeCoachEngine, 'generateDailyInsight')
      .mockResolvedValue(unavailableInsight)
    const { result, rerender } = renderHook<
      ReturnType<typeof useDailyCoachInsight>,
      { snapshot: DailyHealthSnapshot }
    >(({ snapshot }) => useDailyCoachInsight({ snapshot, recovery }), {
      initialProps: { snapshot },
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    rerender({ snapshot: { ...snapshot, bodyMassKg: null } })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(generateSpy).toHaveBeenCalledTimes(2)
    expect(generateSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        snapshot: expect.objectContaining({ bodyMassKg: null }),
      }),
    )
  })

  it('does not reuse missing-data context for a real measured zero', async () => {
    const snapshot = createDeterministicMockSnapshot(
      new Date('2026-02-15T12:00:00.000Z'),
    )
    const generateSpy = jest
      .spyOn(activeCoachEngine, 'generateDailyInsight')
      .mockResolvedValue(unavailableInsight)
    const { result, rerender } = renderHook<
      ReturnType<typeof useDailyCoachInsight>,
      { snapshot: DailyHealthSnapshot }
    >(({ snapshot }) => useDailyCoachInsight({ snapshot, recovery }), {
      initialProps: { snapshot: { ...snapshot, calories: null } },
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    rerender({ snapshot: { ...snapshot, calories: 0 } })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(generateSpy).toHaveBeenCalledTimes(2)
    expect(generateSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        snapshot: expect.objectContaining({ calories: 0 }),
      }),
    )
  })
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}
