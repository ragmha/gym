import {
  CARDIO_MINUTES_GOAL,
  longestWorkout,
  summarizeMorningWeights,
} from '@/lib/dailyGoals'
import {
  STAIRMASTER_MINUTES_GOAL,
  type LiftingWorkout,
} from '@/lib/gymProgramme'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import type {
  DailyHealthSnapshot,
  HealthHeartRateSample,
  HealthWorkout,
} from '@/lib/healthSnapshot/types'
import type { GymDayLog } from '@/stores/GymLogStore'

type DayWorkouts = Pick<DailyHealthSnapshot, 'date' | 'workouts'>

export type GymActivity =
  | 'stairmaster'
  | 'cardio'
  | 'lifting'
  | 'weight'
  | 'food'

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
  day: LiftingWorkout | null,
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

/** Calories burned in the day's workouts, added back to the food budget; null when unknown. */
export function workoutKcal(snapshot: DayWorkouts | null): number | null {
  const workouts = snapshot?.workouts
  if (
    !workouts ||
    (workouts.length > 0 &&
      workouts.every((workout) => workout.calories == null))
  ) {
    return null
  }
  return Math.round(
    workouts.reduce((sum, workout) => sum + (workout.calories ?? 0), 0),
  )
}

/** Budget = goal + workout calories, unknown while they are. Never "done": eating more is not a goal to complete. */
export function foodSummary(
  snapshot: DailyHealthSnapshot | null,
  goalKcal: number,
): ActivitySummary {
  if (snapshot?.dietaryCalories == null) {
    return {
      progress: null,
      done: false,
      caption: '--',
      headline: 'No meals logged',
    }
  }
  const eaten = Math.round(snapshot.dietaryCalories)
  const exercise = workoutKcal(snapshot)
  if (exercise === null) {
    return {
      progress: null,
      done: false,
      caption: `${eaten} kcal`,
      headline: 'Workout calories unavailable',
    }
  }
  const budget = goalKcal + exercise
  const left = budget - eaten
  return {
    progress: Math.min(eaten / budget, 1),
    done: false,
    caption: `${eaten}/${budget} kcal`,
    headline: left >= 0 ? `${left} kcal left` : `${-left} kcal over`,
  }
}

export type MealSlot = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'

// About 1.6 g/kg a day captures most of the strength gain from protein (Morton et al., 2018).
const PROTEIN_G_PER_KG = 1.6
// Mid-range of the 20-35% of energy that dietary guidelines advise from fat.
const FAT_SHARE = 0.3

/** Daily gram targets: protein for lifting, fat from the goal, and the rest, workout calories included, as carbs to refuel. */
export function macroTargets(
  goalKcal: number,
  exerciseKcal: number | null,
  bodyMassKg: number | null,
): { protein: number | null; carbs: number | null; fat: number } {
  const protein =
    bodyMassKg === null ? null : Math.round(bodyMassKg * PROTEIN_G_PER_KG)
  const fat = Math.round((goalKcal * FAT_SHARE) / 9)
  const carbs =
    protein === null || exerciseKcal === null
      ? null
      : Math.max(
          0,
          Math.round((goalKcal + exerciseKcal - protein * 4 - fat * 9) / 4),
        )
  return { protein, carbs, fat }
}

// First match wins, so dishes come before the ingredients they contain.
const FOOD_EMOJI: [RegExp, string][] = [
  [/\bsalad/, '🥗'],
  [/\b(sandwich|wrap|sub)\b/, '🥪'],
  [/burger/, '🍔'],
  [/\bpizza/, '🍕'],
  [/\b(soup|stew|chili|curry)/, '🍲'],
  [/\b(pasta|spaghetti|noodle|ramen)/, '🍝'],
  [/\b(sushi|poke)\b/, '🍣'],
  [/\b(taco|burrito)/, '🌮'],
  [/(smoothie|shake)/, '🥤'],
  [/\b(coffee|latte|espresso|cappuccino)/, '☕'],
  [/\btea\b/, '🍵'],
  [/\bjuice/, '🧃'],
  [/\b(salmon|fish|tuna|cod|shrimp|prawn)/, '🐟'],
  [/\b(chicken|turkey)/, '🍗'],
  [/\b(steak|beef|pork|lamb)/, '🥩'],
  [/\b(eggs?|omelet\w*)\b/, '🍳'],
  [/\b(oat|porridge|cereal|granola|yog)/, '🥣'],
  [/\brice\b/, '🍚'],
  [/\b(bread|toast|bagel)/, '🍞'],
  [/\bmilk/, '🥛'],
  [/\bbanana/, '🍌'],
  [/\bapple/, '🍎'],
  [/berr|fruit/, '🍓'],
  [/\b(cookie|biscuit)/, '🍪'],
  [/(pancake|waffle)/, '🥞'],
  [/(cake|muffin|pastry|croissant|donut)/, '🍰'],
  [/\b(chocolate|bars?\b)/, '🍫'],
  [/\b(fries|chips)\b/, '🍟'],
]

/** A picture for a meal name; names come from the estimate or other apps' HKFoodType. */
export function foodEmoji(name: string | null): string {
  const lower = name?.toLowerCase() ?? ''
  return FOOD_EMOJI.find(([pattern]) => pattern.test(lower))?.[1] ?? '🍽️'
}

/** Meal group from the local time the food was eaten. */
export function mealSlot(eatenAt: Date): MealSlot {
  const hour = eatenAt.getHours()
  if (hour >= 4 && hour < 11) return 'Breakfast'
  if (hour >= 11 && hour < 15) return 'Lunch'
  if (hour >= 17 && hour < 22) return 'Dinner'
  return 'Snacks'
}
