import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Linking } from 'react-native'

import { atTime, type Commute, type PlannerDay } from '@/lib/planner'
import {
  plannerNative,
  readPlannerDay,
  setPlannerReminderCompleted,
} from '@/lib/plannerNative'
import { fetchCommute, type CommuteJourney } from '@/lib/transit'

function transitErrorMessage(reason: unknown, aborted: boolean): string {
  return aborted
    ? 'HSL timed out. Refresh to retry.'
    : reason instanceof Error &&
        /^(HSL |No suitable |Add your )/.test(reason.message)
      ? reason.message
      : 'Could not load HSL metro times. Refresh to retry.'
}

export function useDayPlanner(active: boolean, commute: Commute | null) {
  const [foreground, setForeground] = useState(
    AppState.currentState !== 'background',
  )
  const enabled = active && foreground
  const [now, setNow] = useState(() => new Date())
  const [day, setDay] = useState<PlannerDay | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const [transit, setTransit] = useState<CommuteJourney | null>(null)
  const [journeys, setJourneys] = useState<CommuteJourney[]>([])
  const [transitError, setTransitError] = useState<string | null>(null)
  const [reminderError, setReminderError] = useState<string | null>(null)
  const [pendingReminders, setPendingReminders] = useState<string[]>([])
  const reminderRequests = useRef(new Set<string>())
  const mounted = useRef(true)
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const readGeneration = useRef(0)
  const permissionInFlight = useRef(false)
  const refresh = useCallback(() => {
    setNow(new Date())
    setRevision((value) => value + 1)
  }, [])
  const available = plannerNative() !== null
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!active) return
    refresh()
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') refresh()
    }, 60_000)
    const subscription = AppState.addEventListener('change', (state) => {
      setForeground(state === 'active')
      if (state === 'active') refresh()
      else {
        enabledRef.current = false
        readGeneration.current += 1
        setDay(null)
        setTransit(null)
        setJourneys([])
      }
    })
    return () => {
      clearInterval(timer)
      subscription.remove()
    }
  }, [active, refresh])

  useEffect(() => {
    if (!enabled || !available) return
    let current = true
    const generation = ++readGeneration.current
    setError(null)
    void readPlannerDay(new Date()).then(
      (result) => {
        if (
          current &&
          readGeneration.current === generation &&
          reminderRequests.current.size === 0
        )
          setDay(result)
      },
      () => {
        if (
          current &&
          readGeneration.current === generation &&
          reminderRequests.current.size === 0
        ) {
          setDay(null)
          setError(
            'Could not read Calendar and Reminders. Refresh to retry or review access in iOS Settings.',
          )
        }
      },
    )
    return () => {
      current = false
    }
  }, [enabled, available, revision])

  useEffect(() => {
    setTransit(null)
    setJourneys([])
    setTransitError(null)
    if (!enabled || !available || !commute) return
    if (now.getDay() === 0 || now.getDay() === 6) return
    const controller = new AbortController()
    let current = true
    const timeout = setTimeout(() => controller.abort(), 12_000)
    void (async () => {
      const native = plannerNative()
      if (!native) throw new Error('Today connections are unavailable.')
      const key = await native.getTransitKey()
      if (!key) throw new Error('Add your Digitransit key in Commute setup.')
      const currentTime = new Date()
      const directions: CommuteJourney['direction'][] =
        currentTime.getTime() < atTime(currentTime, commute.start)
          ? ['To work', 'Home']
          : ['Home']
      const results = await Promise.allSettled(
        directions.map((direction) =>
          fetchCommute(commute, key, currentTime, controller.signal, direction),
        ),
      )
      return {
        journeys: results.flatMap((result) =>
          result.status === 'fulfilled' ? [result.value] : [],
        ),
        errors: results.flatMap((result, index) =>
          result.status === 'rejected'
            ? [
                `${directions[index]}: ${transitErrorMessage(result.reason, controller.signal.aborted)}`,
              ]
            : [],
        ),
      }
    })()
      .then(
        (result) => {
          if (current) {
            setJourneys(result.journeys)
            setTransit(result.journeys[0] ?? null)
            setTransitError(result.errors.join('\n') || null)
          }
        },
        (reason: unknown) => {
          if (current)
            setTransitError(
              transitErrorMessage(reason, controller.signal.aborted),
            )
        },
      )
      .finally(() => clearTimeout(timeout))
    return () => {
      current = false
      controller.abort()
      clearTimeout(timeout)
    }
  }, [enabled, available, commute, now, revision])

  const connect = async (kind: 'Calendar' | 'Reminders') => {
    const native = plannerNative()
    if (!native || permissionInFlight.current) return
    permissionInFlight.current = true
    setBusy(true)
    setError(null)
    try {
      const access =
        kind === 'Calendar' ? day?.calendarAccess : day?.remindersAccess
      if (access === 'denied') {
        await Linking.openSettings()
        return
      }
      const granted = await (kind === 'Calendar'
        ? native.requestCalendarAccess()
        : native.requestRemindersAccess())
      if (!granted)
        setError(
          `${kind} access was not granted. You can change it in iOS Settings.`,
        )
      refresh()
    } catch {
      setError(`Could not request ${kind} access. Try again in iOS Settings.`)
    } finally {
      permissionInFlight.current = false
      setBusy(false)
    }
  }

  const setReminderCompleted = async (id: string, completed: boolean) => {
    if (reminderRequests.current.has(id)) return
    if (
      !enabled ||
      !available ||
      day?.remindersAccess !== 'granted' ||
      !day.reminders.some((reminder) => reminder.id === id)
    ) {
      setReminderError(
        'Refresh and connect Apple Reminders before changing a task.',
      )
      return
    }
    reminderRequests.current.add(id)
    readGeneration.current += 1
    setPendingReminders([...reminderRequests.current])
    setReminderError(null)
    try {
      const saved = await setPlannerReminderCompleted(id, completed)
      if (!mounted.current || !enabledRef.current) return
      setDay((current) =>
        current
          ? {
              ...current,
              reminders: current.reminders.map((reminder) =>
                reminder.id === saved.id
                  ? { ...reminder, completed: saved.completed }
                  : reminder,
              ),
            }
          : current,
      )
    } catch {
      if (mounted.current && enabledRef.current)
        setReminderError(
          'Could not confirm the reminder change. Check the task and try again.',
        )
    } finally {
      reminderRequests.current.delete(id)
      if (mounted.current) {
        setPendingReminders([...reminderRequests.current])
        if (enabledRef.current) refresh()
      }
    }
  }

  return {
    now,
    day,
    error,
    busy,
    available,
    connect,
    refresh,
    transit,
    journeys,
    transitError,
    reminderError,
    pendingReminders,
    setReminderCompleted,
  }
}
