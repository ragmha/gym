import { useCallback, useEffect, useRef, useState } from 'react'

import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import { createDeterministicMockSnapshot } from '@/lib/healthSnapshot/mockAdapter'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'

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
  const statusRef = useRef<HealthSnapshotStatus>('unauthorized')
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

    return {
      snapshot: null,
      status: 'unauthorized',
      isDemoMode: false,
      error: null,
    }
  })

  useEffect(() => {
    targetDateRef.current = targetDate
  }, [dateKey, targetDate])

  useEffect(() => {
    statusRef.current = state.status
  }, [state.status])

  const fetchSnapshot = useCallback(async (nextDate: Date) => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }))

    try {
      const snapshot = await healthSnapshot.getDailySnapshot(nextDate)
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
    if (statusRef.current === 'unauthorized') return
    await fetchSnapshot(targetDateRef.current)
  }, [fetchSnapshot])

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      return
    }

    if (statusRef.current !== 'unauthorized') {
      void fetchSnapshot(targetDateRef.current)
    }
  }, [dateKey, fetchSnapshot])

  return {
    ...state,
    refresh,
    requestAuthorization,
  }
}
