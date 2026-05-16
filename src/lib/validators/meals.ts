/**
 * Zod schemas — meals / nutrition domain.
 *
 * Covers the `meals` table plus the AI parser output shape used before a
 * meal is confirmed and inserted.
 */
import { z } from 'zod'

export const mealSourceSchema = z.enum(['photo', 'barcode', 'manual'])

/** Schema for a meals table row (Supabase response) */
export const mealRowSchema = z.object({
  id: z.uuid(),
  date: z.string(), // YYYY-MM-DD
  consumed_at: z.string(),
  name: z.string().min(1).max(200),
  calories_kcal: z.number().min(0).max(10000),
  protein_g: z.number().min(0).max(1000),
  carb_g: z.number().min(0).max(1000),
  fat_g: z.number().min(0).max(1000),
  source: mealSourceSchema,
  photo_url: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  ai_confidence: z.number().min(0).max(1).nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

/** Schema for inserting a meal */
export const mealInsertSchema = mealRowSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

/** Schema for updating a meal */
export const mealUpdateSchema = mealInsertSchema.partial()

/** AI parser output before user confirmation */
export const parsedMealSchema = z.object({
  name: z.string().min(1),
  calories_kcal: z.number().min(0),
  protein_g: z.number().min(0),
  carb_g: z.number().min(0),
  fat_g: z.number().min(0),
  ai_confidence: z.number().min(0).max(1),
})

/** Inferred types */
export type MealSource = z.infer<typeof mealSourceSchema>
export type MealRow = z.infer<typeof mealRowSchema>
export type MealInsert = z.infer<typeof mealInsertSchema>
export type MealUpdate = z.infer<typeof mealUpdateSchema>
export type ParsedMeal = z.infer<typeof parsedMealSchema>

export function parseMealRow(raw: unknown): MealRow | null {
  const result = mealRowSchema.safeParse(raw)
  return result.success ? result.data : null
}

export function parseMealRows(rows: unknown[]): MealRow[] {
  return rows.map(parseMealRow).filter((row): row is MealRow => row !== null)
}
