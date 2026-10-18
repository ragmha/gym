import type { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'

import { DAILY_STEP_GOAL } from '@/lib/dailyGoals'
import type {
  DailyStepReading,
  DailyWaterReading,
  DailyWorkouts,
  HealthWorkout,
} from '@/lib/healthSnapshot/types'
import type { GymDayLog } from '@/stores/GymLogStore'

export interface Badge {
  id: string
  title: string
  icon: ComponentProps<typeof Ionicons>['name']
  /** Short text shown on the medal instead of the icon. */
  mark?: string
  /** Local YYYY-MM-DD it was first earned; null means locked. */
  date: string | null
  /** Record value, e.g. "42 min". */
  value?: string
  progress?: { current: number; target: number }
}

export interface BadgeSection {
  title: string
  badges: Badge[]
}

export interface AchievementInput {
  /** Oldest first, one entry per local day. */
  steps: DailyStepReading[]
  water: DailyWaterReading[]
  workouts: DailyWorkouts[]
  gymLogs: Record<string, GymDayLog>
}

type Entry = { date: string; value: number }

function record(
  id: string,
  title: string,
  icon: Badge['icon'],
  entries: Entry[],
  format: (value: number) => string,
): Badge {
  // Strict > keeps the earliest day on ties, since entries are oldest first.
  const best = entries.reduce<Entry | null>(
    (top, entry) => (entry.value > (top?.value ?? 0) ? entry : top),
    null,
  )
  return best
    ? { id, title, icon, date: best.date, value: format(best.value) }
    : { id, title, icon, date: null }
}

/** `dates[i]` is the day the (i+1)th event happened, oldest first. */
function milestones(
  id: string,
  icon: Badge['icon'],
  dates: string[],
  targets: number[],
  title: (target: number) => string,
  mark: (target: number) => string = String,
): Badge[] {
  return targets.map((target) => ({
    id: `${id}-${target}`,
    title: title(target),
    icon,
    mark: mark(target),
    date: dates[target - 1] ?? null,
    progress: { current: Math.min(dates.length, target), target },
  }))
}

/** `result[i]` is the first day a run of consecutive hits reached i+1 days. */
function streakDates(days: { date: string; hit: boolean }[]): string[] {
  const reached: string[] = []
  let run = 0
  for (const day of days) {
    run = day.hit ? run + 1 : 0
    if (run > reached.length) reached.push(day.date)
  }
  return reached
}

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? '' : 's'}`
const thousands = (value: number) => `${value / 1000}K`

export function buildAchievements({
  steps,
  water,
  workouts,
  gymLogs,
}: AchievementInput): BadgeSection[] {
  const stepEntries = steps.flatMap(({ date, steps: value }) =>
    value === null ? [] : [{ date, value }],
  )
  const allWorkouts = workouts.flatMap(({ date, workouts: list }) =>
    list.map((workout) => ({ date, workout })),
  )
  const workoutEntries = (
    pick: (workout: HealthWorkout) => number | null,
    kind?: HealthWorkout['kind'],
  ) =>
    allWorkouts.flatMap(({ date, workout }) => {
      const value = pick(workout)
      return (kind && workout.kind !== kind) || value === null
        ? []
        : [{ date, value }]
    })
  const minutes = (value: number) => `${Math.floor(value)} min`

  const liftDays = Object.keys(gymLogs)
    .filter((date) => gymLogs[date].finishedAt)
    .sort()
  const sets = Object.keys(gymLogs)
    .sort()
    .flatMap((date) =>
      Object.values(gymLogs[date].sets)
        .flat()
        .map((set) => ({ date, value: set.kilograms ?? 0 })),
    )

  const bestSteps = Math.max(0, ...stepEntries.map((entry) => entry.value))
  const workoutDays = new Set(allWorkouts.map(({ date }) => date))

  return [
    {
      title: 'Personal records',
      badges: [
        record(
          'most-steps',
          'Most steps',
          'footsteps-outline',
          stepEntries,
          (v) => v.toLocaleString(),
        ),
        record(
          'longest-run',
          'Longest run',
          'walk-outline',
          workoutEntries((w) => w.durationMinutes, 'running'),
          minutes,
        ),
        record(
          'longest-stairs',
          'Longest stair climb',
          'trending-up-outline',
          workoutEntries((w) => w.durationMinutes, 'stairClimber'),
          minutes,
        ),
        record(
          'longest-workout',
          'Longest workout',
          'stopwatch-outline',
          workoutEntries((w) => w.durationMinutes),
          minutes,
        ),
        record(
          'biggest-burn',
          'Biggest burn',
          'flame-outline',
          workoutEntries((w) => w.calories),
          (v) => `${v.toLocaleString()} kcal`,
        ),
        record(
          'heaviest-set',
          'Heaviest set',
          'barbell-outline',
          sets,
          (v) => `${v} kg`,
        ),
        record(
          'most-water',
          'Most water',
          'water-outline',
          water.flatMap(({ date, liters }) =>
            liters === null ? [] : [{ date, value: liters }],
          ),
          (v) => `${v.toFixed(1)} L`,
        ),
      ],
    },
    {
      title: 'Steps',
      badges: [10_000, 15_000, DAILY_STEP_GOAL, 25_000, 30_000].map(
        (target) => ({
          id: `steps-${target}`,
          title: `${target.toLocaleString()} steps`,
          icon: 'footsteps-outline',
          mark: thousands(target),
          date:
            stepEntries.find((entry) => entry.value >= target)?.date ?? null,
          progress: { current: Math.min(bestSteps, target), target },
        }),
      ),
    },
    {
      title: 'Streaks',
      badges: [
        ...milestones(
          'goal-streak',
          'flash-outline',
          streakDates(
            steps.map(({ date, steps: value }) => ({
              date,
              hit: value !== null && value >= DAILY_STEP_GOAL,
            })),
          ),
          [3, 7, 14, 30],
          (n) => `${n}-day step goal`,
          (n) => `${n}d`,
        ),
        ...milestones(
          'workout-streak',
          'calendar-outline',
          streakDates(
            workouts.map(({ date }) => ({ date, hit: workoutDays.has(date) })),
          ),
          [3, 7, 14],
          (n) => `${n} workout days in a row`,
          (n) => `${n}d`,
        ),
      ],
    },
    {
      title: 'Workouts',
      badges: milestones(
        'workouts',
        'fitness-outline',
        allWorkouts.map(({ date }) => date),
        [1, 10, 25, 50, 100, 250],
        (n) => (n === 1 ? 'First workout' : plural(n, 'workout')),
      ),
    },
    {
      title: 'Lifting',
      badges: [
        ...milestones(
          'lifts',
          'barbell-outline',
          liftDays,
          [1, 5, 10, 25, 50],
          (n) => (n === 1 ? 'First session' : plural(n, 'session')),
        ),
        ...milestones(
          'sets',
          'layers-outline',
          sets.map(({ date }) => date),
          [100, 500, 1000],
          (n) => `${n.toLocaleString()} sets`,
          (n) => (n >= 1000 ? thousands(n) : String(n)),
        ),
      ],
    },
    {
      title: 'Hydration',
      badges: milestones(
        'water',
        'water-outline',
        water.flatMap(({ date, liters }) =>
          liters !== null && liters > 0 ? [date] : [],
        ),
        [1, 7, 30, 100],
        (n) => (n === 1 ? 'First water log' : `${n} days logged`),
      ),
    },
  ]
}
