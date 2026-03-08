import { supabase } from '@/lib/supabase'
import { act, renderHook, waitFor } from '@testing-library/react-native'

// Use requireActual to bypass the global mock in jest.setup.ts
const { useExerciseStoreBase, useExerciseStore } = jest.requireActual<
  typeof import('@/stores/ExerciseStore')
>('@/stores/ExerciseStore')

const MOCK_SUPABASE_DATA = [
  {
    day: '1',
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
  },
  {
    day: '2',
    title: 'Pull Day',
    videoURL: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    cardio: { morning: 25, evening: 15 },
    exercises: [
      { id: '4', title: 'Deadlifts', sets: 4, reps: 8, variation: null },
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

const initialState = {
  exercises: {},
  error: null,
  loading: false,
  initialized: false,
}

function mockSupabaseSelect(response: { data: any; error: any }) {
  const mockedSupabase = jest.mocked(supabase)
  mockedSupabase.from.mockReturnValue({
    select: jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue(response),
    }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  } as any)
}

function mockSupabaseUpdate(response: { data: any; error: any }) {
  const mockedSupabase = jest.mocked(supabase)
  mockedSupabase.from.mockReturnValue({
    select: jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue(response),
    }),
  } as any)
}

beforeEach(() => {
  useExerciseStoreBase.setState(initialState)
})

describe('ExerciseStore', () => {
  describe('initial state', () => {
    it('starts with empty exercises, no error, not loading, not initialized', () => {
      const state = useExerciseStoreBase.getState()
      expect(state.exercises).toEqual({})
      expect(state.error).toBeNull()
      expect(state.loading).toBe(false)
      expect(state.initialized).toBe(false)
    })
  })

  describe('initialize()', () => {
    it('falls back to MOCK_EXERCISES when Supabase returns an error', async () => {
      mockSupabaseSelect({ data: null, error: { message: 'Network error' } })

      await useExerciseStoreBase.getState().initialize()

      const state = useExerciseStoreBase.getState()
      const exerciseList = Object.values(state.exercises)
      expect(exerciseList).toHaveLength(2)
      expect(exerciseList.map((e) => e.title).sort()).toEqual([
        'Pull Day',
        'Push Day',
      ])
    })

    it('sets initialized=true and loading=false after init', async () => {
      mockSupabaseSelect({ data: MOCK_SUPABASE_DATA, error: null })

      await useExerciseStoreBase.getState().initialize()

      const state = useExerciseStoreBase.getState()
      expect(state.initialized).toBe(true)
      expect(state.loading).toBe(false)
    })

    it('does not re-initialize if already initialized', async () => {
      mockSupabaseSelect({ data: MOCK_SUPABASE_DATA, error: null })

      await useExerciseStoreBase.getState().initialize()
      const firstExercises = useExerciseStoreBase.getState().exercises

      await useExerciseStoreBase.getState().initialize()
      const secondExercises = useExerciseStoreBase.getState().exercises

      expect(firstExercises).toBe(secondExercises)
    })

    it('sets error message on unexpected failure', async () => {
      const mockedSupabase = jest.mocked(supabase)
      mockedSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected crash')
      })

      await useExerciseStoreBase.getState().initialize()

      const state = useExerciseStoreBase.getState()
      expect(state.error).toBe('Failed to initialize exercises')
      expect(state.loading).toBe(false)
    })
  })

  describe('completeExercise()', () => {
    it('marks an exercise as completed and synced=false', async () => {
      mockSupabaseSelect({ data: MOCK_SUPABASE_DATA, error: null })
      await useExerciseStoreBase.getState().initialize()

      const localId = Object.keys(useExerciseStoreBase.getState().exercises)[0]
      useExerciseStoreBase.getState().completeExercise(localId)

      const exercise = useExerciseStoreBase.getState().exercises[localId]
      expect(exercise.completed).toBe(true)
      expect(exercise.synced).toBe(false)
    })
  })

  describe('completeExerciseDetail()', () => {
    let localId: string
    let detailId: string

    beforeEach(async () => {
      mockSupabaseSelect({ data: MOCK_SUPABASE_DATA, error: null })
      await useExerciseStoreBase.getState().initialize()
      localId = Object.keys(useExerciseStoreBase.getState().exercises)[0]
      detailId =
        useExerciseStoreBase.getState().exercises[localId].exercises[0].id
    })

    it('updates a specific exercise detail completed status and selectedSets', () => {
      const selectedSets = [true, true, true, true]
      useExerciseStoreBase
        .getState()
        .completeExerciseDetail(localId, detailId, true, selectedSets)

      const detail = useExerciseStoreBase
        .getState()
        .exercises[localId].exercises.find((d) => d.id === detailId)
      expect(detail?.completed).toBe(true)
      expect(detail?.selectedSets).toEqual(selectedSets)
    })

    it('sets parent exercise synced=false', () => {
      useExerciseStoreBase
        .getState()
        .completeExerciseDetail(localId, detailId, true, [
          true,
          true,
          true,
          true,
        ])

      const exercise = useExerciseStoreBase.getState().exercises[localId]
      expect(exercise.synced).toBe(false)
    })

    it('does nothing if exerciseLocalId does not exist', () => {
      const before = useExerciseStoreBase.getState().exercises
      useExerciseStoreBase
        .getState()
        .completeExerciseDetail('non-existent', detailId, true, [true])
      const after = useExerciseStoreBase.getState().exercises

      expect(after).toBe(before)
    })
  })

  describe('getSelectedSets()', () => {
    it('returns selectedSets for a valid exercise+detail', async () => {
      mockSupabaseSelect({ data: MOCK_SUPABASE_DATA, error: null })
      await useExerciseStoreBase.getState().initialize()

      const localId = Object.keys(useExerciseStoreBase.getState().exercises)[0]
      const detailId =
        useExerciseStoreBase.getState().exercises[localId].exercises[0].id
      const sets = useExerciseStoreBase
        .getState()
        .getSelectedSets(localId, detailId)

      expect(Array.isArray(sets)).toBe(true)
      expect(sets.length).toBeGreaterThan(0)
    })

    it('returns empty array for non-existent exercise', () => {
      const sets = useExerciseStoreBase
        .getState()
        .getSelectedSets('non-existent', '1')
      expect(sets).toEqual([])
    })
  })

  describe('getExercise()', () => {
    it('returns exercise for valid localId', async () => {
      mockSupabaseSelect({ data: MOCK_SUPABASE_DATA, error: null })
      await useExerciseStoreBase.getState().initialize()

      const localId = Object.keys(useExerciseStoreBase.getState().exercises)[0]
      const exercise = useExerciseStoreBase.getState().getExercise(localId)

      expect(exercise).toBeDefined()
      expect(exercise?.localId).toBe(localId)
    })

    it('returns undefined for non-existent localId', () => {
      const exercise = useExerciseStoreBase
        .getState()
        .getExercise('non-existent')
      expect(exercise).toBeUndefined()
    })
  })

  describe('getDetail()', () => {
    it('returns exercise details array for valid localId', async () => {
      mockSupabaseSelect({ data: MOCK_SUPABASE_DATA, error: null })
      await useExerciseStoreBase.getState().initialize()

      const localId = Object.keys(useExerciseStoreBase.getState().exercises)[0]
      const details = useExerciseStoreBase.getState().getDetail(localId)

      expect(Array.isArray(details)).toBe(true)
      expect(details.length).toBeGreaterThan(0)
    })

    it('returns empty array for non-existent localId', () => {
      const details = useExerciseStoreBase.getState().getDetail('non-existent')
      expect(details).toEqual([])
    })
  })

  describe('sync()', () => {
    it('calls supabase update for unsynced exercises and marks them synced', async () => {
      mockSupabaseSelect({ data: MOCK_SUPABASE_DATA, error: null })
      await useExerciseStoreBase.getState().initialize()

      const localId = Object.keys(useExerciseStoreBase.getState().exercises)[0]
      useExerciseStoreBase.getState().completeExercise(localId)
      expect(useExerciseStoreBase.getState().exercises[localId].synced).toBe(
        false,
      )

      mockSupabaseUpdate({ data: [], error: null })
      await useExerciseStoreBase.getState().sync()

      expect(useExerciseStoreBase.getState().exercises[localId].synced).toBe(
        true,
      )
      expect(supabase.from).toHaveBeenCalledWith('exercises')
    })

    it('skips already-synced exercises', async () => {
      mockSupabaseSelect({ data: MOCK_SUPABASE_DATA, error: null })
      await useExerciseStoreBase.getState().initialize()

      const mockedSupabase = jest.mocked(supabase)
      mockedSupabase.from.mockClear()

      await useExerciseStoreBase.getState().sync()

      expect(mockedSupabase.from).not.toHaveBeenCalled()
    })
  })
})

describe('useExerciseStore hook', () => {
  beforeEach(() => {
    useExerciseStoreBase.setState(initialState)
  })

  it('calls initialize on mount', async () => {
    mockSupabaseSelect({ data: MOCK_SUPABASE_DATA, error: null })

    const { result } = renderHook(() => useExerciseStore())

    await waitFor(() => {
      expect(result.current.initialized).toBe(true)
    })

    expect(Object.keys(result.current.exercises).length).toBe(2)
  })

  it('returns correct completedCount', async () => {
    mockSupabaseSelect({ data: MOCK_SUPABASE_DATA, error: null })

    const { result } = renderHook(() => useExerciseStore())

    await waitFor(() => {
      expect(result.current.initialized).toBe(true)
    })

    expect(result.current.completedCount).toBe(0)

    const localId = Object.keys(result.current.exercises)[0]
    act(() => {
      result.current.completeExercise(localId)
    })

    expect(result.current.completedCount).toBe(1)
  })

  it('returns correct activeExercises and completedExercises', async () => {
    mockSupabaseSelect({ data: MOCK_SUPABASE_DATA, error: null })

    const { result } = renderHook(() => useExerciseStore())

    await waitFor(() => {
      expect(result.current.initialized).toBe(true)
    })

    expect(result.current.activeExercises).toHaveLength(2)
    expect(result.current.completedExercises).toHaveLength(0)

    const localId = Object.keys(result.current.exercises)[0]
    act(() => {
      result.current.completeExercise(localId)
    })

    expect(result.current.activeExercises).toHaveLength(1)
    expect(result.current.completedExercises).toHaveLength(1)
  })

  it('exposes all action methods', async () => {
    mockSupabaseSelect({ data: MOCK_SUPABASE_DATA, error: null })

    const { result } = renderHook(() => useExerciseStore())

    await waitFor(() => {
      expect(result.current.initialized).toBe(true)
    })

    expect(typeof result.current.initialize).toBe('function')
    expect(typeof result.current.completeExercise).toBe('function')
    expect(typeof result.current.completeExerciseDetail).toBe('function')
    expect(typeof result.current.getSelectedSets).toBe('function')
    expect(typeof result.current.getExercise).toBe('function')
    expect(typeof result.current.getDetail).toBe('function')
    expect(typeof result.current.sync).toBe('function')
  })

  it('returns loading and error state', async () => {
    mockSupabaseSelect({ data: MOCK_SUPABASE_DATA, error: null })

    const { result } = renderHook(() => useExerciseStore())

    // After initialization completes, loading should be false
    await waitFor(() => {
      expect(result.current.initialized).toBe(true)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })
})
