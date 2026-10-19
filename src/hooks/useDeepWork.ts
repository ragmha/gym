import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'

import {
  advanceDeepWork,
  pauseDeepWork,
  resumeDeepWork,
  startDeepWork,
  type DeepWorkSession,
} from '@/lib/deepWork'
import { loadDeepWorkActivity } from '@/lib/loadDeepWorkActivity'

export interface DeepWork {
  session: DeepWorkSession | null
  /** The current block is mirrored in the Dynamic Island. */
  island: boolean
  start: () => void
  pause: () => void
  resume: () => void
  end: () => void
}

// In memory for this app run only, so remounting Home keeps the session.
let current: DeepWorkSession | null = null
// Dismissal is async; queue so a quick restart never updates the dying activity.
let mirrored: Promise<void> = Promise.resolve()

function mirror(next: DeepWorkSession | null, now: number) {
  const live = loadDeepWorkActivity()
  if (!live) return
  mirrored = mirrored
    .then(() => (next ? live.showDeepWork(next, now) : live.endDeepWork()))
    .catch(() => {
      // ponytail: Live Activities are off in Settings; the in-app timer still runs.
    })
}

export function useDeepWork(): DeepWork {
  const [session, setSession] = useState(current)

  const commit = useCallback(
    (
      next: (s: DeepWorkSession | null, now: number) => DeepWorkSession | null,
    ) => {
      const now = Date.now()
      current = next(current, now)
      setSession(current)
      mirror(current, now)
    },
    [],
  )

  useEffect(() => {
    // An activity left by a previous app run has no session to drive it.
    if (!current) mirror(null, Date.now())
  }, [])

  // Always a new object, so an early or clock-skewed timer re-arms.
  useEffect(() => {
    if (session?.endsAt == null) return
    const sync = () => commit((s, now) => s && advanceDeepWork(s, now))
    const timer = setTimeout(sync, session.endsAt - Date.now())
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync()
    })
    return () => {
      clearTimeout(timer)
      appState.remove()
    }
  }, [session, commit])

  return {
    session,
    island: loadDeepWorkActivity() !== null,
    start: () => commit((_, now) => startDeepWork(now)),
    pause: () => commit((s, now) => s && pauseDeepWork(s, now)),
    resume: () => commit((s, now) => s && resumeDeepWork(s, now)),
    end: () => commit(() => null),
  }
}
