import type { WorkoutSession, WorkoutTemplate } from '@/types/models'

import { commitWorkout } from '../index'

// ─── Fixtures ────────────────────────────────────────────────────────

const FIXED_NOW = new Date('2024-01-15T10:30:00.000Z')
const STARTED_AT = new Date('2024-01-15T10:00:00.000Z') // 30 min before FIXED_NOW

const TEMPLATE: WorkoutTemplate = {
  id: 'template-1',
  day: '1',
  week: '1',
  title: 'Push Day',
  videoURL: null,
  cardio: { morning: 30, evening: 20 },
  exercises: [
    { id: 'bench', title: 'Bench Press', sets: 3, reps: 10, variation: null },
    { id: 'press', title: 'OHP', sets: 3, reps: 8, variation: null },
  ],
  color: 'hsl(200, 50%, 87.5%)',
}

// All sets completed: bench @60kg×10, press @40kg×8; 50 min cardio (30+20)
// Volume: bench=3×60×10=1800, press=3×40×8=960, total=2760
const SESSION: WorkoutSession = {
  id: 'session-1',
  templateId: 'template-1',
  startedAt: STARTED_AT.toISOString(),
  completedAt: null,
  exerciseProgress: {
    bench: {
      detailId: 'bench',
      selectedSets: [true, true, true],
      weightPerSet: [60, 60, 60],
    },
    press: {
      detailId: 'press',
      selectedSets: [true, true, true],
      weightPerSet: [40, 40, 40],
    },
  },
  cardio: { morning: 30, evening: 20 },
  cardioCompleted: { morning: false, evening: false },
  status: 'in-progress',
}

function makeInsert(error: { message: string } | null = null) {
  return jest.fn(async () => ({ error }))
}

// ─── Tests ────────────────────────────────────────────────────────────

describe('commitWorkout()', () => {
  describe('1. payload shape', () => {
    it('builds a payload with all required fields and returns committed', async () => {
      const insert = makeInsert()

      const outcome = await commitWorkout(SESSION, TEMPLATE, {
        insertWorkoutSession: insert,
        saveCardioWorkout: jest.fn(async () => true),
        now: () => FIXED_NOW,
      })

      expect(outcome.kind).toBe('committed')
      if (outcome.kind !== 'committed') return

      expect(outcome.payload).toMatchObject({
        exercise_day: '1',
        exercise_week: '1',
        title: 'Push Day',
        started_at: STARTED_AT.toISOString(),
        completed_at: FIXED_NOW.toISOString(),
        duration_seconds: 1800, // 30 min = 1800 s
        total_volume_kg: 2760,
        sets_completed: 6,
        total_sets: 6,
        exercises_completed: 2,
        total_exercises: 2,
        cardio_minutes: 50,
      })
    })
  })

  describe('2. calls insertWorkoutSession exactly once', () => {
    it('calls the injected insert adapter with the validated payload', async () => {
      const insert = makeInsert()

      await commitWorkout(SESSION, TEMPLATE, {
        insertWorkoutSession: insert,
        saveCardioWorkout: jest.fn(async () => true),
        now: () => FIXED_NOW,
      })

      expect(insert).toHaveBeenCalledTimes(1)
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Push Day', cardio_minutes: 50 }),
      )
    })
  })

  describe('3. cardio mirror when minutes > 0', () => {
    it('calls saveCardioWorkout with correct durationMinutes, startDate, endDate', async () => {
      const saveCardio = jest.fn(async () => true)

      await commitWorkout(SESSION, TEMPLATE, {
        insertWorkoutSession: makeInsert(),
        saveCardioWorkout: saveCardio,
        now: () => FIXED_NOW,
      })

      const expectedEnd = FIXED_NOW
      const expectedStart = new Date(FIXED_NOW.getTime() - 50 * 60_000)

      expect(saveCardio).toHaveBeenCalledTimes(1)
      expect(saveCardio).toHaveBeenCalledWith({
        durationMinutes: 50,
        startDate: expectedStart,
        endDate: expectedEnd,
      })
    })
  })

  describe('4. no cardio mirror when minutes === 0', () => {
    it('does NOT call saveCardioWorkout when session has no cardio', async () => {
      const noCardioSession: WorkoutSession = {
        ...SESSION,
        cardio: { morning: 0, evening: 0 },
      }
      const saveCardio = jest.fn(async () => true)

      await commitWorkout(noCardioSession, TEMPLATE, {
        insertWorkoutSession: makeInsert(),
        saveCardioWorkout: saveCardio,
        now: () => FIXED_NOW,
      })

      expect(saveCardio).not.toHaveBeenCalled()
    })
  })

  describe('5. HealthKit failure is best-effort', () => {
    it('still returns committed even when saveCardioWorkout rejects', async () => {
      const saveCardio = jest.fn(async () => {
        throw new Error('HealthKit unavailable')
      })

      const outcome = await commitWorkout(SESSION, TEMPLATE, {
        insertWorkoutSession: makeInsert(),
        saveCardioWorkout: saveCardio,
        now: () => FIXED_NOW,
      })

      expect(outcome.kind).toBe('committed')
    })
  })

  describe('6. Supabase error response', () => {
    it('returns persistence-failed and does NOT call saveCardioWorkout', async () => {
      const saveCardio = jest.fn(async () => true)
      const insert = makeInsert({ message: 'oops' })

      const outcome = await commitWorkout(SESSION, TEMPLATE, {
        insertWorkoutSession: insert,
        saveCardioWorkout: saveCardio,
        now: () => FIXED_NOW,
      })

      expect(outcome).toEqual({ kind: 'persistence-failed', error: 'oops' })
      expect(saveCardio).not.toHaveBeenCalled()
    })
  })

  describe('7. Supabase throws', () => {
    it('returns persistence-failed with the thrown message', async () => {
      const insert = jest.fn(async () => {
        throw new Error('network timeout')
      })

      const outcome = await commitWorkout(SESSION, TEMPLATE, {
        insertWorkoutSession: insert,
        saveCardioWorkout: jest.fn(async () => true),
        now: () => FIXED_NOW,
      })

      expect(outcome).toEqual({
        kind: 'persistence-failed',
        error: 'network timeout',
      })
    })
  })

  describe('8. Zod validation failure', () => {
    it('returns invalid and does NOT call insert or saveCardioWorkout when payload fails zod', async () => {
      // cardio_minutes: 1.5 fails z.number().int()
      const invalidSession: WorkoutSession = {
        ...SESSION,
        cardio: { morning: 1.5, evening: 0 },
      }
      const insert = makeInsert()
      const saveCardio = jest.fn(async () => true)

      const outcome = await commitWorkout(invalidSession, TEMPLATE, {
        insertWorkoutSession: insert,
        saveCardioWorkout: saveCardio,
        now: () => FIXED_NOW,
      })

      expect(outcome.kind).toBe('invalid')
      if (outcome.kind !== 'invalid') return
      expect(outcome.issues.length).toBeGreaterThan(0)
      expect(insert).not.toHaveBeenCalled()
      expect(saveCardio).not.toHaveBeenCalled()
    })
  })
})
