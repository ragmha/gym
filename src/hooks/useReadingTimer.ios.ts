import { requireOptionalNativeModule } from 'expo'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, AppState, Platform } from 'react-native'

import type { ReadingTimer } from '@/hooks/useReadingTimer'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'

type ReadingActivity = typeof import('@/lib/readingActivity')

function loadReadingActivity(): ReadingActivity | null {
  // Builds before 1.0.12 lack the widget extension; never load it there.
  if (!requireOptionalNativeModule('ExpoWidgets')) return null
  // Live Activities start only on iOS 16.2 and later.
  if (Number.parseFloat(String(Platform.Version)) < 16.2) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@/lib/readingActivity') as ReadingActivity
  } catch {
    return null
  }
}

// In memory for this app run only, so remounting the tile keeps the session.
const startedAt: { current: number | null } = { current: null }
let lastSession: ReadingTimer['last'] = null

export function useReadingTimer(): ReadingTimer | null {
  const live = loadReadingActivity()
  const [running, setRunning] = useState(false)
  const [last, setLast] = useState<ReadingTimer['last']>(lastSession)
  const pendingStop = useRef(false)

  const stop = useCallback(() => {
    if (!live || pendingStop.current) return
    pendingStop.current = true
    const began = startedAt.current
    if (began !== null) {
      lastSession = {
        minutes: Math.floor((Date.now() - began) / 60_000),
        day: localDateKey(new Date()),
      }
      setLast(lastSession)
    }

    const reconcile = () => {
      pendingStop.current = false
      const active = live.isReading()
      setRunning(active)
      if (active) {
        if (began !== null) startedAt.current = began
      } else {
        startedAt.current = null
      }
    }

    try {
      void live.stopReading().then(reconcile, reconcile)
    } catch {
      reconcile()
    }
  }, [live])

  useEffect(() => {
    if (!live) return
    const refresh = () => {
      if (pendingStop.current) return
      const active = live.isReading()
      setRunning(active)
      if (!active) startedAt.current = null
    }
    refresh()
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh()
    })
    const stopTap = live.addStopListener(stop)
    return () => {
      appState.remove()
      stopTap.remove()
    }
  }, [live, stop])

  if (!live) return null
  return {
    running,
    last,
    start: () => {
      if (pendingStop.current) return false
      const now = Date.now()
      try {
        live.startReading(now)
      } catch {
        Alert.alert(
          "Couldn't start the reading timer",
          'Turn on Live Activities for gym in Settings, then try again.',
        )
        return false
      }
      startedAt.current = now
      setRunning(true)
      return true
    },
    stop,
  }
}
