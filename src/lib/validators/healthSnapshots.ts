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
