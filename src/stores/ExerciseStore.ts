import bundledExercises from '@/data/exercises.json'
import {
  type ClientExerciseDetail,
  type ClientWorkoutDay,
  type TransformDeps,
  WorkoutDayWithExercisesSchema,
  toClientWorkoutDay,
} from '@/lib/schemas'
import { supabase } from '@/lib/supabase'
import { getRandomPastelColor } from '@/utils/getRandomPastelColor'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { create } from 'zustand'

// Runtime dependencies for transforms (injectable for testing)
const runtimeDeps: TransformDeps = {
  generateId: () => uuidv4(),
  generateColor: () => getRandomPastelColor(),
}

const LegacyExerciseDetailSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  title: z.string(),
  sets: z.union([z.number(), z.string(), z.null()]).optional(),
  reps: z.union([z.number(), z.string(), z.null()]).optional(),
  variation: z.string().nullable().optional(),
})

const LegacyWorkoutRowSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    day: z.union([z.number(), z.string()]).optional(),
    week: z.union([z.number(), z.string()]).optional(),
    title: z.string(),
    videoURL: z.string().nullable().optional(),
    video_url: z.string().nullable().optional(),
    cardio: z
      .object({
        morning: z.number().optional(),
        evening: z.number().optional(),
      })
      .optional(),
    exercises: z.array(LegacyExerciseDetailSchema).default([]),
  })
  .passthrough()

const toPositiveInt = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.trunc(value))
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.max(1, Math.trunc(parsed))
    }
  }
  return fallback
}

const toNonNegativeInt = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value))
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.trunc(parsed))
    }
  }
  return fallback
}

const normalizeLegacySets = (sets: unknown) => {
  if (typeof sets === 'string' && sets.toLowerCase() === 'to failure') {
    return 1
  }
  return toPositiveInt(sets, 1)
}

const toLegacyClientWorkoutDay = (
  row: z.infer<typeof LegacyWorkoutRowSchema>,
  index: number,
  deps: TransformDeps,
): ClientWorkoutDay => {
  const day = toPositiveInt(row.day, index + 1)
  const week = toPositiveInt(row.week, 1)
  const exercises: ClientExerciseDetail[] = row.exercises.map(
    (item, detailIdx) => {
      const sets = normalizeLegacySets(item.sets)
      const reps = toNonNegativeInt(item.reps, 0)
      return {
        id: String(item.id ?? `${day}-${detailIdx + 1}`),
        title: item.title,
        sets,
        is_amrap:
          typeof item.sets === 'string' &&
          item.sets.toLowerCase() === 'to failure',
        reps,
        variation: item.variation ?? null,
        completed: false,
        selectedSets: Array.from({ length: sets }, () => false),
      }
    },
  )

  return {
    id: String(row.id ?? day),
    day,
    week,
    title: row.title,
    videoURL: row.videoURL ?? row.video_url ?? null,
    cardio: {
      morning: row.cardio?.morning ?? 0,
      evening: row.cardio?.evening ?? 0,
    },
    date: `Week ${week} · Day ${day}`,
    color: deps.generateColor(),
    completed: false,
    exercises,
    localId: deps.generateId(),
    synced: true,
  }
}

const toLegacyExerciseMap = (
  rows: unknown[],
  deps: TransformDeps,
): Record<string, ClientWorkoutDay> => {
  const legacyRows = rows
    .map((row) => LegacyWorkoutRowSchema.safeParse(row))
    .filter((result) => result.success)
    .map((result) => result.data)
    .sort((a, b) => toPositiveInt(a.day, 1) - toPositiveInt(b.day, 1))

  return legacyRows.reduce(
    (acc, row, index) => {
      const workoutDay = toLegacyClientWorkoutDay(row, index, deps)
      acc[workoutDay.localId] = workoutDay
      return acc
    },
    {} as Record<string, ClientWorkoutDay>,
  )
}

interface ExerciseState {
  exercises: Record<string, ClientWorkoutDay>
  error: string | null
  loading: boolean
  initialized: boolean
}

interface ExerciseActions {
  initialize: (retries?: number, force?: boolean) => Promise<void>
  completeExercise: (localId: string) => void
  completeExerciseDetail: (
    exerciseLocalId: string,
    detailId: string,
    completed: boolean,
    selectedSets: boolean[],
  ) => void
  getSelectedSets: (exerciseLocalId: string, detailId: string) => boolean[]
  getExercise: (localId: string) => ClientWorkoutDay | undefined
  getDetail: (
    localId: string,
  ) => ClientWorkoutDay['exercises'] | readonly never[]
  sync: () => Promise<void>
}

export type ExerciseStore = ExerciseState & ExerciseActions

export const selectCompletedCount = (state: ExerciseState) =>
  Object.values(state.exercises).filter((e) => e.completed).length

export const selectActiveExercises = (state: ExerciseState) =>
  Object.values(state.exercises).filter((e) => !e.completed)

export const selectCompletedExercises = (state: ExerciseState) =>
  Object.values(state.exercises).filter((e) => e.completed)

export const useExerciseStore = create<ExerciseStore>((set, get) => ({
  exercises: {},
  error: null,
  loading: false,
  initialized: false,

  initialize: async (retries = 3, force = false) => {
    if (get().initialized && !force) return

    set({ loading: true })
    try {
      let lastError: Error | null = null
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          console.log(
            `Fetching workout data (attempt ${attempt + 1}/${retries})...`,
          )

          const { data, error } = await supabase
            .from('workout_days')
            .select('*, exercise_definitions(*)')
            .order('day')

          if (error) {
            console.warn(
              'Normalized fetch failed, trying legacy table:',
              error.message,
            )

            const { data: legacyData, error: legacyError } = await supabase
              .from('exercises')
              .select('*')

            if (legacyError) {
              console.warn('Legacy fetch failed:', legacyError.message)
              const exercises = toLegacyExerciseMap(
                bundledExercises as unknown[],
                runtimeDeps,
              )
              set({
                exercises,
                initialized: true,
                error: legacyError.message,
              })
              return
            }

            let exercises = toLegacyExerciseMap(
              (legacyData ?? []) as unknown[],
              runtimeDeps,
            )
            if (Object.keys(exercises).length === 0) {
              exercises = toLegacyExerciseMap(
                bundledExercises as unknown[],
                runtimeDeps,
              )
            }

            set({ exercises, initialized: true, error: null })
            return
          }

          if (data) {
            const exercises = data.reduce(
              (acc, row) => {
                const parsed = WorkoutDayWithExercisesSchema.safeParse(row)
                if (!parsed.success) {
                  console.warn('Row validation failed:', parsed.error.message)
                  return acc
                }
                const workoutDay = toClientWorkoutDay(parsed.data, runtimeDeps)
                acc[workoutDay.localId] = workoutDay
                return acc
              },
              {} as Record<string, ClientWorkoutDay>,
            )

            set({ exercises })
          }
          set({ initialized: true })
          return
        } catch (networkError) {
          lastError = networkError as Error
          console.warn(
            `Network error (attempt ${attempt + 1}/${retries}):`,
            lastError.message,
          )
          if (attempt < retries - 1) {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
          }
        }
      }
      throw lastError ?? new Error('Failed to fetch exercises')
    } catch (error) {
      console.error('Error initializing store:', error)
      set({ error: 'Failed to initialize exercises' })
    } finally {
      set({ loading: false })
    }
  },

  completeExercise: (localId) => {
    set((state) => {
      const workout = state.exercises[localId]
      if (!workout) return state
      return {
        exercises: {
          ...state.exercises,
          [localId]: {
            ...workout,
            completed: true,
            synced: false,
          },
        },
      }
    })
  },

  completeExerciseDetail: (
    exerciseLocalId,
    detailId,
    completed,
    selectedSets,
  ) => {
    set((state) => {
      const workout = state.exercises[exerciseLocalId]
      if (!workout) return state
      return {
        exercises: {
          ...state.exercises,
          [exerciseLocalId]: {
            ...workout,
            synced: false,
            exercises: workout.exercises.map((detail) =>
              detail.id === detailId
                ? { ...detail, completed, selectedSets }
                : detail,
            ),
          },
        },
      }
    })
  },

  getSelectedSets: (exerciseLocalId, detailId) => {
    const exercise = get().exercises[exerciseLocalId]
    const detail = exercise?.exercises.find((d) => d.id === detailId)
    return detail?.selectedSets || []
  },

  getExercise: (localId) => {
    return get().exercises[localId]
  },

  getDetail: (localId) => {
    const exercise = get().exercises[localId]
    return exercise?.exercises || []
  },

  // Sync changes with Supabase
  // Progress sync is a no-op until auth is implemented.
  // When auth is added, this will write to the user_progress table.
  sync: async () => {
    console.log('Sync: user_progress writes pending auth implementation')
  },
}))
