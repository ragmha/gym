/**
 * Zod schemas — workout sessions domain (DB table).
 *
 * Persists completed workout metrics. For in-progress session state, see
 * `workoutSessionAggregateSchema` in ./exercises.
 */
import { z } from 'zod'

/** Schema for a workout_sessions table row */
export const workoutSessionSchema = z.object({
  id: z.uuid(),
  exercise_day: z.string(),
  exercise_week: z.string(),
  title: z.string(),
  started_at: z.string(),
  completed_at: z.string(),
  duration_seconds: z.number().int().min(0),
  total_volume_kg: z.number().min(0),
  sets_completed: z.number().int().min(0),
  total_sets: z.number().int().min(0),
  exercises_completed: z.number().int().min(0),
  total_exercises: z.number().int().min(0),
  cardio_minutes: z.number().int().min(0),
  notes: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

/** Schema for inserting a workout session (omit server-generated fields) */
export const workoutSessionInsertSchema = workoutSessionSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

/** Inferred types */
export type WorkoutSession = z.infer<typeof workoutSessionSchema>
export type WorkoutSessionInsert = z.infer<typeof workoutSessionInsertSchema>
