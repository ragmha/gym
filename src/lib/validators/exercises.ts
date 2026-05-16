/**
 * Zod schemas — exercises domain.
 *
 * Covers:
 *  - DB row / insert / update shapes for the `exercises` table
 *  - Client-side exercise + workout-template shapes (with UI state)
 *  - In-progress workout session aggregate (used by WorkoutSessionStore)
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

export const exerciseDetailTemplateSchema = exerciseDetailSchema.extend({
  sets: z.number(),
})

export const workoutTemplateSchema = z.object({
  id: z.string(),
  day: z.string(),
  week: z.string(),
  title: z.string(),
  videoURL: z.string().nullable(),
  cardio: cardioSchema,
  exercises: z.array(exerciseDetailTemplateSchema),
  color: z.string(),
})

export const exerciseProgressSchema = z.object({
  detailId: z.string(),
  selectedSets: z.array(z.boolean()),
  weightPerSet: z.array(z.number()),
  setsOverride: z.number().optional(),
  repsOverride: z.number().optional(),
  variationOverride: z.string().nullable().optional(),
})

export const cardioCompletedSchema = z.object({
  morning: z.boolean(),
  evening: z.boolean(),
})

export const workoutSessionAggregateSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  exerciseProgress: z.record(z.string(), exerciseProgressSchema),
  cardio: cardioSchema,
  cardioCompleted: cardioCompletedSchema,
  status: z.enum(['in-progress', 'complete']),
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

export type ExerciseDetailTemplateSchema = z.infer<
  typeof exerciseDetailTemplateSchema
>
export type WorkoutTemplateSchema = z.infer<typeof workoutTemplateSchema>
export type ExerciseProgressSchema = z.infer<typeof exerciseProgressSchema>
export type WorkoutSessionAggregateSchema = z.infer<
  typeof workoutSessionAggregateSchema
>

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
