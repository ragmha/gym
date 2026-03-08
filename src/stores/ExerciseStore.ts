import { supabase } from '@/lib/supabase'
import { Exercise, ExerciseDetail } from '@/types/models'
import { exerciseUpdateSchema } from '@/lib/validators'
import { getRandomPastelColor } from '@/utils/getRandomPastelColor'
import { useEffect } from 'react'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'

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

// Helper
const today = new Date()

interface ExerciseState {
  exercises: Record<string, Exercise>
  error: string | null
  loading: boolean
  initialized: boolean

  initialize: () => Promise<void>
  completeExercise: (localId: string) => void
  completeExerciseDetail: (
    exerciseLocalId: string,
    detailId: string,
    completed: boolean,
    selectedSets: boolean[],
  ) => void
  getSelectedSets: (exerciseLocalId: string, detailId: string) => boolean[]
  getExercise: (localId: string) => Exercise | undefined
  getDetail: (localId: string) => ExerciseDetail[]
  sync: () => Promise<void>
}

// Raw Zustand store – use with selectors in screens that need fine-grained subscriptions
export const useExerciseStoreBase = create<ExerciseState>((set, get) => ({
  exercises: {},
  error: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return

    set({ loading: true })
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
            const cardio =
              e.cardio &&
              typeof e.cardio === 'object' &&
              !Array.isArray(e.cardio)
                ? (e.cardio as { morning: number; evening: number })
                : { morning: 0, evening: 0 }

            const details = Array.isArray(e.exercises)
              ? (e.exercises as ExerciseDetail[])
              : []

            const exercise: Exercise = {
              id: e.day,
              title: e.title,
              videoURL: e.videoURL ?? '',
              date: new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate() + Number(e.day) - 1,
              ).toLocaleString(),
              color: getRandomPastelColor(),
              completed: false,
              cardio,
              exercises: details.map((detail: ExerciseDetail) => ({
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

        set({ exercises })
      }
      set({ initialized: true })
    } catch (error) {
      console.error('Error initializing store:', error)
      set({ error: 'Failed to initialize exercises' })
    } finally {
      set({ loading: false })
    }
  },

  completeExercise: (localId: string) => {
    set((state) => ({
      exercises: {
        ...state.exercises,
        [localId]: {
          ...state.exercises[localId],
          completed: true,
          synced: false,
        },
      },
    }))
  },

  completeExerciseDetail: (
    exerciseLocalId: string,
    detailId: string,
    completed: boolean,
    selectedSets: boolean[],
  ) => {
    set((state) => {
      const exercise = state.exercises[exerciseLocalId]
      if (!exercise) return state
      const updatedExercises = exercise.exercises.map((detail) =>
        detail.id === detailId
          ? { ...detail, completed, selectedSets }
          : detail,
      )
      return {
        exercises: {
          ...state.exercises,
          [exerciseLocalId]: {
            ...exercise,
            exercises: updatedExercises,
            synced: false,
          },
        },
      }
    })
  },

  getSelectedSets: (exerciseLocalId: string, detailId: string) => {
    const exercise = get().exercises[exerciseLocalId]
    const detail = exercise?.exercises.find((d) => d.id === detailId)
    return detail?.selectedSets || []
  },

  getExercise: (localId: string) => {
    return get().exercises[localId]
  },

  getDetail: (localId: string) => {
    const exercise = get().exercises[localId]
    return exercise?.exercises || []
  },

  sync: async () => {
    const { exercises } = get()
    const unsyncedExercises = Object.values(exercises).filter((e) => !e.synced)

    for (const exercise of unsyncedExercises) {
      try {
        // Validate payload before writing to Supabase
        const payload = {
          completed: exercise.completed,
          exercises: exercise.exercises,
        }

        const parsed = exerciseUpdateSchema.safeParse(payload)
        if (!parsed.success) {
          console.error(
            'Validation failed for exercise sync:',
            parsed.error.issues,
          )
          continue
        }

        const { error } = await supabase
          .from('exercises')
          .update(parsed.data)
          .eq('day', exercise.id)

        if (error) throw error

        set((state) => ({
          exercises: {
            ...state.exercises,
            [exercise.localId]: {
              ...state.exercises[exercise.localId],
              synced: true,
            },
          },
        }))
      } catch (error) {
        console.error('Error syncing exercise:', error)
      }
    }
  },
}))

// Convenience hook – keeps the same return shape as the old Legend State hook
export const useExerciseStore = () => {
  const store = useExerciseStoreBase()

  useEffect(() => {
    store.initialize()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const exerciseList = Object.values(store.exercises)

  return {
    exercises: store.exercises,
    error: store.error,
    loading: store.loading,
    initialized: store.initialized,
    completedCount: exerciseList.filter((e) => e.completed).length,
    activeExercises: exerciseList.filter((e) => !e.completed),
    completedExercises: exerciseList.filter((e) => e.completed),
    initialize: store.initialize,
    completeExercise: store.completeExercise,
    completeExerciseDetail: store.completeExerciseDetail,
    getSelectedSets: store.getSelectedSets,
    getExercise: store.getExercise,
    getDetail: store.getDetail,
    sync: store.sync,
  }
}
