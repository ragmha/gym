/**
 * Client-side model types — derived from Zod schemas in `@/lib/validators`.
 *
 * These re-exports keep existing imports working while the Zod schemas
 * in validators.ts remain the single source of truth.
 */
export type {
  Cardio,
  ExerciseClient as Exercise,
  ExerciseDetailClient as ExerciseDetail,
} from '@/lib/validators'
