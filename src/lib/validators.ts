/**
 * Zod schemas — the single source of truth for exercise data shapes.
 *
 * All TypeScript types are derived from these schemas via `z.infer`.
 * Used for:
 *  - Validating Supabase responses (reads)
 *  - Validating payloads before Supabase writes
 *  - Generating the `ExerciseRow`, `ExerciseDetail`, and `Cardio` types
 */
import { z } from 'zod'

// ─── JSONB column schemas ────────────────────────────────────────────

/** Schema for a single exercise detail (item within the `exercises` JSONB array) */
export const exerciseDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  sets: z.union([z.number(), z.literal('To Failure')]),
  reps: z.number(),
  variation: z.string().nullable(),
})

/** Schema for the `cardio` JSONB column */
export const cardioSchema = z.object({
  morning: z.number(),
  evening: z.number(),
})

// ─── Database row schemas ────────────────────────────────────────────

/** Schema for a full exercises table row (Supabase response) */
export const exerciseRowSchema = z.object({
  id: z.uuid(),
  day: z.string(),
  week: z.string(),
  title: z.string(),
  videoURL: z.string().nullable(),
  cardio: cardioSchema,
  exercises: z.array(exerciseDetailSchema),
  created_at: z.string(),
  updated_at: z.string(),
})

/** Schema for inserting a new row */
export const exerciseInsertSchema = exerciseRowSchema
  .omit({ id: true, created_at: true, updated_at: true })
  .extend({
    id: z.uuid().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })

/** Schema for updating an existing row (only mutable fields) */
export const exerciseUpdateSchema = z.object({
  day: z.string().optional(),
  week: z.string().optional(),
  title: z.string().optional(),
  videoURL: z.string().nullable().optional(),
  cardio: cardioSchema.optional(),
  exercises: z.array(exerciseDetailSchema).optional(),
})

// ─── Client-side schemas (extend DB schemas with UI state) ──────────

/** Exercise detail with client-side UI state (sets is always numeric after store initialization) */
export const exerciseDetailClientSchema = exerciseDetailSchema.extend({
  sets: z.number(),
  completed: z.boolean(),
  selectedSets: z.array(z.boolean()),
  /** Weight in kg for each set (user-adjustable). Index matches set index. */
  weightPerSet: z.array(z.number()),
})

/** Full client-side exercise model */
export const exerciseClientSchema = z.object({
  id: z.string(),
  title: z.string(),
  videoURL: z.string(),
  date: z.string(),
  color: z.string(),
  completed: z.boolean(),
  cardio: cardioSchema,
  exercises: z.array(exerciseDetailClientSchema),
  localId: z.string(),
  synced: z.boolean(),
})

// ─── Inferred types ─────────────────────────────────────────────────

/** A single exercise detail from the DB */
export type ExerciseDetailRow = z.infer<typeof exerciseDetailSchema>

/** Cardio JSONB shape */
export type Cardio = z.infer<typeof cardioSchema>

/** A full exercises table row */
export type ExerciseRow = z.infer<typeof exerciseRowSchema>

/** Insert payload */
export type ExerciseInsert = z.infer<typeof exerciseInsertSchema>

/** Update payload */
export type ExerciseUpdate = z.infer<typeof exerciseUpdateSchema>

/** Client-side exercise detail (with UI state) */
export type ExerciseDetailClient = z.infer<typeof exerciseDetailClientSchema>

/** Client-side exercise model (with UI state) */
export type ExerciseClient = z.infer<typeof exerciseClientSchema>

// ─── Daily health snapshot schemas ──────────────────────────────────

/** Schema for the daily_health_snapshots table row */
export const dailyHealthSnapshotSchema = z.object({
  id: z.uuid(),
  date: z.string(), // YYYY-MM-DD
  steps: z.number().nullable(),
  calories: z.number().nullable(),
  sleepMinutes: z.number().nullable(),
  hrv: z.number().nullable(),
  restingHr: z.number().nullable(),
  heartRate: z.number().nullable(),
  waterLiters: z.number().nullable(),
  recoveryScore: z.number().int().min(0).max(100).nullable(),
  strainScore: z.number().min(0).max(21).nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

/** Inferred type for a daily health snapshot */
export type DailyHealthSnapshot = z.infer<typeof dailyHealthSnapshotSchema>

/** Schema for upserting a snapshot (omit server-generated fields) */
export const dailyHealthSnapshotUpsertSchema = dailyHealthSnapshotSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export type DailyHealthSnapshotUpsert = z.infer<
  typeof dailyHealthSnapshotUpsertSchema
>

// ─── Workout session schemas ────────────────────────────────────────

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

// ─── Parse helpers ──────────────────────────────────────────────────

/**
 * Safely parse a Supabase row into a typed ExerciseRow.
 * Returns `null` for rows that don't match the schema.
 */
export function parseExerciseRow(raw: unknown): ExerciseRow | null {
  const result = exerciseRowSchema.safeParse(raw)
  return result.success ? result.data : null
}

/**
 * Parse an array of raw Supabase rows, filtering out invalid ones.
 */
export function parseExerciseRows(rows: unknown[]): ExerciseRow[] {
  return rows
    .map(parseExerciseRow)
    .filter((row): row is ExerciseRow => row !== null)
}
