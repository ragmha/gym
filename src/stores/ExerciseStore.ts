import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { persist, createJSONStorage } from 'zustand/middleware'
import exercisesData from '@/data/exercises.json'
import { getRandomPastelColor } from '@/utils/getRandomPastelColor'

interface ExerciseDetail {
  id: string
  title: string
  sets: number
  reps: number
  variation: string | null
  completed: boolean
}

interface Exercise {
  id: string
  title: string
  videoURL: string
  date: string
  color: string
  completed: boolean
  exercises: ExerciseDetail[]
}

interface ExerciseStore {
  exercises: Exercise[]
  setExercises: (exercises: Exercise[]) => void
  completeExercise: (id: string) => void
  completeExerciseDetail: (
    exerciseId: string | string[],
    detailId: string,
    completed: boolean
  ) => void
  exercise: (id: string | string[]) => Exercise | undefined
  completedCount: () => number
  detail: (id: string | string[]) => ExerciseDetail[]
}

const today = new Date()

const initialExercises: Exercise[] = exercisesData.map((e) => ({
  id: e.day,
  title: e.title,
  videoURL: e.videoURL,
  date: new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + Number(e.day) - 1
  ).toLocaleString(),
  color: getRandomPastelColor(),
  completed: false,
  exercises: e.exercises.map((exercise) => ({
    ...exercise,
    sets: Number(exercise.sets),
    reps: Number(exercise.reps),
    variation: exercise.variation,
    completed: false,
  })),
}))

export const useExerciseStore = create<ExerciseStore>()(
  persist(
    (set, get) => ({
      exercises: initialExercises,
      setExercises: (exercises) => set({ exercises }),

      completeExercise: (id) => {
        const updatedExercises = get().exercises.map((exercise) =>
          exercise.id === id ? { ...exercise, completed: true } : exercise
        )

        const reorderedExercises = updatedExercises.sort(
          (a, b) => Number(a.completed) - Number(b.completed)
        )

        set({ exercises: reorderedExercises })
      },

      completeExerciseDetail: (exerciseId, detailId, completed) => {
        const updatedExercises = get().exercises.map((exercise) => {
          if (exercise.id === exerciseId) {
            const updatedDetails = exercise.exercises.map((detail) =>
              detail.id === detailId ? { ...detail, completed } : detail
            )

            const allDetailsCompleted = updatedDetails.every(
              (detail) => detail.completed
            )

            return {
              ...exercise,
              exercises: updatedDetails,
              completed: allDetailsCompleted,
            }
          }
          return exercise
        })

        const reorderedExercises = updatedExercises.sort(
          (a, b) => Number(a.completed) - Number(b.completed)
        )

        set({ exercises: reorderedExercises })
      },

      exercise: (id) => get().exercises.find((exercise) => exercise.id === id),

      completedCount: () =>
        get().exercises.filter((exercise) => exercise.completed).length,

      detail: (id: string | string[]) => {
        const exercises = get().exercises

        // Find the exercise by day
        const exercise = exercises.find((item) => item.id === id)

        // If the exercise is found, map its details
        if (exercise?.exercises) {
          return exercise.exercises.map((exerciseDetail) => ({
            id: exerciseDetail.id,
            title: exerciseDetail.title,
            sets: exerciseDetail.sets,
            reps: exerciseDetail.reps,
            variation: exerciseDetail.variation,
            completed: exerciseDetail.completed,
          }))
        }

        return []
      },
    }),
    {
      name: 'exercise-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
