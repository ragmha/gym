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
  id: z.string().uuid(),
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
    id: z.string().uuid().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })

/** Schema for updating an existing row */
export const exerciseUpdateSchema = exerciseRowSchema.partial()

// ─── Client-side schemas (extend DB schemas with UI state) ──────────

/** Exercise detail with client-side UI state */
export const exerciseDetailClientSchema = exerciseDetailSchema.extend({
  completed: z.boolean(),
  selectedSets: z.array(z.boolean()),
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
  deleted: z.boolean().optional(),
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
