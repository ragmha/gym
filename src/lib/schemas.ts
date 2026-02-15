import { z } from 'zod'

// ─── DB row schemas (match Supabase table structure) ────────────────

export const WorkoutDayRowSchema = z.object({
  id: z.string().uuid(),
  day: z.number().int(),
  week: z.number().int(),
  title: z.string(),
  video_url: z.string().nullable(),
  cardio_morning: z.number().int(),
  cardio_evening: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const ExerciseDefinitionRowSchema = z.object({
  id: z.string(),
  workout_day_id: z.string(),
  sort_order: z.number().int(),
  title: z.string(),
  sets: z.number().int().min(1),
  is_amrap: z.boolean(),
  reps: z.number().int().min(0),
  variation: z.string().nullable(),
})

export const UserProgressRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  exercise_id: z.string().uuid(),
  completed: z.boolean(),
  sets_completed: z.array(z.boolean()),
  completed_at: z.string().nullable(),
})

// ─── Joined query schema ───────────────────────────────────────────

export const WorkoutDayWithExercisesSchema = WorkoutDayRowSchema.extend({
  exercise_definitions: z.array(ExerciseDefinitionRowSchema),
})

// ─── DB row types ──────────────────────────────────────────────────

export type WorkoutDayRow = z.infer<typeof WorkoutDayRowSchema>
export type ExerciseDefinitionRow = z.infer<typeof ExerciseDefinitionRowSchema>
export type UserProgressRow = z.infer<typeof UserProgressRowSchema>
export type WorkoutDayWithExercises = z.infer<
  typeof WorkoutDayWithExercisesSchema
>

// ─── Client-enriched types ─────────────────────────────────────────

export interface ClientExerciseDetail {
  id: string
  title: string
  sets: number
  is_amrap: boolean
  reps: number
  variation: string | null
  completed: boolean
  selectedSets: boolean[]
}

export interface ClientWorkoutDay {
  id: string
  day: number
  week: number
  title: string
  videoURL: string | null
  cardio: { morning: number; evening: number }
  date: string
  color: string
  completed: boolean
  exercises: ClientExerciseDetail[]
  localId: string
  synced: boolean
  deleted?: boolean
}

// ─── Transform dependencies (injectable for testing) ───────────────

export interface TransformDeps {
  generateId: () => string
  generateColor: () => string
}

// ─── Transform: DB row → Client model ─────────────────────────────

export function toClientWorkoutDay(
  row: WorkoutDayWithExercises,
  deps: TransformDeps = {
    generateId: () => Math.random().toString(36).slice(2),
    generateColor: () => 'hsl(0, 50%, 87.5%)',
  },
): ClientWorkoutDay {
  const exercises: ClientExerciseDetail[] = row.exercise_definitions
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((def) => ({
      id: def.id,
      title: def.title,
      sets: def.sets,
      is_amrap: def.is_amrap,
      reps: def.reps,
      variation: def.variation,
      completed: false,
      selectedSets: Array.from({ length: def.sets }, () => false),
    }))

  return {
    id: row.id,
    day: row.day,
    week: row.week,
    title: row.title,
    videoURL: row.video_url,
    cardio: { morning: row.cardio_morning, evening: row.cardio_evening },
    date: `Week ${row.week} · Day ${row.day}`,
    color: deps.generateColor(),
    completed: false,
    exercises,
    localId: deps.generateId(),
    synced: true,
  }
}
