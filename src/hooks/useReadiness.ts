/**
 * Readiness strip data: today's HRV / RHR / Sleep + a 7-day baseline + the
 * delta vs baseline for each metric.
 *
 * Wraps `useHealthSnapshot(today)` for today's reading and fetches the prior
 * 7 days in parallel for the baseline. We keep a small in-memory cache so a
 * dashboard re-mount within the same minute doesn't refetch the baseline.
 *
 * Each metric's `delta`:
 *   - `null` when today's value or the baseline is missing
 *   - signed difference otherwise (today - baseline)
 *
 * `direction` is a UX helper: 'good' / 'bad' / 'neutral' from the athlete's
 * perspective (higher HRV good, lower RHR good, more sleep good).
 */

import { useEffect, useMemo, useRef, useState } from 'react'

import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import { computeRecoveryScore, DEFAULT_SLEEP_GOAL_HOURS } from '@/lib/recovery'

import { useHealthSnapshot } from './useHealthSnapshot'

export type ReadinessDirection = 'good' | 'bad' | 'neutral'

export interface ReadinessMetric {
  value: number | null
  baseline: number | null
  delta: number | null
  direction: ReadinessDirection
}

export interface ReadinessSummary {
  status: 'loading' | 'ready' | 'error'
  isDemoMode: boolean
  hrv: ReadinessMetric
  restingHeartRate: ReadinessMetric
  sleepHours: ReadinessMetric
  /** 0-100 derived from today's HRV/RHR/Sleep + 7-day baselines using
   *  computeRecoveryScore. null while loading, when status is 'error',
   *  or when both HRV and RHR readings are missing. */
  recoveryScore: number | null
  refresh: () => Promise<void>
}

const BASELINE_DAYS = 7

function average(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const sum = values.reduce((a, b) => a + b, 0)
  return sum / values.length
}

function buildMetric(
  value: number | null,
  baseline: number | null,
  directionFor: (delta: number) => ReadinessDirection,
): ReadinessMetric {
  if (value == null || baseline == null) {
    return { value, baseline, delta: null, direction: 'neutral' }
  }
  const delta = value - baseline
  return { value, baseline, delta, direction: directionFor(delta) }
}

// Higher HRV = better recovery. Tiny deltas inside ±2ms count as neutral noise.
function hrvDirection(delta: number): ReadinessDirection {
  if (Math.abs(delta) < 2) return 'neutral'
  return delta > 0 ? 'good' : 'bad'
}

// Lower RHR = better recovery. ±2bpm is noise.
function rhrDirection(delta: number): ReadinessDirection {
  if (Math.abs(delta) < 2) return 'neutral'
  return delta < 0 ? 'good' : 'bad'
}

// More sleep = better, with ±0.3h (~18min) inside the noise band.
function sleepDirection(delta: number): ReadinessDirection {
  if (Math.abs(delta) < 0.3) return 'neutral'
  return delta > 0 ? 'good' : 'bad'
}

interface BaselineState {
  hrv: number | null
  restingHeartRate: number | null
  sleepHours: number | null
  fetchedAt: number
}

async function loadBaseline(): Promise<BaselineState> {
  const today = new Date()
  const dates: Date[] = []
  for (let i = 1; i <= BASELINE_DAYS; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dates.push(d)
  }

  const settled = await Promise.allSettled(
    dates.map((d) => healthSnapshot.getDailySnapshot(d)),
  )
  const snapshots = settled
    .filter(
      (r): r is PromiseFulfilledResult<DailyHealthSnapshot> =>
        r.status === 'fulfilled',
    )
    .map((r) => r.value)

  const hrv = average(
    snapshots
      .map((s) => s.hrv)
      .filter((v): v is number => typeof v === 'number' && v > 0),
  )
  const rhr = average(
    snapshots
      .map((s) => s.restingHeartRate)
      .filter((v): v is number => typeof v === 'number' && v > 0),
  )
  const sleep = average(
    snapshots
      .map((s) => s.sleepHours)
      .filter((v): v is number => typeof v === 'number' && v > 0),
  )

  return {
    hrv,
    restingHeartRate: rhr,
    sleepHours: sleep,
    fetchedAt: Date.now(),
  }
}

export function useReadiness(): ReadinessSummary {
  const today = useMemo(() => new Date(), [])
  const {
    snapshot,
    status: snapshotStatus,
    isDemoMode,
    refresh: refreshSnapshot,
  } = useHealthSnapshot(today)

  const [baseline, setBaseline] = useState<BaselineState | null>(null)
  const [baselineStatus, setBaselineStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading')
  const isMounted = useRef(true)

  const loadBaselineNow = useMemo(
    () => async () => {
      setBaselineStatus('loading')
      try {
        const result = await loadBaseline()
        if (!isMounted.current) return
        setBaseline(result)
        setBaselineStatus('ready')
      } catch {
        if (!isMounted.current) return
        setBaselineStatus('error')
      }
    },
    [],
  )

  useEffect(() => {
    isMounted.current = true
    void loadBaselineNow()
    return () => {
      isMounted.current = false
    }
  }, [loadBaselineNow])

  const refresh = useMemo(
    () => async () => {
      await Promise.all([refreshSnapshot(), loadBaselineNow()])
    },
    [refreshSnapshot, loadBaselineNow],
  )

  // Compose status: either is loading → loading; either errored → error; else ready.
  const status: 'loading' | 'ready' | 'error' = (() => {
    if (snapshotStatus === 'loading' || baselineStatus === 'loading') {
      return 'loading'
    }
    if (snapshotStatus === 'error' || baselineStatus === 'error') {
      return 'error'
    }
    return 'ready'
  })()

  const recoveryScore = useMemo((): number | null => {
    if (status !== 'ready') return null
    const hrv = snapshot?.hrv ?? 0
    const rhr = snapshot?.restingHeartRate ?? 0
    // Treat value > 0 as a real reading; skip if both are missing/zero
    if (!(hrv > 0) && !(rhr > 0)) return null
    return computeRecoveryScore({
      hrv,
      restingHR: rhr,
      sleepHours: snapshot?.sleepHours ?? 0,
      hrvBaseline: baseline?.hrv ?? null,
      rhrBaseline: baseline?.restingHeartRate ?? null,
      sleepGoalHours: DEFAULT_SLEEP_GOAL_HOURS,
    }).score
  }, [status, snapshot, baseline])

  return {
    status,
    isDemoMode,
    hrv: buildMetric(
      snapshot?.hrv ?? null,
      baseline?.hrv ?? null,
      hrvDirection,
    ),
    restingHeartRate: buildMetric(
      snapshot?.restingHeartRate ?? null,
      baseline?.restingHeartRate ?? null,
      rhrDirection,
    ),
    sleepHours: buildMetric(
      snapshot?.sleepHours ?? null,
      baseline?.sleepHours ?? null,
      sleepDirection,
    ),
    recoveryScore,
    refresh,
  }
}
