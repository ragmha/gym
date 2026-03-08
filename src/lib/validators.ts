/**
 * Zod schemas for validating data before writing to Supabase.
 *
 * These schemas mirror the JSONB column constraints in the exercises table
 * and protect against malformed payloads reaching the database.
 */
import { z } from 'zod'

/** Schema for a single exercise detail (item within the `exercises` JSONB array) */
export const exerciseDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  sets: z.union([z.number(), z.literal('To Failure')]),
  reps: z.number(),
  variation: z.string().nullable(),
  completed: z.boolean().optional(),
  selectedSets: z.array(z.boolean()).optional(),
})

/** Schema for the `cardio` JSONB column */
export const cardioSchema = z.object({
  morning: z.number(),
  evening: z.number(),
})

/** Schema for a full exercise row update payload */
export const exerciseUpdateSchema = z.object({
  completed: z.boolean().optional(),
  exercises: z.array(exerciseDetailSchema).optional(),
  cardio: cardioSchema.optional(),
})

export type ExerciseDetailInput = z.infer<typeof exerciseDetailSchema>
export type CardioInput = z.infer<typeof cardioSchema>
export type ExerciseUpdateInput = z.infer<typeof exerciseUpdateSchema>
