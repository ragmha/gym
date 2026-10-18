import {
  CARDIO_MINUTES_GOAL,
  longestWorkout,
  summarizeMorningWeights,
} from '@/lib/dailyGoals'
import { STAIRMASTER_MINUTES_GOAL, type ProgrammeDay } from '@/lib/gymProgramme'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import type {
  DailyHealthSnapshot,
  HealthHeartRateSample,
  HealthWorkout,
} from '@/lib/healthSnapshot/types'
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

export function stairmasterHighlights(
  workouts: HealthWorkout[],
  now = new Date(),
) {
  const sessions = workouts.filter(
    (w) =>
      w.kind === 'stairClimber' &&
      w.durationMinutes > 0 &&
      Date.parse(w.startISO) <= now.getTime() &&
      Date.parse(w.endISO) <= now.getTime(),
  )
  const goalDays = new Set<string>()
  const starts = Array<number>(48).fill(0)
  let totalMinutes = 0
  for (const workout of sessions) {
    const start = new Date(workout.startISO)
    totalMinutes += workout.durationMinutes
    starts[start.getHours() * 2 + Math.floor(start.getMinutes() / 30)]++
    if (workout.durationMinutes >= STAIRMASTER_MINUTES_GOAL) {
      goalDays.add(localDateKey(start))
    }
  }

  let bestStreak: { days: number; start: string; end: string } | null = null
  let bestMonth: { month: string; days: number } | null = null
  const months = new Map<string, number>()
  let runStart = ''
  let nextDay = ''
  let run = 0
  for (const day of [...goalDays].sort()) {
    if (day === nextDay) run++
    else {
      run = 1
      runStart = day
    }
    // Calendar arithmetic keeps a DST change from breaking a streak.
    const next = new Date(`${day}T12:00:00`)
    next.setDate(next.getDate() + 1)
    nextDay = localDateKey(next)
    if (run >= (bestStreak?.days ?? 0)) {
      bestStreak = { days: run, start: runStart, end: day }
    }
    const month = day.slice(0, 7)
    const count = (months.get(month) ?? 0) + 1
    months.set(month, count)
    if (count >= (bestMonth?.days ?? 0)) {
      bestMonth = { month, days: count }
    }
  }

  const mostStarts = Math.max(...starts)
  // ponytail: half-hour bins describe a habit, not a recommended training time.
  const usualStart =
    mostStarts > 1
      ? {
          minute: starts.indexOf(mostStarts) * 30,
          sessions: mostStarts,
          tied: starts.filter((count) => count === mostStarts).length > 1,
        }
      : null
  return {
    bestStreak,
    bestMonth,
    usualStart,
    sessions: sessions.length,
    totalMinutes,
    startCounts: starts,
    monthlyGoalDays: Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1, 12)
      const month = localDateKey(date).slice(0, 7)
      return { month, days: months.get(month) ?? 0 }
    }),
  }
}

/** Lower bounds of zones 2–5 as a share of max heart rate; zone 1 is everything below. */
export const HEART_RATE_ZONE_BOUNDS = [0.6, 0.7, 0.8, 0.9]

/** Zone (1–5) for a heart rate against `maxHeartRate`. */
export function heartRateZone(bpm: number, maxHeartRate: number): number {
  return (
    1 + HEART_RATE_ZONE_BOUNDS.filter((b) => bpm >= b * maxHeartRate).length
  )
}

/** Minutes spent in each of the five zones; a sample lasts until the next one or the session end, minus paused time. */
export function zoneMinutes(
  samples: HealthHeartRateSample[],
  endISO: string,
  maxHeartRate: number,
  pauses: { startISO: string; endISO: string }[] = [],
): number[] {
  const minutes = [0, 0, 0, 0, 0]
  samples.forEach((sample, i) => {
    const from = Date.parse(sample.startISO)
    // ponytail: a sensor gap counts as at most 60 s so a dropout can't inflate one zone
    const to = Math.min(
      Date.parse(samples[i + 1]?.startISO ?? endISO),
      from + 60_000,
    )
    const paused = pauses.reduce(
      (sum, p) =>
        sum +
        Math.max(
          Math.min(to, Date.parse(p.endISO)) -
            Math.max(from, Date.parse(p.startISO)),
          0,
        ),
      0,
    )
    minutes[heartRateZone(sample.bpm, maxHeartRate) - 1] +=
      Math.max(to - from - paused, 0) / 60_000
  })
  return minutes
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
