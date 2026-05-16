import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────

export interface WorkoutHistoryEntry {
  /** ISO timestamp from the `started_at` column */
  startedAt: string
  durationSeconds: number
}

export interface WorkoutHistoryDeps {
  /**
   * Optional injected port for testing. Defaults to the real Supabase client.
   * Must return rows already in WorkoutHistoryEntry shape.
   */
  fetchRecent?: (sinceISO: string) => Promise<{
    data: WorkoutHistoryEntry[] | null
    error: { message: string } | null
  }>
}

// ─── Default adapter (production) ────────────────────────────────────

async function defaultFetchRecent(sinceISO: string): Promise<{
  data: WorkoutHistoryEntry[] | null
  error: { message: string } | null
}> {
  const result = await supabase
    .from('workout_sessions')
    .select('started_at, duration_seconds')
    .gte('completed_at', sinceISO)
    .order('started_at', { ascending: false })

  const data = result.data
    ? (result.data as { started_at: string; duration_seconds: number }[]).map(
        (row) => ({
          startedAt: row.started_at,
          durationSeconds: row.duration_seconds,
        }),
      )
    : null

  return {
    data,
    error: result.error ? { message: result.error.message } : null,
  }
}

// ─── Core function ────────────────────────────────────────────────────

/**
 * Fetch completed Workout Sessions whose `completed_at` is ≥ the given
 * cutoff, ordered by `started_at` desc. Returns an empty array on no rows.
 * Throws on error so callers can decide whether the whole dashboard should
 * surface a load failure.
 *
 * The repo owns:
 * - the table name (`workout_sessions`)
 * - the selected columns (`started_at`, `duration_seconds`)
 * - the filter column (`completed_at`)
 * - the ordering
 * - the mapping from snake_case row → camelCase entry
 * - the "since cutoff" date math (start of day, daysBack)
 */
export async function fetchRecentWorkouts(
  daysBack: number,
  deps?: WorkoutHistoryDeps,
): Promise<WorkoutHistoryEntry[]> {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - daysBack)
  since.setUTCHours(0, 0, 0, 0)

  const fetchFn = deps?.fetchRecent ?? defaultFetchRecent
  const { data, error } = await fetchFn(since.toISOString())

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).filter(
    (entry) => entry.durationSeconds > 0 && typeof entry.startedAt === 'string',
  )
}
