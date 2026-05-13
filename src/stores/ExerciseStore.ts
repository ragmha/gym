import { offlineFirstQuery } from '@/lib/offlineFirstQuery/OfflineFirstQuery'
import { supabase } from '@/lib/supabase'
import type { ExerciseRow } from '@/lib/validators'
import { parseExerciseRows } from '@/lib/validators'
import { useWorkoutSessionStoreBase } from '@/stores/WorkoutSessionStore'
import type { ExerciseDetailTemplate, WorkoutTemplate } from '@/types/models'
import { pastelColorForSeed } from '@/utils/getRandomPastelColor'
import { useEffect, useMemo } from 'react'
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

interface ExerciseState {
  exercises: Record<string, WorkoutTemplate>
  error: string | null
  loading: boolean
  initialized: boolean

  initialize: () => Promise<void>
  getExercise: (templateId: string) => WorkoutTemplate | undefined
  getDetail: (templateId: string) => ExerciseDetailTemplate[]
  sync: () => Promise<void>
}

function normalizeTemplate(row: ExerciseRow): WorkoutTemplate {
  return {
    id: row.id,
    day: row.day,
    week: row.week,
    title: row.title,
    videoURL: row.videoURL,
    cardio: row.cardio,
    color: pastelColorForSeed(row.id),
    exercises: row.exercises.map((detail) => ({
      id: detail.id,
      title: detail.title,
      sets:
        detail.sets === 'To Failure' || detail.sets == null
          ? 1
          : Number(detail.sets),
      reps: Number(detail.reps),
      variation: detail.variation,
    })),
  }
}

async function loadTemplateRows(): Promise<ExerciseRow[]> {
  const result = await offlineFirstQuery({
    query: async () => supabase.from('exercises').select('*').order('day'),
    fallback: () => parseExerciseRows(MOCK_EXERCISES),
    parse: (rows) => parseExerciseRows(rows),
    timeoutMs: 3000,
    fallbackOnEmpty: true,
  })

  return result.data
}

export const useExerciseStoreBase = create<ExerciseState>((set, get) => ({
  exercises: {},
  error: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return

    set({ loading: true, error: null })
    try {
      const rows = await loadTemplateRows()
      const exercises = rows.reduce<Record<string, WorkoutTemplate>>(
        (acc, row) => {
          const template = normalizeTemplate(row)
          acc[template.id] = template
          return acc
        },
        {},
      )

      set({ exercises, initialized: true })
    } catch (error) {
      console.error('Error initializing template store:', error)
      set({ error: 'Failed to initialize exercises' })
    } finally {
      set({ loading: false })
    }
  },

  getExercise: (templateId) => get().exercises[templateId],

  getDetail: (templateId) => get().exercises[templateId]?.exercises ?? [],

  sync: async () => undefined,
}))

export const useExerciseStore = () => {
  const store = useExerciseStoreBase(
    useShallow((state) => ({
      exercises: state.exercises,
      error: state.error,
      loading: state.loading,
      initialized: state.initialized,
      initialize: state.initialize,
      getExercise: state.getExercise,
      getDetail: state.getDetail,
      sync: state.sync,
    })),
  )

  useEffect(() => {
    store.initialize()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sessions = useWorkoutSessionStoreBase((state) => state.sessions)

  const exerciseList = useMemo(
    () => Object.values(store.exercises),
    [store.exercises],
  )

  const completedTemplateIds = useMemo(
    () =>
      new Set(
        Object.values(sessions)
          .filter((session) => session.status === 'complete')
          .map((session) => session.templateId),
      ),
    [sessions],
  )

  const completedExercises = useMemo(
    () =>
      exerciseList.filter((template) => completedTemplateIds.has(template.id)),
    [completedTemplateIds, exerciseList],
  )

  const activeExercises = useMemo(
    () =>
      exerciseList.filter((template) => !completedTemplateIds.has(template.id)),
    [completedTemplateIds, exerciseList],
  )

  return {
    ...store,
    completedCount: completedExercises.length,
    activeExercises,
    completedExercises,
  }
}
