import { supabase } from '@/lib/supabase'
import { useExerciseStore } from '@/stores/ExerciseStore'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useEffect, useRef } from 'react'

type TablePayload = RealtimePostgresChangesPayload<{
  [key: string]: unknown
  id: string
}>

export const useRealtimeSync = () => {
  const initialize = useExerciseStore((state) => state.initialize)
  const pendingRefresh = useRef(false)
  const refreshTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleChange = () => {
      // Debounce refetches to avoid multiple rapid re-initializations
      if (pendingRefresh.current) return
      
      pendingRefresh.current = true
      
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current)
      }
      
      refreshTimer.current = setTimeout(async () => {
        try {
          await initialize(3, true)
        } catch (error) {
          console.error('Error processing realtime update:', error)
        } finally {
          pendingRefresh.current = false
        }
      }, 1000) // Debounce for 1 second
    }

    const subscription = supabase
      .channel('workout_days_and_exercises')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workout_days' },
        handleChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exercise_definitions' },
        handleChange,
      )
      .subscribe()

    return () => {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current)
      }
      subscription.unsubscribe()
    }
  }, [initialize])

  return null
}
