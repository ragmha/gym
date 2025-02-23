import { supabase } from '@/lib/supabase'
import { getRandomPastelColor } from '@/utils/getRandomPastelColor'
import { observable } from '@legendapp/state'
import { enableReactTracking } from '@legendapp/state/config/enableReactTracking'
import { useEffect } from 'react'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'

// Enable React tracking
enableReactTracking({
  auto: true,
})

interface ExerciseDetail {
  id: string
  title: string
  sets: number | 'To Failure'
  reps: number
  variation: string | null
  completed: boolean
  selectedSets: boolean[]
}

interface Exercise {
  id: string
  title: string
  videoURL: string
  date: string
  color: string
  completed: boolean
  cardio: {
    morning: number
    evening: number
  }
  exercises: ExerciseDetail[]
  localId: string
  synced: boolean
  deleted?: boolean
}

// Create the store
export const state$ = observable({
  exercises: {} as Record<string, Exercise>,
  error: null as string | null,
  loading: false,
  initialized: false,
})

// Create computed values
export const computed$ = {
  completedCount: () =>
    Object.values(state$.exercises.get()).filter((e) => e.completed).length,
  activeExercises: () =>
    Object.values(state$.exercises.get()).filter((e) => !e.completed),
  completedExercises: () =>
    Object.values(state$.exercises.get()).filter((e) => e.completed),
}

// Mock data for initial development
const MOCK_EXERCISES = [
  {
    day: '1',
    title: 'Push Day',
    videoURL: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    cardio: {
      morning: 30,
      evening: 20,
    },
    exercises: [
      {
        id: '1',
        title: 'Bench Press',
        sets: 4,
        reps: 12,
        variation: null,
      },
      {
        id: '2',
        title: 'Shoulder Press',
        sets: 3,
        reps: 15,
        variation: 'Dumbbell',
      },
      {
        id: '3',
        title: 'Tricep Extensions',
        sets: 'To Failure',
        reps: 20,
        variation: 'Rope',
      },
    ],
  },
  {
    day: '2',
    title: 'Pull Day',
    videoURL: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    cardio: {
      morning: 25,
      evening: 15,
    },
    exercises: [
      {
        id: '4',
        title: 'Deadlifts',
        sets: 4,
        reps: 8,
        variation: null,
      },
      {
        id: '5',
        title: 'Barbell Rows',
        sets: 3,
        reps: 12,
        variation: null,
      },
      {
        id: '6',
        title: 'Bicep Curls',
        sets: 4,
        reps: 15,
        variation: 'Dumbbell',
      },
    ],
  },
]

// Store actions
export const actions = {
  initialize: async () => {
    if (state$.initialized.get()) return

    state$.loading.set(true)
    try {
      // Try to fetch from Supabase first
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('day')

      // If Supabase table doesn't exist, use mock data
      const exercisesData = error ? MOCK_EXERCISES : data

      if (exercisesData) {
        const exercises = exercisesData.reduce(
          (acc, e) => {
            const exercise: Exercise = {
              id: e.day,
              title: e.title,
              videoURL: e.videoURL,
              date: new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate() + Number(e.day) - 1,
              ).toLocaleString(),
              color: getRandomPastelColor(),
              completed: false,
              cardio: e.cardio,
              exercises: e.exercises.map((detail: ExerciseDetail) => ({
                ...detail,
                sets:
                  detail.sets === 'To Failure' || detail.sets == null
                    ? 1
                    : Number(detail.sets),
                reps: Number(detail.reps),
                variation: detail.variation,
                completed: false,
                selectedSets: Array.from(
                  {
                    length:
                      detail.sets === 'To Failure' || detail.sets == null
                        ? 1
                        : Number(detail.sets),
                  },
                  () => false,
                ),
              })),
              localId: uuidv4(),
              synced: true,
            }
            acc[exercise.localId] = exercise
            return acc
          },
          {} as Record<string, Exercise>,
        )

        state$.exercises.set(exercises)
      }
      state$.initialized.set(true)
    } catch (error) {
      console.error('Error initializing store:', error)
      state$.error.set('Failed to initialize exercises')
    } finally {
      state$.loading.set(false)
    }
  },

  completeExercise: (localId: string) => {
    state$.exercises[localId].completed.set(true)
    state$.exercises[localId].synced.set(false)
  },

  completeExerciseDetail: (
    exerciseLocalId: string,
    detailId: string,
    completed: boolean,
    selectedSets: boolean[],
  ) => {
    const exercise = state$.exercises[exerciseLocalId].exercises.get()
    const updatedExercises = exercise.map((detail) =>
      detail.id === detailId ? { ...detail, completed, selectedSets } : detail,
    )
    state$.exercises[exerciseLocalId].exercises.set(updatedExercises)
    state$.exercises[exerciseLocalId].synced.set(false)
  },

  getSelectedSets: (exerciseLocalId: string, detailId: string) => {
    const exercise = state$.exercises[exerciseLocalId].get()
    const detail = exercise.exercises.find((d) => d.id === detailId)
    return detail?.selectedSets || []
  },

  getExercise: (localId: string) => {
    return state$.exercises[localId].get()
  },

  getDetail: (localId: string) => {
    const exercise = state$.exercises[localId].get()
    return exercise?.exercises || []
  },

  // Sync changes with Supabase
  sync: async () => {
    const exercises = state$.exercises.get()
    const unsyncedExercises = Object.values(exercises).filter((e) => !e.synced)

    for (const exercise of unsyncedExercises) {
      try {
        const { error } = await supabase
          .from('exercises')
          .update({
            completed: exercise.completed,
            exercises: exercise.exercises,
          })
          .eq('day', exercise.id)

        if (error) throw error

        state$.exercises[exercise.localId].synced.set(true)
      } catch (error) {
        console.error('Error syncing exercise:', error)
      }
    }
  },
}

// Helper functions
const today = new Date()

// Create the hook
export const useExerciseStore = () => {
  useEffect(() => {
    actions.initialize()
  }, [])

  return {
    exercises: state$.exercises.get(),
    error: state$.error.get(),
    loading: state$.loading.get(),
    initialized: state$.initialized.get(),
    completedCount: computed$.completedCount(),
    activeExercises: computed$.activeExercises(),
    completedExercises: computed$.completedExercises(),
    ...actions,
  }
}
