import AsyncStorage from '@react-native-async-storage/async-storage'
import { persist, createJSONStorage } from 'zustand/middleware'
import { create } from 'zustand'
import { getRandomPastelColor } from '@/utils/getRandomPastelColor'
import { fetchExercies } from '@/data/fetch-exercises'

interface Workout {
  day: string
  week: string
  title: string
  videoURL: string
  cardio: {
    morning: number
    evening: number
  }
  exercises: ExerciseDetail[]
}

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
}

interface ExerciseStore {
  exercises: Exercise[]
  setExercises: (exercises: Exercise[]) => void
  completeExercise: (id: string | string[]) => void
  completeExerciseDetail: (
    exerciseId: string | string[],
    detailId: string,
    completed: boolean,
    selectedSets: boolean[],
  ) => void
  getSelectedSets: (exerciseId: string, detailId: string) => boolean[]
  exercise: (id: string | string[]) => Exercise | undefined
  completedCount: () => number
  detail: (id: string | string[]) => ExerciseDetail[]
}

const today = new Date()

export const useExerciseStore = create<ExerciseStore>()(
  persist(
    (set, get) => ({
      exercises: [],

      setExercises: (exercises) => set({ exercises }),
      completeExercise: (id) => {
        const updatedExercises = get().exercises.map((exercise) =>
          exercise.id === id ? { ...exercise, completed: true } : exercise,
        )

        set({ exercises: updatedExercises })
      },

      completeExerciseDetail: (
        exerciseId,
        detailId,
        completed,
        selectedSets,
      ) => {
        set((state) => ({
          exercises: state.exercises.map((exercise) =>
            exercise.id === exerciseId
              ? {
                  ...exercise,
                  exercises: exercise.exercises.map((detail) =>
                    detail.id === detailId
                      ? { ...detail, completed, selectedSets }
                      : detail,
                  ),
                }
              : exercise,
          ),
        }))
      },

      getSelectedSets: (exerciseId, detailId) => {
        const exercise = get().exercises.find(
          (exercise) => exercise.id === exerciseId,
        )
        const detail = exercise?.exercises.find(
          (detail) => detail.id === detailId,
        )
        return detail?.selectedSets || []
      },

      exercise: (id) => get().exercises.find((exercise) => exercise.id === id),

      completedCount: () => {
        return get().exercises.filter((exercise) => exercise.completed).length
      },

      detail: (id: string | string[]) => {
        const exercises = get().exercises

        const exercise = exercises.find((item) => item.id === id)

        if (exercise?.exercises) {
          return exercise.exercises.map((exerciseDetail) => ({
            id: exerciseDetail.id,
            title: exerciseDetail.title,
            sets: exerciseDetail.sets,
            reps: exerciseDetail.reps,
            variation: exerciseDetail.variation,
            completed: exerciseDetail.completed,
            selectedSets: exerciseDetail.selectedSets,
          }))
        }

        return []
      },
    }),
    {
      name: 'exercises1',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => async (state) => {
        try {
          const exercisesData = (await fetchExercies()) as Workout[]

          const initialExercises = exercisesData.map((e) => ({
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
            exercises: e.exercises.map((exercise) => ({
              ...exercise,
              sets:
                exercise.sets === 'To Failure' || exercise.sets == null
                  ? 1
                  : Number(exercise.sets),
              reps: Number(exercise.reps),
              variation: exercise.variation,
              completed: false,
              selectedSets: Array.from(
                {
                  length:
                    exercise.sets === 'To Failure' || exercise.sets == null
                      ? 1
                      : Number(exercise.sets),
                },
                () => false,
              ),
            })),
          }))

          state?.setExercises(initialExercises)
        } catch (error) {
          console.error('Error fetching exercises:', error)
        }
      },
    },
  ),
)
