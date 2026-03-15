import { supabase } from '@/lib/supabase'
import type { ExerciseRow, WorkoutSessionInsert } from '@/lib/validators'
import {
  exerciseUpdateSchema,
  parseExerciseRows,
  workoutSessionInsertSchema,
} from '@/lib/validators'
import { Exercise, ExerciseDetail } from '@/types/models'
import { getRandomPastelColor } from '@/utils/getRandomPastelColor'
import { useEffect, useMemo } from 'react'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

const MOCK_EXERCISES = [
  {
    id: 'a0000000-0000-4000-8000-000000000001',
    day: '1',
    week: '1',
    title: 'Push Day — Chest & Triceps',
    videoURL: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    cardio: {
      morning: 30,
      evening: 20,
    },
    exercises: [
      {
        id: '1',
        title: 'Flat Barbell Bench Press',
        sets: 4,
        reps: 10,
        variation: null,
      },
      {
        id: '2',
        title: 'Incline Dumbbell Press',
        sets: 4,
        reps: 12,
        variation: 'Dumbbell',
      },
      {
        id: '3',
        title: 'Overhead Shoulder Press',
        sets: 3,
        reps: 10,
        variation: 'Barbell',
      },
      {
        id: '4',
        title: 'Lateral Raises',
        sets: 3,
        reps: 15,
        variation: 'Dumbbell',
      },
      {
        id: '5',
        title: 'Cable Tricep Pushdowns',
        sets: 3,
        reps: 15,
        variation: 'Rope',
      },
      {
        id: '6',
        title: 'Overhead Tricep Extensions',
        sets: 'To Failure' as const,
        reps: 20,
        variation: 'Cable',
      },
    ],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a0000000-0000-4000-8000-000000000002',
    day: '2',
    week: '1',
    title: 'Pull Day — Back & Biceps',
    videoURL: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    cardio: {
      morning: 25,
      evening: 15,
    },
    exercises: [
      {
        id: '7',
        title: 'Conventional Deadlift',
        sets: 4,
        reps: 6,
        variation: null,
      },
      {
        id: '8',
        title: 'Barbell Bent-Over Rows',
        sets: 4,
        reps: 10,
        variation: null,
      },
      {
        id: '9',
        title: 'Lat Pulldowns',
        sets: 3,
        reps: 12,
        variation: 'Wide Grip',
      },
      {
        id: '10',
        title: 'Seated Cable Rows',
        sets: 3,
        reps: 12,
        variation: 'V-Bar',
      },
      {
        id: '11',
        title: 'Barbell Bicep Curls',
        sets: 3,
        reps: 12,
        variation: null,
      },
      {
        id: '12',
        title: 'Hammer Curls',
        sets: 'To Failure' as const,
        reps: 15,
        variation: 'Dumbbell',
      },
    ],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a0000000-0000-4000-8000-000000000003',
    day: '3',
    week: '1',
    title: 'Leg Day — Quads & Glutes',
    videoURL: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    cardio: {
      morning: 20,
      evening: 10,
    },
    exercises: [
      {
        id: '13',
        title: 'Barbell Back Squat',
        sets: 5,
        reps: 8,
        variation: null,
      },
      {
        id: '14',
        title: 'Romanian Deadlift',
        sets: 4,
        reps: 10,
        variation: 'Barbell',
      },
      {
        id: '15',
        title: 'Leg Press',
        sets: 4,
        reps: 12,
        variation: null,
      },
      {
        id: '16',
        title: 'Walking Lunges',
        sets: 3,
        reps: 12,
        variation: 'Dumbbell',
      },
      {
        id: '17',
        title: 'Leg Curls',
        sets: 3,
        reps: 15,
        variation: 'Machine',
      },
      {
        id: '18',
        title: 'Calf Raises',
        sets: 4,
        reps: 20,
        variation: 'Standing',
      },
    ],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a0000000-0000-4000-8000-000000000004',
    day: '4',
    week: '1',
    title: 'Upper Body — Shoulders & Arms',
    videoURL: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    cardio: {
      morning: 25,
      evening: 20,
    },
    exercises: [
      {
        id: '19',
        title: 'Seated Dumbbell Shoulder Press',
        sets: 4,
        reps: 10,
        variation: 'Dumbbell',
      },
      {
        id: '20',
        title: 'Arnold Press',
        sets: 3,
        reps: 12,
        variation: 'Dumbbell',
      },
      {
        id: '21',
        title: 'Face Pulls',
        sets: 3,
        reps: 15,
        variation: 'Cable',
      },
      {
        id: '22',
        title: 'EZ-Bar Curls',
        sets: 3,
        reps: 12,
        variation: null,
      },
      {
        id: '23',
        title: 'Skull Crushers',
        sets: 3,
        reps: 12,
        variation: 'EZ-Bar',
      },
      {
        id: '24',
        title: 'Cable Lateral Raises',
        sets: 'To Failure' as const,
        reps: 15,
        variation: 'Single Arm',
      },
    ],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a0000000-0000-4000-8000-000000000005',
    day: '5',
    week: '1',
    title: 'Leg Day — Hamstrings & Calves',
    videoURL: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    cardio: {
      morning: 20,
      evening: 15,
    },
    exercises: [
      {
        id: '25',
        title: 'Sumo Deadlift',
        sets: 4,
        reps: 8,
        variation: null,
      },
      {
        id: '26',
        title: 'Bulgarian Split Squats',
        sets: 3,
        reps: 10,
        variation: 'Dumbbell',
      },
      {
        id: '27',
        title: 'Hip Thrusts',
        sets: 4,
        reps: 12,
        variation: 'Barbell',
      },
      {
        id: '28',
        title: 'Seated Leg Curls',
        sets: 3,
        reps: 15,
        variation: 'Machine',
      },
      {
        id: '29',
        title: 'Leg Extensions',
        sets: 3,
        reps: 15,
        variation: 'Machine',
      },
      {
        id: '30',
        title: 'Seated Calf Raises',
        sets: 'To Failure' as const,
        reps: 25,
        variation: 'Machine',
      },
    ],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a0000000-0000-4000-8000-000000000006',
    day: '6',
    week: '1',
    title: 'Push Day — Hypertrophy',
    videoURL: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    cardio: {
      morning: 30,
      evening: 20,
    },
    exercises: [
      {
        id: '31',
        title: 'Dumbbell Bench Press',
        sets: 4,
        reps: 12,
        variation: 'Flat',
      },
      {
        id: '32',
        title: 'Cable Crossovers',
        sets: 3,
        reps: 15,
        variation: 'High-to-Low',
      },
      {
        id: '33',
        title: 'Machine Chest Press',
        sets: 3,
        reps: 12,
        variation: null,
      },
      {
        id: '34',
        title: 'Dumbbell Lateral Raises',
        sets: 4,
        reps: 15,
        variation: 'Dumbbell',
      },
      {
        id: '35',
        title: 'Tricep Dips',
        sets: 3,
        reps: 12,
        variation: 'Weighted',
      },
      {
        id: '36',
        title: 'Pec Deck Fly',
        sets: 'To Failure' as const,
        reps: 15,
        variation: 'Machine',
      },
    ],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a0000000-0000-4000-8000-000000000007',
    day: '7',
    week: '1',
    title: 'Active Recovery & Core',
    videoURL: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    cardio: {
      morning: 40,
      evening: 0,
    },
    exercises: [
      {
        id: '37',
        title: 'Hanging Leg Raises',
        sets: 3,
        reps: 15,
        variation: null,
      },
      {
        id: '38',
        title: 'Cable Woodchops',
        sets: 3,
        reps: 12,
        variation: 'Cable',
      },
      {
        id: '39',
        title: 'Plank Hold',
        sets: 3,
        reps: 60,
        variation: null,
      },
      {
        id: '40',
        title: 'Ab Wheel Rollouts',
        sets: 'To Failure' as const,
        reps: 15,
        variation: null,
      },
    ],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

const today = new Date()

interface ExerciseState {
  exercises: Record<string, Exercise>
  /** ISO timestamp of when each workout was started (keyed by localId) */
  workoutStartTimes: Record<string, string>
  error: string | null
  loading: boolean
  initialized: boolean

  initialize: () => Promise<void>
  startWorkout: (localId: string) => void
  completeExercise: (localId: string) => void
  completeExerciseDetail: (
    exerciseLocalId: string,
    detailId: string,
    completed: boolean,
    selectedSets: boolean[],
  ) => void
  getSelectedSets: (exerciseLocalId: string, detailId: string) => boolean[]
  getWeightPerSet: (exerciseLocalId: string, detailId: string) => number[]
  updateExerciseWeight: (
    exerciseLocalId: string,
    detailId: string,
    setIndex: number,
    weight: number,
  ) => void
  getExercise: (localId: string) => Exercise | undefined
  getDetail: (localId: string) => ExerciseDetail[]
  updateExerciseDetail: (
    exerciseLocalId: string,
    detailId: string,
    updates: {
      sets?: number
      reps?: number
      defaultWeight?: number
      variation?: string | null
    },
  ) => void
  saveWorkoutSession: (localId: string) => Promise<WorkoutSessionInsert | null>
  sync: () => Promise<void>
}

export const useExerciseStoreBase = create<ExerciseState>((set, get) => ({
  exercises: {},
  workoutStartTimes: {},
  error: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return

    set({ loading: true })
    try {
      let exercisesData: ExerciseRow[]

      try {
        // Race the Supabase query against a 3-second timeout so it
        // can't hang forever when the backend is unreachable.
        const supabasePromise = supabase
          .from('exercises')
          .select('*')
          .order('day')

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Supabase timeout')), 3000),
        )

        const { data, error } = await Promise.race([
          supabasePromise,
          timeoutPromise,
        ])

        const rows = error ? [] : parseExerciseRows(data ?? [])
        exercisesData =
          rows.length > 0 ? rows : parseExerciseRows(MOCK_EXERCISES)
      } catch {
        // Supabase unreachable or timed out — fall back to mock data
        exercisesData = parseExerciseRows(MOCK_EXERCISES)
      }

      if (exercisesData.length > 0) {
        const exercises = exercisesData.reduce(
          (acc, e) => {
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
              cardio: e.cardio,
              exercises: e.exercises.map((detail) => ({
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
                weightPerSet: Array.from(
                  {
                    length:
                      detail.sets === 'To Failure' || detail.sets == null
                        ? 1
                        : Number(detail.sets),
                  },
                  () => 0,
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

  startWorkout: (localId: string) => {
    set((state) => {
      // Don't overwrite if already started
      if (state.workoutStartTimes[localId]) return state
      return {
        workoutStartTimes: {
          ...state.workoutStartTimes,
          [localId]: new Date().toISOString(),
        },
      }
    })
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

  getWeightPerSet: (exerciseLocalId: string, detailId: string) => {
    const exercise = get().exercises[exerciseLocalId]
    const detail = exercise?.exercises.find((d) => d.id === detailId)
    return detail?.weightPerSet || []
  },

  updateExerciseWeight: (
    exerciseLocalId: string,
    detailId: string,
    setIndex: number,
    weight: number,
  ) => {
    set((state) => {
      const exercise = state.exercises[exerciseLocalId]
      if (!exercise) return state
      const updatedExercises = exercise.exercises.map((detail) => {
        if (detail.id !== detailId) return detail
        const newWeights = [...detail.weightPerSet]
        newWeights[setIndex] = Math.max(0, weight)
        return { ...detail, weightPerSet: newWeights }
      })
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

  getExercise: (localId: string) => {
    return get().exercises[localId]
  },

  getDetail: (localId: string) => {
    const exercise = get().exercises[localId]
    return exercise?.exercises || []
  },

  updateExerciseDetail: (
    exerciseLocalId: string,
    detailId: string,
    updates: {
      sets?: number
      reps?: number
      defaultWeight?: number
      variation?: string | null
    },
  ) => {
    set((state) => {
      const exercise = state.exercises[exerciseLocalId]
      if (!exercise) return state
      const updatedExercises = exercise.exercises.map((detail) => {
        if (detail.id !== detailId) return detail
        const newSets = updates.sets ?? detail.sets
        const newReps = updates.reps ?? detail.reps
        const newVariation =
          updates.variation !== undefined ? updates.variation : detail.variation

        // Resize selectedSets and weightPerSet arrays if sets count changed
        let newSelectedSets = detail.selectedSets
        let newWeightPerSet = detail.weightPerSet
        if (updates.sets != null && updates.sets !== detail.sets) {
          newSelectedSets = Array.from(
            { length: newSets },
            (_, i) => detail.selectedSets[i] ?? false,
          )
          const defaultW = updates.defaultWeight ?? detail.weightPerSet[0] ?? 0
          newWeightPerSet = Array.from(
            { length: newSets },
            (_, i) => detail.weightPerSet[i] ?? defaultW,
          )
        }

        // Apply default weight to all sets if specified
        if (updates.defaultWeight != null) {
          newWeightPerSet = newWeightPerSet.map(() => updates.defaultWeight!)
        }

        return {
          ...detail,
          sets: newSets,
          reps: newReps,
          variation: newVariation,
          selectedSets: newSelectedSets,
          weightPerSet: newWeightPerSet,
        }
      })
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

  saveWorkoutSession: async (localId: string) => {
    const exercise = get().exercises[localId]
    if (!exercise) return null

    const startedAt =
      get().workoutStartTimes[localId] ?? new Date().toISOString()
    const completedAt = new Date().toISOString()
    const durationSeconds = Math.round(
      (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000,
    )

    // Calculate sets
    let setsCompleted = 0
    let totalSets = 0
    let exercisesCompleted = 0
    for (const ex of exercise.exercises) {
      const sets = ex.selectedSets ?? []
      totalSets += sets.length
      setsCompleted += sets.filter(Boolean).length
      if (ex.completed) exercisesCompleted++
    }

    const cardioMinutes = exercise.cardio
      ? exercise.cardio.morning + exercise.cardio.evening
      : 0

    const session: WorkoutSessionInsert = {
      exercise_day: exercise.id,
      exercise_week: '1', // TODO: derive from exercise data when multi-week support exists
      title: exercise.title,
      started_at: startedAt,
      completed_at: completedAt,
      duration_seconds: durationSeconds,
      total_volume_kg: (() => {
        let volume = 0
        for (const ex of exercise.exercises) {
          const sets = ex.selectedSets ?? []
          const weights = ex.weightPerSet ?? []
          for (let i = 0; i < sets.length; i++) {
            if (sets[i]) {
              // volume = weight (kg) × reps for each completed set
              const weightKg = weights[i] ?? 0
              volume += weightKg * ex.reps
            }
          }
        }
        return Math.round(volume * 100) / 100
      })(),
      sets_completed: setsCompleted,
      total_sets: totalSets,
      exercises_completed: exercisesCompleted,
      total_exercises: exercise.exercises.length,
      cardio_minutes: cardioMinutes,
    }

    const parsed = workoutSessionInsertSchema.safeParse(session)
    if (!parsed.success) {
      console.error('[WorkoutSession] Validation failed:', parsed.error.issues)
      return session // Return for UI even if save fails
    }

    try {
      const { error } = await supabase
        .from('workout_sessions')
        .insert(parsed.data)

      if (error) {
        console.warn('[WorkoutSession] Supabase insert error:', error.message)
      }
    } catch (err) {
      console.warn('[WorkoutSession] Save failed:', err)
    }

    return session
  },

  sync: async () => {
    const { exercises } = get()
    const unsyncedExercises = Object.values(exercises).filter((e) => !e.synced)

    for (const exercise of unsyncedExercises) {
      try {
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

export const useExerciseStore = () => {
  const store = useExerciseStoreBase(
    useShallow((state) => ({
      exercises: state.exercises,
      workoutStartTimes: state.workoutStartTimes,
      error: state.error,
      loading: state.loading,
      initialized: state.initialized,
      initialize: state.initialize,
      startWorkout: state.startWorkout,
      completeExercise: state.completeExercise,
      completeExerciseDetail: state.completeExerciseDetail,
      getSelectedSets: state.getSelectedSets,
      getWeightPerSet: state.getWeightPerSet,
      updateExerciseWeight: state.updateExerciseWeight,
      updateExerciseDetail: state.updateExerciseDetail,
      getExercise: state.getExercise,
      getDetail: state.getDetail,
      saveWorkoutSession: state.saveWorkoutSession,
      sync: state.sync,
    })),
  )

  useEffect(() => {
    store.initialize()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const exerciseList = useMemo(
    () => Object.values(store.exercises),
    [store.exercises],
  )

  const completedCount = useMemo(
    () => exerciseList.filter((e) => e.completed).length,
    [exerciseList],
  )

  const activeExercises = useMemo(
    () => exerciseList.filter((e) => !e.completed),
    [exerciseList],
  )

  const completedExercises = useMemo(
    () => exerciseList.filter((e) => e.completed),
    [exerciseList],
  )

  return {
    ...store,
    completedCount,
    activeExercises,
    completedExercises,
  }
}
