import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'

import { ActivityDetail, streakStats } from '@/components/gym/ActivityDetail'
import {
  StairCalendar,
  StairHighlights,
  StairSession,
} from '@/components/gym/StairmasterCalendar'
import { stairmasterSummary } from '@/components/gym/activities'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { STAIRMASTER_MINUTES_GOAL } from '@/lib/gymProgramme'
import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import { localDateKey, localDaysEnding } from '@/lib/healthSnapshot/dateKey'
import type { HealthWorkout } from '@/lib/healthSnapshot/types'

export default function StairmasterScreen() {
  return (
    <HealthDateRoute>
      {(date) => <StairmasterForDate date={date} />}
    </HealthDateRoute>
  )
}

/** Reads `read()` once per `key`, again whenever `refresh` changes; 'error' on failure, undefined while loading. */
function useHealthRead<T>(
  key: string,
  read: () => Promise<T>,
  refresh: unknown,
): T | 'error' | undefined {
  const [state, setState] = useState<{
    key: string
    refresh: unknown
    data: T | 'error'
  }>()
  useEffect(() => {
    let active = true
    read().then(
      (data) => active && setState({ key, refresh, data }),
      () => active && setState({ key, refresh, data: 'error' }),
    )
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` identifies `read`
  }, [key, refresh])
  return state?.key === key && state.refresh === refresh
    ? state.data
    : undefined
}

function StairmasterForDate({ date }: { date: Date }) {
  const router = useRouter()
  const key = localDateKey(date)
  const { snapshot, isDemoMode } = useHealthSnapshot(date)
  const sessions = useHealthRead(
    key,
    () => healthSnapshot.getStairSessions(new Date(`${key}T12:00:00`)),
    snapshot,
  )
  // Every stair session ever feeds the calendar and the streak.
  const all = useHealthRead(
    'all',
    () => healthSnapshot.getStairWorkouts(),
    snapshot,
  )
  const stairs = Array.isArray(all) ? all : null
  const days = useMemo(() => {
    const byDay = new Map<string, HealthWorkout[]>()
    for (const w of stairs ?? []) {
      const day = localDateKey(new Date(w.startISO))
      byDay.set(day, [...(byDay.get(day) ?? []), w])
    }
    return new Map(
      [...byDay].map(([date, workouts]) => [
        date,
        stairmasterSummary({ date, workouts }),
      ]),
    )
  }, [stairs])
  const history =
    stairs &&
    localDaysEnding(date, 31).map((d) => ({
      date: d,
      done: days.get(localDateKey(d))?.done ?? false,
    }))
  return (
    <ActivityDetail
      testID="gym-stairmaster-screen"
      title="Stairmaster"
      date={date}
      icon="stairs"
      summary={stairmasterSummary(snapshot)}
      detail={`Goal ${STAIRMASTER_MINUTES_GOAL} min · Apple Health`}
      stats={streakStats(history)}
      recent={null}
    >
      <StairHighlights workouts={all} demo={isDemoMode} />
      <StairCalendar
        selected={date}
        first={stairs?.[0] ? new Date(stairs[0].startISO) : null}
        days={days}
        onSelect={(date) => router.setParams({ date })}
      />
      {sessions === undefined ? null : sessions === 'error' ||
        sessions.length === 0 ? (
        <StairSession data={sessions === 'error' ? 'error' : null} />
      ) : (
        sessions.map((session, i) => (
          <StairSession
            key={session.workout.startISO}
            data={session}
            label={
              sessions.length > 1
                ? `Session ${i + 1} of ${sessions.length}`
                : undefined
            }
          />
        ))
      )}
    </ActivityDetail>
  )
}
