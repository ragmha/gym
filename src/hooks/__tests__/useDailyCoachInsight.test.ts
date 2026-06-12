import { renderHook, waitFor } from '@testing-library/react-native'

import { activeCoachEngine } from '@/lib/coach'
import { createDeterministicMockSnapshot } from '@/lib/healthSnapshot/mockAdapter'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
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
})
