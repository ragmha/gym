/**
 * Auto-generated Supabase database types.
 *
 * Regenerate with:
 *   bun run generate-types
 *
 * Manual edits will be overwritten on next generation.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      exercises: {
        Row: {
          id: string
          day: string
          week: string
          title: string
          videoURL: string | null
          cardio: Json
          exercises: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          day: string
          week: string
          title: string
          videoURL?: string | null
          cardio: Json
          exercises: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          day?: string
          week?: string
          title?: string
          videoURL?: string | null
          cardio?: Json
          exercises?: Json
          created_at?: string
          updated_at?: string
        }
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
