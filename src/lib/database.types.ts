/**
 * Supabase database types — derived from Zod schemas in `@/lib/validators`.
 *
 * The Zod schemas are the single source of truth. This file re-exports
 * the inferred types in the shape Supabase's `createClient<Database>` expects.
 *
 * If you regenerate with `bun run generate-types`, merge the output
 * with the Zod-derived types below.
 */
import type {
  Cardio,
  ExerciseDetailRow,
  ExerciseInsert,
  ExerciseRow,
  ExerciseUpdate,
  WorkoutSession,
  WorkoutSessionInsert,
} from './validators'

export type {
  ExerciseInsert,
  ExerciseRow,
  ExerciseUpdate,
  WorkoutSession,
  WorkoutSessionInsert,
}

export interface Database {
  public: {
    Tables: {
      exercises: {
        Row: ExerciseRow
        Insert: ExerciseInsert
        Update: ExerciseUpdate
        Relationships: []
      }
      weight_entries: {
        Row: {
          id: string
          date: string
          weight_kg: number
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date?: string
          weight_kg: number
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          weight_kg?: number
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: WorkoutSession
        Insert: WorkoutSessionInsert
        Update: Partial<WorkoutSessionInsert>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type { Cardio, ExerciseDetailRow }
