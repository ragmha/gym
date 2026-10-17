import { ActivityDetail, streakStats } from '@/components/gym/ActivityDetail'
import { stairmasterSummary } from '@/components/gym/activities'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory'
import { STAIRMASTER_MINUTES_GOAL } from '@/lib/gymProgramme'

export default function StairmasterScreen() {
  return (
    <HealthDateRoute>
      {(date) => <StairmasterForDate date={date} />}
    </HealthDateRoute>
  )
}

function StairmasterForDate({ date }: { date: Date }) {
  const { snapshot } = useHealthSnapshot(date)
  const history = useWorkoutHistory(date, 31, snapshot)?.map((d) => ({
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
      recent={history?.slice(-7) ?? null}
    />
  )
}
