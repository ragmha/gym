import { supabase } from '@/lib/supabase'
import { parseExerciseRows, type ExerciseRow } from '@/lib/validators'

/**
 * Fetch all exercises from Supabase, ordered by day.
 * Rows are validated through Zod — malformed rows are silently dropped.
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

  return parseExerciseRows(data)
}

/** @deprecated Use `fetchExercises` instead. */
export const fetchExercies = fetchExercises
