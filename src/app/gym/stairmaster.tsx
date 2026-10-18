import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'

import { ActivityDetail, streakStats } from '@/components/gym/ActivityDetail'
import {
  StairCalendar,
  StairSession,
} from '@/components/gym/StairmasterCalendar'
import { stairmasterSummary } from '@/components/gym/activities'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory'
import { STAIRMASTER_MINUTES_GOAL } from '@/lib/gymProgramme'
import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import type {
  DailyHealthSnapshot,
  StairSessionHeartRate,
} from '@/lib/healthSnapshot/types'

export default function StairmasterScreen() {
  return (
    <HealthDateRoute>
      {(date) => <StairmasterForDate date={date} />}
    </HealthDateRoute>
  )
}

function useStairHeartRate(
  date: Date,
  refresh: DailyHealthSnapshot | null,
): StairSessionHeartRate | null | 'error' | undefined {
  const key = localDateKey(date)
  const [state, setState] = useState<{
    key: string
    data: StairSessionHeartRate | null | 'error'
  }>()
  useEffect(() => {
    let active = true
    healthSnapshot.getStairHeartRate(new Date(`${key}T12:00:00`)).then(
      (data) => active && setState({ key, data }),
      () => active && setState({ key, data: 'error' }),
    )
    return () => {
      active = false
    }
  }, [key, refresh])
  return state?.key === key ? state.data : undefined
}

function StairmasterForDate({ date }: { date: Date }) {
  const router = useRouter()
  const key = localDateKey(date)
  const { snapshot } = useHealthSnapshot(date)
  const session = useStairHeartRate(date, snapshot)
  // One year ending today feeds both the calendar and the streak.
  const year = useWorkoutHistory(new Date(), 366, snapshot)
  const days = useMemo(
    () =>
      new Map(
        (year ?? [])
          .map((d) => [d.date, stairmasterSummary(d)] as const)
          .filter(([, s]) => s.progress !== null),
      ),
    [year],
  )
  const history = year
    ?.filter((d) => d.date <= key)
    .slice(-31)
    .map((d) => ({
      date: new Date(`${d.date}T12:00:00`),
      done: stairmasterSummary(d).done,
    }))
  return (
    <ActivityDetail
      testID="gym-stairmaster-screen"
      title="Stairmaster"
      date={date}
      icon="stairs"
      summary={stairmasterSummary(snapshot)}
      detail={`Goal ${STAIRMASTER_MINUTES_GOAL} min · Apple Health`}
      stats={streakStats(history ?? null)}
      recent={null}
    >
      <StairCalendar
        selected={date}
        days={days}
        onSelect={(date) => router.setParams({ date })}
      />
      <StairSession data={session} />
    </ActivityDetail>
  )
}
