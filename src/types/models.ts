/**
 * Client-side model types.
 *
 * WorkoutTemplate is the read-only plan from Supabase. WorkoutSession is the
 * live execution aggregate keyed by route id.
 */
export type {
  Cardio,
  DailyHealthSnapshot,
  DailyHealthSnapshotUpsert,
  ExerciseClient,
  ExerciseDetailClient,
  WorkoutSession as WorkoutSessionRow,
  WorkoutSessionInsert,
} from '@/lib/validators'

export interface WorkoutTemplate {
  id: string
  day: string
  week: string
  title: string
  videoURL: string | null
  cardio: { morning: number; evening: number }
  exercises: ExerciseDetailTemplate[]
  color: string
}

export interface ExerciseDetailTemplate {
  id: string
  title: string
  sets: number
  reps: number
  variation: string | null
}

export interface WorkoutSession {
  id: string
  templateId: string
  startedAt: string
  completedAt: string | null
  exerciseProgress: Record<string, ExerciseProgress>
  cardio: { morning: number; evening: number }
  status: 'in-progress' | 'complete'
}

export interface ExerciseProgress {
  detailId: string
  selectedSets: boolean[]
  weightPerSet: number[]
  setsOverride?: number
  repsOverride?: number
  variationOverride?: string | null
}

/** Backwards-compatible aliases during migration. */
export type Exercise = WorkoutTemplate
export type ExerciseDetail = ExerciseDetailTemplate
