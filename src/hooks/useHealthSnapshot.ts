import { useCallback, useEffect, useRef, useState } from 'react'

import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import { createDeterministicMockSnapshot } from '@/lib/healthSnapshot/mockAdapter'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import { useStepsStoreBase } from '@/stores/StepsStore'

type HealthSnapshotStatus = 'unauthorized' | 'loading' | 'ready' | 'error'

interface HealthSnapshotHookState {
  snapshot: DailyHealthSnapshot | null
  status: HealthSnapshotStatus
  isDemoMode: boolean
  error: string | null
}

export function useHealthSnapshot(date?: Date): {
  snapshot: DailyHealthSnapshot | null
  status: HealthSnapshotStatus
  isDemoMode: boolean
  error: string | null
  refresh: () => Promise<void>
  requestAuthorization: () => Promise<boolean>
} {
  const defaultDateRef = useRef(date ?? new Date())
  const targetDate = date ?? defaultDateRef.current
  const dateKey = targetDate.toDateString()
  const targetDateRef = useRef(targetDate)
  const didMount = useRef(false)

  const [state, setState] = useState<HealthSnapshotHookState>(() => {
    if (!healthSnapshot.isAvailable()) {
      return {
        snapshot: createDeterministicMockSnapshot(targetDate),
        status: 'ready',
        isDemoMode: true,
        error: null,
      }
    }

    // On iOS we cannot reliably ask HealthKit whether read access has been
    // granted — Apple intentionally hides that to prevent fingerprinting.
    // Start in `loading` and attempt a fetch on mount; per-metric reads in
    // the iOS adapter swallow individual errors and return zeros, so an
    // unauthorized fetch is safe and yields the same empty snapshot the
    // user would see otherwise.
    return {
      snapshot: null,
      status: 'loading',
      isDemoMode: false,
      error: null,
    }
  })

  useEffect(() => {
    targetDateRef.current = targetDate
  }, [dateKey, targetDate])

  const fetchSnapshot = useCallback(async (nextDate: Date) => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }))

    try {
      const snapshot = await healthSnapshot.getDailySnapshot(nextDate)
      useStepsStoreBase.getState().setSteps(snapshot.steps ?? 0)
      setState((prev) => ({
        ...prev,
        snapshot,
        status: 'ready',
        error: null,
      }))
    } catch {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: 'Unable to load health data',
      }))
    }
  }, [])

  const requestAuthorization = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }))

    const granted = await healthSnapshot.requestAuthorization()
    if (!granted) {
      setState((prev) => ({
        ...prev,
        status: 'unauthorized',
        error: 'HealthKit authorization failed',
      }))
      return false
    }

    await fetchSnapshot(targetDateRef.current)
    return true
  }, [fetchSnapshot])

  const refresh = useCallback(async () => {
    await fetchSnapshot(targetDateRef.current)
  }, [fetchSnapshot])

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      if (healthSnapshot.isAvailable()) {
        void fetchSnapshot(targetDateRef.current)
      }
      return
    }

    void fetchSnapshot(targetDateRef.current)
  }, [dateKey, fetchSnapshot])

  return {
    ...state,
    refresh,
    requestAuthorization,
  }
}
