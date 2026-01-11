import { RootStore, actions, selectors } from '@/stores/RootStore'
import { Exercise } from '@/types/models'
import { ObservableComputed } from '@legendapp/state'
import { useCallback, useMemo } from 'react'

export interface UseStoreReturn {
  // State
  exercises: Record<string, Exercise>
  loading: boolean
  error: string | null

  // Actions
  addExercise: (exercise: Exercise) => Promise<Exercise>
  updateExercise: (id: string, updates: Partial<Exercise>) => Promise<Exercise>
  deleteExercise: (id: string) => Promise<void>
  syncExercises: () => Promise<void>

  // Selectors
  getExerciseById: (id: string) => ObservableComputed<Exercise | undefined>
  getActiveExercises: () => ObservableComputed<Exercise[]>
  getCompletedExercises: () => ObservableComputed<Exercise[]>
}

export const useStore = (): UseStoreReturn => {
  const addExercise = useCallback(async (exercise: Exercise) => {
    return actions.addExercise(exercise)
  }, [])

  const updateExercise = useCallback(
    async (id: string, updates: Partial<Exercise>) => {
      return actions.updateExercise(id, updates)
    },
    [],
  )

  const deleteExercise = useCallback(async (id: string) => {
    return actions.deleteExercise(id)
  }, [])

  const syncExercises = useCallback(async () => {
    return actions.syncExercises()
  }, [])

  return useMemo(
    () => ({
      // State
      exercises: RootStore.exercises.get(),
      loading: RootStore.ui.loading.get(),
      error: RootStore.ui.error.get(),

      // Actions
      addExercise,
      updateExercise,
      deleteExercise,
      syncExercises,

      // Selectors
      getExerciseById: selectors.getExerciseById,
      getActiveExercises: selectors.getActiveExercises,
      getCompletedExercises: selectors.getCompletedExercises,
    }),
    [],
  )
}
