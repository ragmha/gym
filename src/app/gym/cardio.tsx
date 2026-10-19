import { ActivityDetail, streakStats } from '@/components/gym/ActivityDetail'
import { cardioSummary } from '@/components/gym/activities'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory'
import { CARDIO_MINUTES_GOAL } from '@/lib/dailyGoals'
import { findProgrammeDay, programmeDayFor } from '@/lib/gymProgramme'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import { useGymLogStore } from '@/stores/GymLogStore'

export default function CardioScreen() {
  return (
    <HealthDateRoute>{(date) => <CardioForDate date={date} />}</HealthDateRoute>
  )
}

function CardioForDate({ date }: { date: Date }) {
  const dateKey = localDateKey(date)
  const { snapshot } = useHealthSnapshot(date)
  const programmeStart = useGymLogStore((s) => s.programmeStart)
  const loggedDay = useGymLogStore((s) => s.logs[dateKey]?.day)
  const scheduled = programmeStart
    ? programmeDayFor(programmeStart, dateKey)
    : null
  const day = loggedDay
    ? findProgrammeDay(loggedDay)
    : scheduled && 'day' in scheduled
      ? scheduled.day
      : null
  const history = useWorkoutHistory(date, 31, snapshot)?.map((d) => ({
    date: new Date(`${d.date}T12:00:00`),
    done: cardioSummary(d).done,
  }))
  return (
    <ActivityDetail
      testID="gym-cardio-screen"
      title="Cardio"
      date={date}
      icon="cardio"
      summary={cardioSummary(snapshot)}
      detail={
        day && 'cardio' in day
          ? `Plan ${day.cardio.morning} AM · ${day.cardio.evening} PM`
          : `Goal ${CARDIO_MINUTES_GOAL} min run · Apple Health`
      }
      stats={streakStats(history ?? null)}
      recent={history?.slice(-7) ?? null}
    />
  )
}
