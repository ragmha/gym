import { Database } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

type Exercise = Database['public']['Tables']['exercises']['Row']

export const fetchExercies = async (): Promise<Exercise[]> => {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('day')

    if (error) {
      console.error('Supabase error:', error.message)
      throw new Error('Failed to fetch exercises')
    }

    if (!data || data.length === 0) {
      throw new Error('No exercises found')
    }

    return data
  } catch (err) {
    console.error('Error fetching exercises:', err)
    throw err // Re-throw to handle in the store
  }
}
