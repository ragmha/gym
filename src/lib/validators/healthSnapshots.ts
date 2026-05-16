/**
 * Zod schemas — daily health snapshots domain.
 *
 * Backs the `daily_health_snapshots` table used for 30/90-day trends.
 */
import { z } from 'zod'

/** Schema for the daily_health_snapshots table row */
export const dailyHealthSnapshotSchema = z.object({
  id: z.uuid(),
  date: z.string(), // YYYY-MM-DD
  steps: z.number().nullable(),
  calories: z.number().nullable(),
  sleep_minutes: z.number().nullable(),
  hrv: z.number().nullable(),
  resting_hr: z.number().nullable(),
  heart_rate: z.number().nullable(),
  water_liters: z.number().nullable(),
  recovery_score: z.number().int().min(0).max(100).nullable(),
  strain_score: z.number().min(0).max(21).nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

/** Inferred type for a daily health snapshot */
export type DailyHealthSnapshot = z.infer<typeof dailyHealthSnapshotSchema>

/** Schema for upserting a snapshot (omit server-generated fields) */
export const dailyHealthSnapshotUpsertSchema = dailyHealthSnapshotSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export type DailyHealthSnapshotUpsert = z.infer<
  typeof dailyHealthSnapshotUpsertSchema
>
