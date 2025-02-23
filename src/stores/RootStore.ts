import { supabase } from '@/lib/supabase'
import { Exercise, RootState } from '@/types/models'
import { computed, observable } from '@legendapp/state'
import { enableReactTracking } from '@legendapp/state/config/enableReactTracking'
import { persistObservable } from '@legendapp/state/persist'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { PostgrestError } from '@supabase/supabase-js'

// Enable React tracking
enableReactTracking({
  auto: true,
})

// Create the root store with strict typing
export const RootStore = observable<RootState>({
  exercises: {},
  ui: {
    loading: false,
    error: null,
  },
  auth: {
    user: null,
    session: null,
  },
  initialized: false,
})

// Setup persistence with type-safe configuration
persistObservable(RootStore, {
  name: 'gym-app-state',
  storage: AsyncStorage,
})

// Type-safe selectors using computed values
export const selectors = {
  getExerciseById: function getExerciseById(id: string) {
    return computed(() => RootStore.exercises[id].get() as Exercise | undefined)
  },

  getActiveExercises: function getActiveExercises() {
    return computed(() =>
      Object.values(RootStore.exercises.get()).filter(
        (ex): ex is Exercise => !ex.deleted,
      ),
    )
  },

  getCompletedExercises: function getCompletedExercises() {
    return computed(() =>
      Object.values(RootStore.exercises.get()).filter(
        (ex): ex is Exercise => ex.completed,
      ),
    )
  },

  getPendingSync: function getPendingSync() {
    return computed(() =>
      Object.values(RootStore.exercises.get()).filter(
        (ex): ex is Exercise => !ex.synced,
      ),
    )
  },
}

// Type-safe API response interface
interface ApiResponse<T> {
  data: T | null
  error: PostgrestError | null
}

// Type-safe action creators using function declarations
export const actions = {
  addExercise: async function addExercise(
    exercise: Exercise,
  ): Promise<Exercise> {
    RootStore.ui.loading.set(true)
    try {
      const { data, error }: ApiResponse<Exercise> = await supabase
        .from('exercises')
        .insert(exercise)
        .select()
        .single()

      if (error) throw error
      if (!data) throw new Error('No data returned from insert')

      RootStore.exercises[exercise.id].set(exercise)
      return data
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred'
      RootStore.ui.error.set(errorMessage)
      throw error
    } finally {
      RootStore.ui.loading.set(false)
    }
  },

  updateExercise: async function updateExercise(
    id: string,
    updates: Partial<Exercise>,
  ): Promise<Exercise> {
    RootStore.ui.loading.set(true)
    try {
      const { data, error }: ApiResponse<Exercise> = await supabase
        .from('exercises')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      if (!data) throw new Error('No data returned from update')

      RootStore.exercises[id].set((prev) => ({ ...prev, ...updates }))
      return data
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred'
      RootStore.ui.error.set(errorMessage)
      throw error
    } finally {
      RootStore.ui.loading.set(false)
    }
  },

  deleteExercise: async function deleteExercise(id: string): Promise<void> {
    RootStore.ui.loading.set(true)
    try {
      const { error }: ApiResponse<null> = await supabase
        .from('exercises')
        .delete()
        .eq('id', id)

      if (error) throw error

      RootStore.exercises[id].set((prev: Exercise) => ({
        ...prev,
        deleted: true,
      }))
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred'
      RootStore.ui.error.set(errorMessage)
      throw error
    } finally {
      RootStore.ui.loading.set(false)
    }
  },

  syncExercises: async function syncExercises(): Promise<void> {
    const pendingSync = selectors.getPendingSync().get()

    for (const exercise of pendingSync) {
      try {
        const { error }: ApiResponse<Exercise> = await supabase
          .from('exercises')
          .upsert(exercise)

        if (!error) {
          RootStore.exercises[exercise.id].synced.set(true)
        }
      } catch (error) {
        console.error(`Failed to sync exercise ${exercise.id}:`, error)
      }
    }
  },
}
