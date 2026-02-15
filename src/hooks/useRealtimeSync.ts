import { supabase } from '@/lib/supabase'
import { useExerciseStore } from '@/stores/ExerciseStore'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useEffect } from 'react'

type TablePayload = RealtimePostgresChangesPayload<{
  [key: string]: unknown
  id: string
}>

export const useRealtimeSync = () => {
  const initialize = useExerciseStore((state) => state.initialize)

  useEffect(() => {
    const subscription = supabase
      .channel('workout_days_and_exercises')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workout_days' },
        async (_payload: TablePayload) => {
          try {
            await initialize(3, true)
          } catch (error) {
            console.error('Error processing realtime update:', error)
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exercise_definitions' },
        async (_payload: TablePayload) => {
          try {
            await initialize(3, true)
          } catch (error) {
            console.error('Error processing realtime update:', error)
          }
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [initialize])

  return null
}
