import { supabase } from '@/lib/supabase'
import { RootStore } from '@/stores/RootStore'
import { Exercise } from '@/types/models'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useEffect } from 'react'

type ExerciseRow = {
  [K in keyof Exercise]: Exercise[K]
}

export const useRealtimeSync = () => {
  useEffect(() => {
    const subscription = supabase
      .channel('exercises')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exercises' },
        (payload: RealtimePostgresChangesPayload<ExerciseRow>) => {
          try {
            switch (payload.eventType) {
              case 'INSERT':
              case 'UPDATE': {
                const exercise: Exercise = payload.new
                RootStore.exercises[exercise.id].set(exercise)
                break
              }
              case 'DELETE': {
                const { id } = payload.old
                if (id) {
                  RootStore.exercises[id].set((prev: Exercise) => ({
                    ...prev,
                    deleted: true,
                  }))
                }
                break
              }
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
