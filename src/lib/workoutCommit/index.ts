import type { z } from 'zod'

import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import type { SaveCardioWorkoutParams } from '@/lib/healthSnapshot/types'
import { supabase } from '@/lib/supabase'
import { workoutSessionInsertSchema } from '@/lib/validators'
import type { WorkoutSessionInsert } from '@/lib/validators'
import type { WorkoutSession, WorkoutTemplate } from '@/types/models'

// ─── Pure aggregators (moved here from WorkoutSessionStore) ──────────

export function completedSetCount(session: WorkoutSession): number {
  return Object.values(session.exerciseProgress).reduce(
    (count, progress) => count + progress.selectedSets.filter(Boolean).length,
    0,
  )
}

export function totalSetCount(session: WorkoutSession): number {
  return Object.values(session.exerciseProgress).reduce(
    (count, progress) => count + progress.selectedSets.length,
    0,
  )
}

export function totalVolumeKg(
  session: WorkoutSession,
  template: WorkoutTemplate,
): number {
  let volume = 0
  for (const detail of template.exercises) {
    const progress = session.exerciseProgress[detail.id]
    if (!progress) continue
    const reps = progress.repsOverride ?? detail.reps
    for (let index = 0; index < progress.selectedSets.length; index++) {
      if (progress.selectedSets[index]) {
        volume += (progress.weightPerSet[index] ?? 0) * reps
      }
    }
  }
  return Math.round(volume * 100) / 100
}

export function cardioMinutes(session: WorkoutSession): number {
  return (
    Math.max(0, session.cardio.morning) + Math.max(0, session.cardio.evening)
  )
}

export function completedExerciseCount(
  session: WorkoutSession,
  template: WorkoutTemplate,
): number {
  return template.exercises.filter((detail) => {
    const progress = session.exerciseProgress[detail.id]
    return (
      progress?.selectedSets.length > 0 && progress.selectedSets.every(Boolean)
    )
  }).length
}

export function isComplete(
  session: WorkoutSession,
  _template: WorkoutTemplate,
): boolean {
  return (
    totalSetCount(session) > 0 &&
    completedSetCount(session) === totalSetCount(session)
  )
}

// ─── Commit types ────────────────────────────────────────────────────

export type CommitOutcome =
  | { kind: 'committed'; payload: WorkoutSessionInsert }
  | { kind: 'invalid'; issues: z.ZodIssue[] }
  | { kind: 'persistence-failed'; error: string }

export interface CommitDeps {
  /** Injected insert adapter; defaults to real Supabase in production. */
  insertWorkoutSession?: (
    payload: WorkoutSessionInsert,
  ) => Promise<{ error: { message: string } | null }>
  /** Injected HealthKit adapter; defaults to real healthSnapshot in production. */
  saveCardioWorkout?: (params: SaveCardioWorkoutParams) => Promise<boolean>
  /** Injected clock; defaults to `() => new Date()` in production. */
  now?: () => Date
}

// ─── Production default adapters ────────────────────────────────────

async function defaultInsert(
  payload: WorkoutSessionInsert,
): Promise<{ error: { message: string } | null }> {
  const result = await supabase.from('workout_sessions').insert(payload)
  return { error: result.error ? { message: result.error.message } : null }
}

async function defaultSaveCardio(
  params: SaveCardioWorkoutParams,
): Promise<boolean> {
  return healthSnapshot.saveCardioWorkout(params)
}

// ─── Core commit function ────────────────────────────────────────────

/**
 * Commit a completed workout session: build payload, validate, persist to
 * Supabase, then best-effort mirror cardio minutes to HealthKit.
 *
 * - HealthKit failure is best-effort and does NOT fail the commit.
 * - Supabase failure returns 'persistence-failed' (caller leaves session
 *   in-progress so the next attempt can retry).
 * - Validation failure returns 'invalid' (caller logs and aborts).
 */
export async function commitWorkout(
  session: WorkoutSession,
  template: WorkoutTemplate,
  deps?: CommitDeps,
): Promise<CommitOutcome> {
  const now = deps?.now ?? (() => new Date())
  const insertFn = deps?.insertWorkoutSession ?? defaultInsert
  const saveCardioFn = deps?.saveCardioWorkout ?? defaultSaveCardio

  const completedAt = now().toISOString()
  const durationSeconds = Math.max(
    0,
    Math.round(
      (new Date(completedAt).getTime() -
        new Date(session.startedAt).getTime()) /
        1000,
    ),
  )
  const minutes = cardioMinutes(session)

  const payload: WorkoutSessionInsert = {
    exercise_day: template.day,
    exercise_week: template.week,
    title: template.title,
    started_at: session.startedAt,
    completed_at: completedAt,
    duration_seconds: durationSeconds,
    total_volume_kg: totalVolumeKg(session, template),
    sets_completed: completedSetCount(session),
    total_sets: totalSetCount(session),
    exercises_completed: completedExerciseCount(session, template),
    total_exercises: template.exercises.length,
    cardio_minutes: minutes,
  }

  const parsed = workoutSessionInsertSchema.safeParse(payload)
  if (!parsed.success) {
    return { kind: 'invalid', issues: parsed.error.issues }
  }

  try {
    const result = await insertFn(parsed.data)
    if (result.error) {
      return { kind: 'persistence-failed', error: result.error.message }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { kind: 'persistence-failed', error: message }
  }

  if (minutes > 0) {
    const endDate = new Date(completedAt)
    const startDate = new Date(endDate.getTime() - minutes * 60_000)
    try {
      await saveCardioFn({ durationMinutes: minutes, startDate, endDate })
    } catch {
      // best-effort: HealthKit failure does not fail the commit
    }
  }

  return { kind: 'committed', payload: parsed.data }
}
