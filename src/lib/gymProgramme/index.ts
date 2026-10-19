import { z } from 'zod'

import { localDateKey } from '@/lib/healthSnapshot/dateKey'

import rawProgramme from './programme.json'

export const STAIRMASTER_MINUTES_GOAL = 30

const exerciseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sets: z.union([z.number().int().positive(), z.literal('To Failure')]),
  reps: z.number().int().positive(),
  variation: z.string().nullable(),
})

const daySchema = z.object({
  day: z.string().regex(/^\d+$/),
  week: z.string().regex(/^\d+$/),
  title: z.string().min(1),
  videoURL: z.url(),
  cardio: z.object({
    morning: z.number().nonnegative(),
    evening: z.number().nonnegative(),
  }),
  exercises: z.array(exerciseSchema),
})

export type ProgrammeExercise = z.infer<typeof exerciseSchema>
export type ProgrammeDay = z.infer<typeof daySchema>

export const PROGRAMME: readonly ProgrammeDay[] = z
  .array(daySchema)
  .min(1)
  .parse(rawProgramme)

const DAY_MS = 86_400_000

function noon(key: string): number {
  return new Date(`${key}T12:00:00`).getTime()
}

/** Programme day for a local date, or why there is none. */
export function programmeDayFor(
  startKey: string,
  dateKey: string,
): { day: ProgrammeDay } | { reason: 'before-start' | 'finished' } {
  const index = Math.round((noon(dateKey) - noon(startKey)) / DAY_MS)
  if (index < 0) return { reason: 'before-start' }
  const day = PROGRAMME[index]
  return day ? { day } : { reason: 'finished' }
}

export function findProgrammeDay(day: string): ProgrammeDay | null {
  return PROGRAMME.find((entry) => entry.day === day) ?? null
}

/** Saved workouts take precedence over the current schedule. */
export function programmeWorkoutDates(
  startKey: string | null,
  logs: Record<string, { day: string }>,
): Map<string, string> {
  const dates = new Map<string, string>()
  if (startKey) {
    PROGRAMME.forEach((day, index) => {
      const date = new Date(noon(startKey))
      date.setDate(date.getDate() + index)
      const key = localDateKey(date)
      // A restart must not open a different workout pinned to this date.
      if (!logs[key] || logs[key].day === day.day) dates.set(day.day, key)
    })
  }
  for (const [key, log] of Object.entries(logs).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (findProgrammeDay(log.day)) dates.set(log.day, key)
  }
  return dates
}

type SetEntry = { reps: number; kilograms: number | null }

export interface ExerciseSession {
  dateKey: string
  sets: SetEntry[]
  oneRepMax: number | null
}

/** Epley estimate; body-weight sets have no external load to estimate from. */
export function estimateOneRepMax({
  reps,
  kilograms,
}: SetEntry): number | null {
  if (kilograms === null) return null
  return reps === 1 ? kilograms : kilograms * (1 + reps / 30)
}

/** Logged sessions for an exercise title up to and including `throughKey`. */
export function exerciseHistory(
  logs: Record<string, { day: string; sets: Record<string, SetEntry[]> }>,
  title: string,
  throughKey: string,
): ExerciseSession[] {
  return Object.entries(logs)
    .filter(([dateKey]) => dateKey <= throughKey)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([dateKey, log]) => {
      const day = findProgrammeDay(log.day)
      const sets = (day?.exercises ?? [])
        .filter((exercise) => exercise.title === title)
        .flatMap((exercise) => log.sets[exercise.id] ?? [])
      if (sets.length === 0) return []
      const estimates = sets
        .map(estimateOneRepMax)
        .filter((value): value is number => value !== null)
      const oneRepMax = estimates.length
        ? Math.round(Math.max(...estimates) * 10) / 10
        : null
      return [{ dateKey, sets, oneRepMax }]
    })
}
