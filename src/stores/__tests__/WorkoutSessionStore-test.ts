import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import { supabase } from '@/lib/supabase'
import type { WorkoutTemplate } from '@/types/models'

jest.mock('@/lib/healthSnapshot/HealthSnapshotSource', () => ({
  healthSnapshot: {
    saveCardioWorkout: jest.fn(async () => true),
  },
}))

const {
  completedSetCount,
  totalSetCount,
  totalVolumeKg,
  useWorkoutSessionStoreBase,
} = jest.requireActual<typeof import('@/stores/WorkoutSessionStore')>(
  '@/stores/WorkoutSessionStore',
)

const TEMPLATE: WorkoutTemplate = {
  id: 'a0000000-0000-4000-8000-000000000001',
  day: '1',
  week: '1',
  title: 'Push Day',
  videoURL: 'https://example.com/video',
  cardio: { morning: 30, evening: 20 },
  color: 'hsl(200, 50%, 87.5%)',
  exercises: [
    { id: 'bench', title: 'Bench Press', sets: 4, reps: 12, variation: null },
    {
      id: 'press',
      title: 'Shoulder Press',
      sets: 3,
      reps: 10,
      variation: 'Dumbbell',
    },
  ],
}

function mockWorkoutSessionInsert() {
  const insert = jest.fn(async () => ({ data: [], error: null }))
  jest.mocked(supabase).from.mockReturnValue({ insert } as any)
  return insert
}

beforeEach(() => {
  jest.clearAllMocks()
  useWorkoutSessionStoreBase.setState({ sessions: {} })
})

describe('WorkoutSessionStore', () => {
  describe('startSession()', () => {
    it('starts an in-progress session with empty progress copied from the template', () => {
      const session = useWorkoutSessionStoreBase
        .getState()
        .startSession(TEMPLATE)

      expect(session.status).toBe('in-progress')
      expect(session.templateId).toBe(TEMPLATE.id)
      expect(new Date(session.startedAt).toString()).not.toBe('Invalid Date')
      expect(session.completedAt).toBeNull()
      expect(session.cardio).toEqual(TEMPLATE.cardio)
      expect(completedSetCount(session)).toBe(0)
      expect(session.exerciseProgress.bench.selectedSets).toEqual([
        false,
        false,
        false,
        false,
      ])
      expect(session.exerciseProgress.bench.weightPerSet).toEqual([0, 0, 0, 0])
      expect(session.exerciseProgress.press.selectedSets).toEqual([
        false,
        false,
        false,
      ])
      expect(session.exerciseProgress.press.weightPerSet).toEqual([0, 0, 0])
    })

    it('returns the active session for the same template without overwriting progress', () => {
      const first = useWorkoutSessionStoreBase.getState().startSession(TEMPLATE)
      useWorkoutSessionStoreBase.setState((state) => ({
        sessions: {
          ...state.sessions,
          [first.id]: {
            ...state.sessions[first.id],
            exerciseProgress: {
              ...state.sessions[first.id].exerciseProgress,
              bench: {
                ...state.sessions[first.id].exerciseProgress.bench,
                selectedSets: [true, false, false, false],
              },
            },
          },
        },
      }))

      const second = useWorkoutSessionStoreBase
        .getState()
        .startSession(TEMPLATE)

      expect(second.id).toBe(first.id)
      expect(
        Object.values(useWorkoutSessionStoreBase.getState().sessions),
      ).toHaveLength(1)
      expect(second.exerciseProgress.bench.selectedSets).toEqual([
        true,
        false,
        false,
        false,
      ])
    })
  })

  describe('toggleSet()', () => {
    it('flips just the requested set bit', () => {
      const session = useWorkoutSessionStoreBase
        .getState()
        .startSession(TEMPLATE)

      useWorkoutSessionStoreBase.getState().toggleSet(session.id, 'bench', 2)

      const updated = useWorkoutSessionStoreBase.getState().sessions[session.id]
      expect(updated.exerciseProgress.bench.selectedSets).toEqual([
        false,
        false,
        true,
        false,
      ])
      expect(updated.exerciseProgress.press.selectedSets).toEqual([
        false,
        false,
        false,
      ])
    })
  })

  describe('setWeightForExercise()', () => {
    it('writes the same weight to every set of that exercise', () => {
      const session = useWorkoutSessionStoreBase
        .getState()
        .startSession(TEMPLATE)

      useWorkoutSessionStoreBase
        .getState()
        .setWeightForExercise(session.id, 'bench', 50)

      const updated = useWorkoutSessionStoreBase.getState().sessions[session.id]
      expect(updated.exerciseProgress.bench.weightPerSet).toEqual([
        50, 50, 50, 50,
      ])
      expect(updated.exerciseProgress.press.weightPerSet).toEqual([0, 0, 0])
    })
  })

  describe('updateCardio()', () => {
    it('updates the session cardio', () => {
      const session = useWorkoutSessionStoreBase
        .getState()
        .startSession(TEMPLATE)

      useWorkoutSessionStoreBase
        .getState()
        .updateCardio(session.id, { morning: 25, evening: 0 })

      expect(
        useWorkoutSessionStoreBase.getState().sessions[session.id].cardio,
      ).toEqual({ morning: 25, evening: 0 })
    })
  })

  describe('set count selectors', () => {
    it('counts completed and total sets across the session', () => {
      const session = useWorkoutSessionStoreBase
        .getState()
        .startSession(TEMPLATE)
      useWorkoutSessionStoreBase.getState().toggleSet(session.id, 'bench', 0)
      useWorkoutSessionStoreBase.getState().toggleSet(session.id, 'press', 2)

      const updated = useWorkoutSessionStoreBase.getState().sessions[session.id]
      expect(completedSetCount(updated)).toBe(2)
      expect(totalSetCount(updated)).toBe(7)
    })
  })

  describe('totalVolumeKg()', () => {
    it('sums weight times reps for completed sets using session overrides when present', () => {
      const session = useWorkoutSessionStoreBase
        .getState()
        .startSession(TEMPLATE)
      useWorkoutSessionStoreBase
        .getState()
        .setWeightForExercise(session.id, 'bench', 50)
      useWorkoutSessionStoreBase
        .getState()
        .setWeightForExercise(session.id, 'press', 20)
      useWorkoutSessionStoreBase.getState().toggleSet(session.id, 'bench', 0)
      useWorkoutSessionStoreBase.getState().toggleSet(session.id, 'bench', 2)
      useWorkoutSessionStoreBase.setState((state) => ({
        sessions: {
          ...state.sessions,
          [session.id]: {
            ...state.sessions[session.id],
            exerciseProgress: {
              ...state.sessions[session.id].exerciseProgress,
              bench: {
                ...state.sessions[session.id].exerciseProgress.bench,
                repsOverride: 8,
              },
            },
          },
        },
      }))

      const updated = useWorkoutSessionStoreBase.getState().sessions[session.id]
      expect(totalVolumeKg(updated, TEMPLATE)).toBe(800)
    })
  })

  describe('complete()', () => {
    it('inserts workout session metrics and marks the session complete', async () => {
      const insert = mockWorkoutSessionInsert()
      const session = useWorkoutSessionStoreBase
        .getState()
        .startSession(TEMPLATE)
      useWorkoutSessionStoreBase
        .getState()
        .setWeightForExercise(session.id, 'bench', 50)
      useWorkoutSessionStoreBase.getState().toggleSet(session.id, 'bench', 0)
      useWorkoutSessionStoreBase.getState().toggleSet(session.id, 'bench', 1)
      useWorkoutSessionStoreBase
        .getState()
        .updateCardio(session.id, { morning: 0, evening: 0 })

      await useWorkoutSessionStoreBase.getState().complete(session.id)

      expect(supabase.from).toHaveBeenCalledWith('workout_sessions')
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          exercise_day: TEMPLATE.day,
          exercise_week: TEMPLATE.week,
          title: TEMPLATE.title,
          started_at: session.startedAt,
          total_volume_kg: 1200,
          sets_completed: 2,
          total_sets: 7,
          exercises_completed: 0,
          total_exercises: 2,
          cardio_minutes: 0,
        }),
      )
      const completed =
        useWorkoutSessionStoreBase.getState().sessions[session.id]
      expect(completed.status).toBe('complete')
      expect(completed.completedAt).not.toBeNull()
      expect(healthSnapshot.saveCardioWorkout).not.toHaveBeenCalled()
    })

    it('saves a cardio workout when the completed session has cardio minutes', async () => {
      mockWorkoutSessionInsert()
      const session = useWorkoutSessionStoreBase
        .getState()
        .startSession(TEMPLATE)

      await useWorkoutSessionStoreBase.getState().complete(session.id)

      expect(healthSnapshot.saveCardioWorkout).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMinutes: 50,
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
      )
    })

    it('is idempotent and writes only once', async () => {
      const insert = mockWorkoutSessionInsert()
      const session = useWorkoutSessionStoreBase
        .getState()
        .startSession(TEMPLATE)

      await useWorkoutSessionStoreBase.getState().complete(session.id)
      await useWorkoutSessionStoreBase.getState().complete(session.id)

      expect(insert).toHaveBeenCalledTimes(1)
      expect(healthSnapshot.saveCardioWorkout).toHaveBeenCalledTimes(1)
    })

    it('leaves the session in-progress when the Supabase insert errors so the next attempt can retry', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      const insert = jest.fn(async () => ({
        data: null,
        error: { message: 'network error' },
      }))
      jest.mocked(supabase).from.mockReturnValue({ insert } as any)

      const session = useWorkoutSessionStoreBase
        .getState()
        .startSession(TEMPLATE)

      await useWorkoutSessionStoreBase.getState().complete(session.id)

      const after = useWorkoutSessionStoreBase.getState().sessions[session.id]
      expect(after.status).toBe('in-progress')
      expect(after.completedAt).toBeNull()

      // Caller can retry; the next call should attempt the insert again
      const retryInsert = mockWorkoutSessionInsert()
      await useWorkoutSessionStoreBase.getState().complete(session.id)
      expect(retryInsert).toHaveBeenCalledTimes(1)
      expect(
        useWorkoutSessionStoreBase.getState().sessions[session.id].status,
      ).toBe('complete')

      consoleWarnSpy.mockRestore()
    })

    it('leaves the session in-progress when the Supabase insert throws', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      const insert = jest.fn(async () => {
        throw new Error('boom')
      })
      jest.mocked(supabase).from.mockReturnValue({ insert } as any)

      const session = useWorkoutSessionStoreBase
        .getState()
        .startSession(TEMPLATE)

      await useWorkoutSessionStoreBase.getState().complete(session.id)

      const after = useWorkoutSessionStoreBase.getState().sessions[session.id]
      expect(after.status).toBe('in-progress')
      expect(after.completedAt).toBeNull()
      expect(healthSnapshot.saveCardioWorkout).not.toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })
  })
})
