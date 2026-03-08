import { supabase } from '@/lib/supabase'

import type { Database } from '@/lib/database.types'

export type ExerciseRow = Database['public']['Tables']['exercises']['Row']

/**
 * Fetch all exercises from Supabase, ordered by day.
 */
export const fetchExercises = async (): Promise<ExerciseRow[]> => {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('day')

  if (error) {
    console.error('Supabase error:', error.message)
    throw new Error(`Failed to fetch exercises: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error('No exercises found')
  }

  return data
}

/** @deprecated Use `fetchExercises` instead. */
export const fetchExercies = fetchExercises
