import { supabase } from '@/lib/supabase'
import { renderHook, waitFor } from '@testing-library/react-native'

const { useExerciseStoreBase, useExerciseStore } = jest.requireActual<
  typeof import('@/stores/ExerciseStore')
>('@/stores/ExerciseStore')

const MOCK_SUPABASE_DATA = [
  {
    id: 'a0000000-0000-4000-8000-000000000001',
    day: '1',
    week: '1',
    title: 'Push Day',
    videoURL: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    cardio: { morning: 30, evening: 20 },
    exercises: [
      { id: '1', title: 'Bench Press', sets: 4, reps: 12, variation: null },
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
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a0000000-0000-4000-8000-000000000002',
    day: '2',
    week: '1',
    title: 'Pull Day',
    videoURL: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    cardio: { morning: 25, evening: 15 },
    exercises: [
      { id: '4', title: 'Deadlifts', sets: 4, reps: 8, variation: null },
      { id: '5', title: 'Barbell Rows', sets: 3, reps: 12, variation: null },
    ],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

const initialState = {
  exercises: {},
  error: null,
  loading: false,
  initialized: false,
}

function mockSupabaseSelect(response: { data: any; error: any }) {
  jest.mocked(supabase).from.mockReturnValue({
    select: jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue(response),
    }),
  } as any)
}

beforeEach(() => {
  jest.clearAllMocks()
  useExerciseStoreBase.setState(initialState)
})

describe('ExerciseStore template store', () => {
  it('starts with empty templates, no error, not loading, not initialized', () => {
    const state = useExerciseStoreBase.getState()
    expect(state.exercises).toEqual({})
    expect(state.error).toBeNull()
    expect(state.loading).toBe(false)
    expect(state.initialized).toBe(false)
  })

  it('initialize() loads WorkoutTemplate plans from Supabase', async () => {
    mockSupabaseSelect({ data: MOCK_SUPABASE_DATA, error: null })

    await useExerciseStoreBase.getState().initialize()

    const state = useExerciseStoreBase.getState()
    const template = state.exercises['a0000000-0000-4000-8000-000000000001']
    expect(state.initialized).toBe(true)
    expect(state.loading).toBe(false)
    expect(template.title).toBe('Push Day')
    expect(template.id).toBe('a0000000-0000-4000-8000-000000000001')
    expect(template.day).toBe('1')
    expect(template.week).toBe('1')
    expect(template.videoURL).toBe(MOCK_SUPABASE_DATA[0].videoURL)
    expect(template.cardio).toEqual({ morning: 30, evening: 20 })
    expect(template.exercises[2].sets).toBe(1)
  })

  it('falls back to mock WorkoutTemplate plans when Supabase returns an error', async () => {
    mockSupabaseSelect({ data: null, error: { message: 'Network error' } })

    await useExerciseStoreBase.getState().initialize()

    const templates = Object.values(useExerciseStoreBase.getState().exercises)
    expect(templates.length).toBeGreaterThan(0)
    expect(templates[0].id).toMatch(/[0-9a-f-]{36}/)
  })

  it('does not re-initialize if already initialized', async () => {
    mockSupabaseSelect({ data: MOCK_SUPABASE_DATA, error: null })

    await useExerciseStoreBase.getState().initialize()
    const firstTemplates = useExerciseStoreBase.getState().exercises

    await useExerciseStoreBase.getState().initialize()

    expect(useExerciseStoreBase.getState().exercises).toBe(firstTemplates)
  })

  it('exposes only static plan fields on templates', async () => {
    mockSupabaseSelect({ data: MOCK_SUPABASE_DATA, error: null })

    await useExerciseStoreBase.getState().initialize()

    const template = Object.values(useExerciseStoreBase.getState().exercises)[0]
    const detail = template.exercises[0] as unknown as Record<string, unknown>
    expect('completed' in template).toBe(false)
    expect('synced' in template).toBe(false)
    expect('localId' in template).toBe(false)
    expect('selectedSets' in detail).toBe(false)
    expect('weightPerSet' in detail).toBe(false)
    expect('completed' in detail).toBe(false)
  })

  it('getExercise() and getDetail() read by template id', async () => {
    mockSupabaseSelect({ data: MOCK_SUPABASE_DATA, error: null })
    await useExerciseStoreBase.getState().initialize()

    const templateId = MOCK_SUPABASE_DATA[0].id
    expect(useExerciseStoreBase.getState().getExercise(templateId)?.title).toBe(
      'Push Day',
    )
    expect(useExerciseStoreBase.getState().getDetail(templateId)).toHaveLength(
      3,
    )
    expect(
      useExerciseStoreBase.getState().getExercise('missing'),
    ).toBeUndefined()
    expect(useExerciseStoreBase.getState().getDetail('missing')).toEqual([])
  })

  it('sync() is a no-op because execution persistence lives in WorkoutSessionStore', async () => {
    await expect(
      useExerciseStoreBase.getState().sync(),
    ).resolves.toBeUndefined()
  })
})

describe('useExerciseStore hook', () => {
  it('calls initialize on mount and returns active templates', async () => {
    mockSupabaseSelect({ data: MOCK_SUPABASE_DATA, error: null })

    const { result } = renderHook(() => useExerciseStore())

    await waitFor(() => {
      expect(result.current.initialized).toBe(true)
    })

    expect(Object.keys(result.current.exercises)).toHaveLength(2)
    expect(result.current.activeExercises).toHaveLength(2)
    expect(result.current.completedExercises).toHaveLength(0)
    expect(result.current.completedCount).toBe(0)
  })

  it('exposes template-store methods without session mutation methods', async () => {
    mockSupabaseSelect({ data: MOCK_SUPABASE_DATA, error: null })

    const { result } = renderHook(() => useExerciseStore())

    await waitFor(() => {
      expect(result.current.initialized).toBe(true)
    })

    expect(typeof result.current.initialize).toBe('function')
    expect(typeof result.current.getExercise).toBe('function')
    expect(typeof result.current.getDetail).toBe('function')
    expect(typeof result.current.sync).toBe('function')
    expect('saveWorkoutSession' in result.current).toBe(false)
    expect('getSelectedSets' in result.current).toBe(false)
    expect('updateExerciseWeight' in result.current).toBe(false)
  })
})
