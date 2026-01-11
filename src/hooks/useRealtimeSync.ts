import { supabase } from '@/lib/supabase'
import { RootStore } from '@/stores/RootStore'
import { Exercise } from '@/types/models'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useEffect } from 'react'

type ExercisePayload = RealtimePostgresChangesPayload<{
  [key: string]: any
  id: string
}>

export const useRealtimeSync = () => {
  useEffect(() => {
    const subscription = supabase
      .channel('exercises')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exercises' },
        (payload: ExercisePayload) => {
          try {
            switch (payload.eventType) {
              case 'INSERT':
              case 'UPDATE':
                if (payload.new && 'id' in payload.new) {
                  const exercise = payload.new as Exercise
                  RootStore.exercises[exercise.id].set(exercise)
                }
                break
              case 'DELETE':
                if (payload.old && 'id' in payload.old) {
                  const id = payload.old.id
                  RootStore.exercises[id].set((prev) => ({
                    ...prev,
                    deleted: true,
                  }))
                }
                break
            }
          } catch (error) {
            console.error('Error processing realtime update:', error)
            RootStore.ui.error.set(
              error instanceof Error
                ? error.message
                : 'Error processing realtime update',
            )
          }
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return null
}
