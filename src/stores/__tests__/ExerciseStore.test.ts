import { useExerciseStore } from '../ExerciseStore'
import { supabase } from '@/lib/supabase'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

// Mock bundled exercises
jest.mock('@/data/exercises.json', () => [
  {
    id: 'bundled-1',
    day: 1,
    week: 1,
    title: 'Bundled Workout',
    videoURL: 'https://example.com/video',
    cardio: { morning: 10, evening: 10 },
    exercises: [
      {
        id: 'bundled-ex-1',
        title: 'Bundled Exercise',
        sets: 3,
        reps: 12,
        variation: null,
      },
    ],
  },
])

// Mock dependencies
jest.mock('react-native-get-random-values', () => ({}))
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}))
jest.mock('@/utils/getRandomPastelColor', () => ({
  getRandomPastelColor: () => 'hsl(200, 50%, 87.5%)',
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('ExerciseStore', () => {
  beforeEach(() => {
    // Reset store state using Zustand's setState API
    useExerciseStore.setState(
      {
        exercises: {},
        error: null,
        loading: false,
        initialized: false,
      },
      true, // Replace the entire state
    )
    jest.clearAllMocks()
  })

  describe('initialize', () => {
    it('fetches normalized data successfully', async () => {
      const mockData = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          day: 1,
          week: 1,
          title: 'Test Workout',
          video_url: 'https://example.com/video',
          cardio_morning: 20,
          cardio_evening: 20,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          exercise_definitions: [
            {
              id: '660e8400-e29b-41d4-a716-446655440001',
              workout_day_id: '550e8400-e29b-41d4-a716-446655440000',
              sort_order: 1,
              title: 'Test Exercise',
              sets: 3,
              is_amrap: false,
              reps: 12,
              variation: null,
            },
          ],
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockData,
            error: null,
          }),
        }),
      } as any)

      const { initialize } = useExerciseStore.getState()
      await initialize()

      const state = useExerciseStore.getState()
      expect(state.initialized).toBe(true)
      expect(state.error).toBeNull()
      expect(Object.keys(state.exercises).length).toBeGreaterThan(0)
      expect(state.loading).toBe(false)
    })

    it('falls back to legacy table when normalized fetch fails', async () => {
      const mockLegacyData = [
        {
          id: 'legacy-1',
          day: 1,
          week: 1,
          title: 'Legacy Workout',
          videoURL: 'https://example.com/video',
          cardio: { morning: 15, evening: 15 },
          exercises: [
            {
              id: 'legacy-ex-1',
              title: 'Legacy Exercise',
              sets: 3,
              reps: 10,
              variation: null,
            },
          ],
        },
      ]

      // First call (normalized) fails, second call (legacy) succeeds
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Table not found' },
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            data: mockLegacyData,
            error: null,
          }),
        } as any)

      const { initialize } = useExerciseStore.getState()
      await initialize()

      const state = useExerciseStore.getState()
      expect(state.initialized).toBe(true)
      expect(state.error).toBeNull()
      expect(Object.keys(state.exercises).length).toBeGreaterThan(0)
    })

    it('falls back to bundled exercises when both normalized and legacy fail', async () => {
      // Both normalized and legacy fetches fail
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Table not found' },
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Legacy table not found' },
          }),
        } as any)

      const { initialize } = useExerciseStore.getState()
      await initialize()

      const state = useExerciseStore.getState()
      expect(state.initialized).toBe(true)
      expect(state.error).toBe('Legacy table not found')
      expect(Object.keys(state.exercises).length).toBeGreaterThan(0)
    })

    it('falls back to bundled exercises when normalized data is empty', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      } as any)

      const { initialize } = useExerciseStore.getState()
      await initialize()

      const state = useExerciseStore.getState()
      expect(state.initialized).toBe(true)
      expect(state.error).toBeNull()
      expect(Object.keys(state.exercises).length).toBeGreaterThan(0)
    })

    it('retries on network errors', async () => {
      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          throw new Error('Network error')
        }
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: '550e8400-e29b-41d4-a716-446655440000',
                  day: 1,
                  week: 1,
                  title: 'Test Workout',
                  video_url: null,
                  cardio_morning: 0,
                  cardio_evening: 0,
                  created_at: '2025-01-01T00:00:00Z',
                  updated_at: '2025-01-01T00:00:00Z',
                  exercise_definitions: [],
                },
              ],
              error: null,
            }),
          }),
        } as any
      })

      const { initialize } = useExerciseStore.getState()
      await initialize(3)

      expect(callCount).toBe(2)
      const state = useExerciseStore.getState()
      expect(state.initialized).toBe(true)
    })

    it('skips initialization if already initialized and not forced', async () => {
      useExerciseStore.setState({ initialized: true })

      const { initialize } = useExerciseStore.getState()
      await initialize()

      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('re-initializes when force is true', async () => {
      useExerciseStore.setState({ initialized: true })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      } as any)

      const { initialize } = useExerciseStore.getState()
      await initialize(3, true)

      expect(mockSupabase.from).toHaveBeenCalled()
    })

    it('clears error state on successful normalized fetch', async () => {
      useExerciseStore.setState({ error: 'Previous error' })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: '550e8400-e29b-41d4-a716-446655440000',
                day: 1,
                week: 1,
                title: 'Test',
                video_url: null,
                cardio_morning: 0,
                cardio_evening: 0,
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z',
                exercise_definitions: [],
              },
            ],
            error: null,
          }),
        }),
      } as any)

      const { initialize } = useExerciseStore.getState()
      await initialize()

      const state = useExerciseStore.getState()
      expect(state.error).toBeNull()
    })
  })

  describe('completeExercise', () => {
    it('marks an exercise as completed', () => {
      useExerciseStore.setState({
        exercises: {
          'local-1': {
            id: '1',
            localId: 'local-1',
            day: 1,
            week: 1,
            title: 'Test',
            videoURL: null,
            cardio: { morning: 0, evening: 0 },
            date: 'Week 1 · Day 1',
            color: 'hsl(200, 50%, 87.5%)',
            completed: false,
            exercises: [],
            synced: true,
          },
        },
      })

      const { completeExercise } = useExerciseStore.getState()
      completeExercise('local-1')

      const state = useExerciseStore.getState()
      expect(state.exercises['local-1'].completed).toBe(true)
      expect(state.exercises['local-1'].synced).toBe(false)
    })

    it('does nothing if exercise does not exist', () => {
      const initialState = {
        exercises: {},
        error: null,
        loading: false,
        initialized: true,
      }
      useExerciseStore.setState(initialState)

      const { completeExercise } = useExerciseStore.getState()
      completeExercise('non-existent')

      const state = useExerciseStore.getState()
      expect(state).toEqual(initialState)
    })
  })

  describe('completeExerciseDetail', () => {
    it('updates exercise detail completion status and selected sets', () => {
      useExerciseStore.setState({
        exercises: {
          'local-1': {
            id: '1',
            localId: 'local-1',
            day: 1,
            week: 1,
            title: 'Test',
            videoURL: null,
            cardio: { morning: 0, evening: 0 },
            date: 'Week 1 · Day 1',
            color: 'hsl(200, 50%, 87.5%)',
            completed: false,
            synced: true,
            exercises: [
              {
                id: 'ex-1',
                title: 'Exercise 1',
                sets: 3,
                is_amrap: false,
                reps: 12,
                variation: null,
                completed: false,
                selectedSets: [false, false, false],
              },
            ],
          },
        },
      })

      const { completeExerciseDetail } = useExerciseStore.getState()
      completeExerciseDetail('local-1', 'ex-1', true, [true, true, true])

      const state = useExerciseStore.getState()
      expect(state.exercises['local-1'].exercises[0].completed).toBe(true)
      expect(state.exercises['local-1'].exercises[0].selectedSets).toEqual([
        true,
        true,
        true,
      ])
      expect(state.exercises['local-1'].synced).toBe(false)
    })

    it('does nothing if exercise does not exist', () => {
      const initialState = {
        exercises: {},
        error: null,
        loading: false,
        initialized: true,
      }
      useExerciseStore.setState(initialState)

      const { completeExerciseDetail } = useExerciseStore.getState()
      completeExerciseDetail('non-existent', 'ex-1', true, [])

      const state = useExerciseStore.getState()
      expect(state).toEqual(initialState)
    })
  })

  describe('getSelectedSets', () => {
    it('returns selected sets for an exercise detail', () => {
      useExerciseStore.setState({
        exercises: {
          'local-1': {
            id: '1',
            localId: 'local-1',
            day: 1,
            week: 1,
            title: 'Test',
            videoURL: null,
            cardio: { morning: 0, evening: 0 },
            date: 'Week 1 · Day 1',
            color: 'hsl(200, 50%, 87.5%)',
            completed: false,
            synced: true,
            exercises: [
              {
                id: 'ex-1',
                title: 'Exercise 1',
                sets: 3,
                is_amrap: false,
                reps: 12,
                variation: null,
                completed: false,
                selectedSets: [true, false, true],
              },
            ],
          },
        },
      })

      const { getSelectedSets } = useExerciseStore.getState()
      const result = getSelectedSets('local-1', 'ex-1')

      expect(result).toEqual([true, false, true])
    })

    it('returns empty array if exercise does not exist', () => {
      useExerciseStore.setState({ exercises: {} })

      const { getSelectedSets } = useExerciseStore.getState()
      const result = getSelectedSets('non-existent', 'ex-1')

      expect(result).toEqual([])
    })

    it('returns empty array if detail does not exist', () => {
      useExerciseStore.setState({
        exercises: {
          'local-1': {
            id: '1',
            localId: 'local-1',
            day: 1,
            week: 1,
            title: 'Test',
            videoURL: null,
            cardio: { morning: 0, evening: 0 },
            date: 'Week 1 · Day 1',
            color: 'hsl(200, 50%, 87.5%)',
            completed: false,
            synced: true,
            exercises: [],
          },
        },
      })

      const { getSelectedSets } = useExerciseStore.getState()
      const result = getSelectedSets('local-1', 'non-existent')

      expect(result).toEqual([])
    })
  })

  describe('getExercise', () => {
    it('returns exercise by localId', () => {
      const exercise = {
        id: '1',
        localId: 'local-1',
        day: 1,
        week: 1,
        title: 'Test',
        videoURL: null,
        cardio: { morning: 0, evening: 0 },
        date: 'Week 1 · Day 1',
        color: 'hsl(200, 50%, 87.5%)',
        completed: false,
        synced: true,
        exercises: [],
      }
      useExerciseStore.setState({ exercises: { 'local-1': exercise } })

      const { getExercise } = useExerciseStore.getState()
      const result = getExercise('local-1')

      expect(result).toEqual(exercise)
    })

    it('returns undefined if exercise does not exist', () => {
      useExerciseStore.setState({ exercises: {} })

      const { getExercise } = useExerciseStore.getState()
      const result = getExercise('non-existent')

      expect(result).toBeUndefined()
    })
  })

  describe('getDetail', () => {
    it('returns exercise details array', () => {
      const exercises = [
        {
          id: 'ex-1',
          title: 'Exercise 1',
          sets: 3,
          is_amrap: false,
          reps: 12,
          variation: null,
          completed: false,
          selectedSets: [false, false, false],
        },
      ]
      useExerciseStore.setState({
        exercises: {
          'local-1': {
            id: '1',
            localId: 'local-1',
            day: 1,
            week: 1,
            title: 'Test',
            videoURL: null,
            cardio: { morning: 0, evening: 0 },
            date: 'Week 1 · Day 1',
            color: 'hsl(200, 50%, 87.5%)',
            completed: false,
            synced: true,
            exercises,
          },
        },
      })

      const { getDetail } = useExerciseStore.getState()
      const result = getDetail('local-1')

      expect(result).toEqual(exercises)
    })

    it('returns empty array if exercise does not exist', () => {
      useExerciseStore.setState({ exercises: {} })

      const { getDetail } = useExerciseStore.getState()
      const result = getDetail('non-existent')

      expect(result).toEqual([])
    })
  })

  describe('selectors', () => {
    beforeEach(() => {
      useExerciseStore.setState({
        exercises: {
          'local-1': {
            id: '1',
            localId: 'local-1',
            day: 1,
            week: 1,
            title: 'Completed',
            videoURL: null,
            cardio: { morning: 0, evening: 0 },
            date: 'Week 1 · Day 1',
            color: 'hsl(200, 50%, 87.5%)',
            completed: true,
            synced: true,
            exercises: [],
          },
          'local-2': {
            id: '2',
            localId: 'local-2',
            day: 2,
            week: 1,
            title: 'Active',
            videoURL: null,
            cardio: { morning: 0, evening: 0 },
            date: 'Week 1 · Day 2',
            color: 'hsl(200, 50%, 87.5%)',
            completed: false,
            synced: true,
            exercises: [],
          },
        },
      })
    })

    it('selectCompletedCount returns correct count', () => {
      const { selectCompletedCount } = require('../ExerciseStore')
      const state = useExerciseStore.getState()
      const count = selectCompletedCount(state)

      expect(count).toBe(1)
    })

    it('selectActiveExercises returns only active exercises', () => {
      const { selectActiveExercises } = require('../ExerciseStore')
      const state = useExerciseStore.getState()
      const active = selectActiveExercises(state)

      expect(active.length).toBe(1)
      expect(active[0].title).toBe('Active')
    })

    it('selectCompletedExercises returns only completed exercises', () => {
      const { selectCompletedExercises } = require('../ExerciseStore')
      const state = useExerciseStore.getState()
      const completed = selectCompletedExercises(state)

      expect(completed.length).toBe(1)
      expect(completed[0].title).toBe('Completed')
    })
  })
})
