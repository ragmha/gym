/**
 * Merges the two sources of truth for a hybrid athlete's training history:
 *
 *   - HealthKit workouts (running, cycling, rowing, HIIT, …) over the past 28
 *     days via `healthSnapshot.getRangeWorkouts(28)`.
 *   - Completed gym sessions from the Supabase `workout_sessions` table over
 *     the same window.
 *
 * Returns the data the home dashboard needs as a single bundle:
 *   - `weekly`     — minutes / sessions / vs-last-week delta per pillar
 *   - `dailyBars`  — 14-day stacked-bar dataset for the LoadChart component
 *   - `targets`    — auto-calibrated weekly targets (fallback / partial / calibrated)
 *   - `acwr`       — Acute:Chronic Workload Ratio + status
 *
 * Important guardrails (see plan.md "Critical decisions"):
 *   - HealthKit `strength` activity types are EXCLUDED to avoid double-counting
 *     with the Supabase strength rows. Strength comes from the gym log only.
 *   - HealthKit `multisport` (swimBikeRun / transition) is excluded by
 *     `activityToPillar` returning null — see lib/training/pillars.ts.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import type { HealthWorkout } from '@/lib/healthSnapshot/types'
import { supabase } from '@/lib/supabase'
import {
  type ACWR,
  type CalibratedTargets,
  type DailyBar,
  type TrainingSession,
  type WeeklyVolume,
  aggregateWeekly,
  buildDailyBars,
  calibrateTargets,
  computeACWR,
} from '@/lib/training/load'
import { activityToPillar } from '@/lib/training/pillars'

const WINDOW_DAYS = 28
const DAILY_BARS_DAYS = 14

interface SupabaseWorkoutRow {
  started_at: string
  duration_seconds: number
}

export type WeeklyTrainingStatus = 'loading' | 'ready' | 'error'

export interface WeeklyTrainingResult {
  status: WeeklyTrainingStatus
  error: string | null
  weekly: WeeklyVolume[]
  dailyBars: DailyBar[]
  targets: CalibratedTargets
  acwr: ACWR
  refresh: () => Promise<void>
}

/**
 * Map an HK workout into a TrainingSession, or null if it should be ignored
 * (strength activity types, multisport, walking, recovery, unknown).
 */
function hkWorkoutToSession(workout: HealthWorkout): TrainingSession | null {
  // Strength HK workouts are excluded to keep the gym log as the single
  // source of truth for strength volume.
  if (workout.activityType === 'strength') return null

  const pillar = activityToPillar(workout.activityType)
  if (pillar === null) return null

  return {
    source: 'healthkit',
    pillar,
    startISO: workout.startISO,
    durationMinutes: workout.durationMinutes,
    distanceMeters: workout.distanceMeters,
  }
}

function supabaseRowToSession(row: SupabaseWorkoutRow): TrainingSession {
  return {
    source: 'gym-log',
    pillar: 'strength',
    startISO: row.started_at,
    durationMinutes: Math.round(row.duration_seconds / 60),
  }
}

async function fetchHealthKitSessions(): Promise<TrainingSession[]> {
  const workouts = await healthSnapshot.getRangeWorkouts(WINDOW_DAYS)
  return workouts
    .map(hkWorkoutToSession)
    .filter((session): session is TrainingSession => session !== null)
}

async function fetchGymStrengthSessions(): Promise<TrainingSession[]> {
  const since = new Date()
  since.setDate(since.getDate() - WINDOW_DAYS)
  since.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('workout_sessions')
    .select('started_at, duration_seconds')
    .gte('completed_at', since.toISOString())
    .order('started_at', { ascending: false })

  if (error) throw error
  const rows = (data ?? []) as SupabaseWorkoutRow[]
  return rows
    .filter((r) => r.duration_seconds > 0 && typeof r.started_at === 'string')
    .map(supabaseRowToSession)
}

async function loadSessions(): Promise<TrainingSession[]> {
  const [hkResult, gymResult] = await Promise.allSettled([
    fetchHealthKitSessions(),
    fetchGymStrengthSessions(),
  ])

  const sessions: TrainingSession[] = []
  if (hkResult.status === 'fulfilled') {
    sessions.push(...hkResult.value)
  } else {
    console.warn('[useWeeklyTraining] HealthKit fetch failed', hkResult.reason)
  }
  if (gymResult.status === 'fulfilled') {
    sessions.push(...gymResult.value)
  } else {
    console.warn('[useWeeklyTraining] Supabase fetch failed', gymResult.reason)
  }

  // If both failed, surface as an error to the caller.
  if (hkResult.status === 'rejected' && gymResult.status === 'rejected') {
    throw new Error('Unable to load training data from any source')
  }

  return sessions
}

export function useWeeklyTraining(): WeeklyTrainingResult {
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [status, setStatus] = useState<WeeklyTrainingStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const result = await loadSessions()
      if (!isMounted.current) return
      setSessions(result)
      setStatus('ready')
    } catch (err) {
      if (!isMounted.current) return
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    void load()
    return () => {
      isMounted.current = false
    }
  }, [load])

  // Derived data — kept stable across renders unless sessions change.
  const now = useMemo(() => new Date(), [sessions])
  const weekly = useMemo(() => aggregateWeekly(sessions, now), [sessions, now])
  const dailyBars = useMemo(
    () => buildDailyBars(sessions, now, DAILY_BARS_DAYS),
    [sessions, now],
  )
  const targets = useMemo(
    () => calibrateTargets(sessions, now),
    [sessions, now],
  )
  const acwr = useMemo(() => computeACWR(sessions, now), [sessions, now])

  return {
    status,
    error,
    weekly,
    dailyBars,
    targets,
    acwr,
    refresh: load,
  }
}
