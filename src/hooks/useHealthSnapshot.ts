import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { Platform } from 'react-native'

import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import { createDeterministicMockSnapshot } from '@/lib/healthSnapshot/mockAdapter'
import type {
  DailyHealthSnapshot,
  HealthSnapshotSource,
} from '@/lib/healthSnapshot/types'

type HealthSnapshotStatus = 'loading' | 'ready' | 'error'
type AuthorizationStatus = 'idle' | 'requesting' | 'completed' | 'error'

interface SourceState {
  source: HealthSnapshotSource
  isDemoMode: boolean
}

interface HealthSnapshotHookState extends SourceState {
  dateKey: string
  snapshot: DailyHealthSnapshot | null
  status: HealthSnapshotStatus
  error: string | null
}

interface AuthorizationState extends SourceState {
  status: AuthorizationStatus
  error: string | null
}

export function useHealthSnapshot(date?: Date): {
  snapshot: DailyHealthSnapshot | null
  status: HealthSnapshotStatus
  isDemoMode: boolean
  error: string | null
  authorizationStatus: AuthorizationStatus
  authorizationError: string | null
  refresh: () => Promise<void>
  /** True means the request completed, not that read access was granted. */
  requestAuthorization: () => Promise<boolean>
} {
  const source = healthSnapshot
  const isDemoMode = !source.isAvailable()
  const defaultDateRef = useRef(date ?? new Date())
  const targetDate = date ?? defaultDateRef.current
  const dateKey = targetDate.toDateString()
  const targetDateRef = useRef(new Date(targetDate))
  const activeSourceRef = useRef<SourceState | null>(null)
  const loadRequestRef = useRef(0)
  const authorizationRequestRef = useRef<Promise<boolean> | null>(null)
  const initialLoadRef = useRef(true)

  const [state, setState] = useState<HealthSnapshotHookState>(() => ({
    source,
    dateKey,
    snapshot: isDemoMode ? createDeterministicMockSnapshot(targetDate) : null,
    status: isDemoMode ? 'ready' : 'loading',
    isDemoMode,
    error: null,
  }))
  const [authorization, setAuthorization] = useState<AuthorizationState>({
    source,
    isDemoMode,
    status: 'idle',
    error: null,
  })

  useLayoutEffect(() => {
    if (targetDateRef.current.toDateString() !== dateKey) {
      loadRequestRef.current += 1
    }
    targetDateRef.current = new Date(targetDate)
  }, [dateKey, targetDate])

  useLayoutEffect(() => {
    activeSourceRef.current = { source, isDemoMode }
    setAuthorization({ source, isDemoMode, status: 'idle', error: null })

    return () => {
      activeSourceRef.current = null
      authorizationRequestRef.current = null
      loadRequestRef.current += 1
    }
  }, [source, isDemoMode])

  const fetchSnapshot = useCallback(async () => {
    const activeSource = activeSourceRef.current
    if (
      !activeSource ||
      activeSource.source !== source ||
      activeSource.isDemoMode !== isDemoMode
    ) {
      return
    }

    const nextDate = new Date(targetDateRef.current)
    const nextDateKey = nextDate.toDateString()
    const request = ++loadRequestRef.current
    const isCurrent = () =>
      activeSourceRef.current === activeSource &&
      loadRequestRef.current === request &&
      targetDateRef.current.toDateString() === nextDateKey

    setState((prev) => ({
      source,
      dateKey: nextDateKey,
      isDemoMode,
      snapshot:
        prev.source === source &&
        prev.dateKey === nextDateKey &&
        prev.isDemoMode === isDemoMode
          ? prev.snapshot
          : null,
      status: 'loading',
      error: null,
    }))

    try {
      const snapshot = await source.getDailySnapshot(nextDate)
      if (isCurrent()) {
        setState({
          source,
          dateKey: nextDateKey,
          isDemoMode,
          snapshot,
          status: 'ready',
          error: null,
        })
      }
    } catch {
      if (isCurrent()) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: 'Unable to load health data',
        }))
      }
    }
  }, [source, isDemoMode])

  const requestAuthorization = useCallback((): Promise<boolean> => {
    const activeSource = activeSourceRef.current
    if (
      Platform.OS !== 'ios' ||
      !activeSource ||
      activeSource.source !== source ||
      activeSource.isDemoMode !== isDemoMode ||
      activeSource.isDemoMode
    ) {
      return Promise.resolve(false)
    }
    if (authorizationRequestRef.current) {
      return authorizationRequestRef.current
    }

    setAuthorization({ source, isDemoMode, status: 'requesting', error: null })
    const request: Promise<boolean> = Promise.resolve()
      .then(() =>
        activeSourceRef.current === activeSource
          ? source.requestAuthorization()
          : false,
      )
      .catch(() => false)
      .then(async (completed) => {
        if (
          activeSourceRef.current !== activeSource ||
          authorizationRequestRef.current !== request
        ) {
          return false
        }

        authorizationRequestRef.current = null
        setAuthorization({
          source,
          isDemoMode,
          status: completed ? 'completed' : 'error',
          error: completed
            ? null
            : 'Unable to request Health access. Try again or review permissions in the Health app.',
        })
        if (completed) {
          await fetchSnapshot()
        }
        return completed
      })
    authorizationRequestRef.current = request
    return request
  }, [source, isDemoMode, fetchSnapshot])

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false
      if (isDemoMode) {
        return
      }
    }

    void fetchSnapshot()
  }, [dateKey, source, isDemoMode, fetchSnapshot])

  // Effects have not run yet on the first render of a newly selected day.
  const hasCurrentData =
    state.source === source &&
    state.dateKey === dateKey &&
    state.isDemoMode === isDemoMode
  const hasCurrentAuthorization =
    authorization.source === source && authorization.isDemoMode === isDemoMode

  return {
    snapshot: hasCurrentData ? state.snapshot : null,
    status: hasCurrentData ? state.status : 'loading',
    isDemoMode,
    error: hasCurrentData ? state.error : null,
    authorizationStatus: hasCurrentAuthorization
      ? authorization.status
      : 'idle',
    authorizationError: hasCurrentAuthorization ? authorization.error : null,
    refresh: fetchSnapshot,
    requestAuthorization,
  }
}
