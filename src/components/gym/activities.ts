import {
  CARDIO_MINUTES_GOAL,
  longestWorkout,
  summarizeMorningWeights,
} from '@/lib/dailyGoals'
import { STAIRMASTER_MINUTES_GOAL, type ProgrammeDay } from '@/lib/gymProgramme'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import type { GymDayLog } from '@/stores/GymLogStore'

type DayWorkouts = Pick<DailyHealthSnapshot, 'date' | 'workouts'>

export type GymActivity = 'stairmaster' | 'cardio' | 'lifting' | 'weight'

export interface ActivitySummary {
  /** null = nothing to measure, so the tile shows no progress. */
  progress: number | null
  done: boolean
  caption: string
  headline: string
}

function minutesSummary(minutes: number | null, goal: number): ActivitySummary {
  if (minutes === null) {
    return {
      progress: null,
      done: false,
      caption: '--',
      headline: 'No session yet',
    }
  }
  const whole = Math.floor(minutes)
  const done = minutes >= goal
  return {
    progress: Math.min(minutes / goal, 1),
    done,
    caption: `${whole}/${goal} min`,
    headline: done ? 'Today complete' : `${whole} of ${goal} min`,
  }
}

export function stairmasterSummary(
  snapshot: DayWorkouts | null,
): ActivitySummary {
  const stairs = longestWorkout(snapshot, 'stairClimber')
  return minutesSummary(
    stairs?.durationMinutes ?? null,
    STAIRMASTER_MINUTES_GOAL,
  )
}

export function cardioSummary(snapshot: DayWorkouts | null): ActivitySummary {
  const run = longestWorkout(snapshot, 'running')
  return minutesSummary(run?.durationMinutes ?? null, CARDIO_MINUTES_GOAL)
}

export function weightSummary(
  snapshot: DailyHealthSnapshot | null,
  date: Date,
): ActivitySummary {
  const { morning } = summarizeMorningWeights(
    snapshot?.bodyMassHistory ?? null,
    date,
  )
  return morning
    ? {
        progress: 1,
        done: true,
        caption: `${morning.kilograms.toFixed(1)} kg`,
        headline: `${morning.kilograms.toFixed(1)} kg`,
      }
    : {
        progress: null,
        done: false,
        caption: '--',
        headline: 'No weigh-in yet',
      }
}

/** To-failure exercises count as one target set. */
export function liftingSummary(
  day: ProgrammeDay | null,
  log: GymDayLog | undefined,
  snapshot: DailyHealthSnapshot | null,
): ActivitySummary {
  const finished =
    Boolean(log?.finishedAt) || longestWorkout(snapshot, 'strength') !== null
  if (!day) {
    return {
      progress: finished ? 1 : null,
      done: finished,
      caption: finished ? 'Done' : 'Not started',
      headline: finished ? 'Today complete' : 'No workout planned',
    }
  }
  if (day.exercises.length === 0) {
    return {
      progress: null,
      done: false,
      caption: 'Rest day',
      headline: 'Rest day',
    }
  }
  let target = 0
  let logged = 0
  for (const exercise of day.exercises) {
    const sets = exercise.sets === 'To Failure' ? 1 : exercise.sets
    target += sets
    logged += Math.min(log?.sets[exercise.id]?.length ?? 0, sets)
  }
  return {
    progress: finished ? 1 : logged / target,
    done: finished,
    caption: finished ? 'Done' : `${logged}/${target} sets`,
    headline: finished ? 'Today complete' : `${logged} of ${target} sets`,
  }
}
