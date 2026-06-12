import { supabase } from '@/lib/supabase'
import type { PriorSessionAggregate } from './types'

interface WorkoutSessionAggregateRow {
  completed_at: string | null
  total_volume_kg: number | null
}

export async function fetchPriorAggregates(
  templateTitle: string,
  limit = 5,
  completedBefore?: string,
): Promise<PriorSessionAggregate[]> {
  try {
    let query = supabase
      .from('workout_sessions')
      .select('completed_at,total_volume_kg')
      .eq('title', templateTitle)

    if (completedBefore) {
      query = query.lt('completed_at', completedBefore)
    }

    const { data, error } = await query
      .order('completed_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.warn('Failed to fetch prior workout aggregates', error)
      return []
    }

    return ((data ?? []) as WorkoutSessionAggregateRow[])
      .filter(
        (row): row is { completed_at: string; total_volume_kg: number } =>
          row.completed_at !== null && row.total_volume_kg !== null,
      )
      .map((row) => ({
        completedAt: row.completed_at,
        totalVolumeKg: row.total_volume_kg,
      }))
  } catch (error) {
    console.warn('Failed to fetch prior workout aggregates', error)
    return []
  }
}
