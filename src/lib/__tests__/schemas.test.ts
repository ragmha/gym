import {
  ExerciseDefinitionRowSchema,
  UserProgressRowSchema,
  WorkoutDayRowSchema,
  WorkoutDayWithExercisesSchema,
  toClientWorkoutDay,
  type TransformDeps,
} from '../schemas'

// ─── WorkoutDayRowSchema ────────────────────────────────────────────

describe('WorkoutDayRowSchema', () => {
  const validRow = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    day: 1,
    week: 1,
    title: 'Quads, Lower Abs & Calves',
    video_url: 'https://www.youtube.com/embed/P7ak9G2A8to',
    cardio_morning: 20,
    cardio_evening: 20,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  }

  it('accepts a valid workout day row', () => {
    const result = WorkoutDayRowSchema.safeParse(validRow)
    expect(result.success).toBe(true)
  })

  it('accepts null video_url', () => {
    const result = WorkoutDayRowSchema.safeParse({
      ...validRow,
      video_url: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing title', () => {
    const { title, ...noTitle } = validRow
    const result = WorkoutDayRowSchema.safeParse(noTitle)
    expect(result.success).toBe(false)
  })

  it('rejects non-integer day', () => {
    const result = WorkoutDayRowSchema.safeParse({ ...validRow, day: 'one' })
    expect(result.success).toBe(false)
  })

  it('rejects missing id', () => {
    const { id, ...noId } = validRow
    const result = WorkoutDayRowSchema.safeParse(noId)
    expect(result.success).toBe(false)
  })
})

// ─── ExerciseDefinitionRowSchema ────────────────────────────────────

describe('ExerciseDefinitionRowSchema', () => {
  const validRow = {
    id: '660e8400-e29b-41d4-a716-446655440001',
    workout_day_id: '550e8400-e29b-41d4-a716-446655440000',
    sort_order: 1,
    title: 'Hack Squats',
    sets: 3,
    is_amrap: false,
    reps: 15,
    variation: '1.5 rep variation',
  }

  it('accepts a valid exercise definition row', () => {
    const result = ExerciseDefinitionRowSchema.safeParse(validRow)
    expect(result.success).toBe(true)
  })

  it('accepts null variation', () => {
    const result = ExerciseDefinitionRowSchema.safeParse({
      ...validRow,
      variation: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects is_amrap as string', () => {
    const result = ExerciseDefinitionRowSchema.safeParse({
      ...validRow,
      is_amrap: 'yes',
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative reps', () => {
    const result = ExerciseDefinitionRowSchema.safeParse({
      ...validRow,
      reps: -1,
    })
    expect(result.success).toBe(false)
  })
})

// ─── UserProgressRowSchema ──────────────────────────────────────────

describe('UserProgressRowSchema', () => {
  const validRow = {
    id: '770e8400-e29b-41d4-a716-446655440002',
    user_id: '880e8400-e29b-41d4-a716-446655440003',
    exercise_id: '660e8400-e29b-41d4-a716-446655440001',
    completed: false,
    sets_completed: [true, false, true],
    completed_at: null,
  }

  it('accepts a valid user progress row', () => {
    const result = UserProgressRowSchema.safeParse(validRow)
    expect(result.success).toBe(true)
  })

  it('accepts empty sets_completed array', () => {
    const result = UserProgressRowSchema.safeParse({
      ...validRow,
      sets_completed: [],
    })
    expect(result.success).toBe(true)
  })

  it('accepts a timestamp for completed_at', () => {
    const result = UserProgressRowSchema.safeParse({
      ...validRow,
      completed_at: '2025-06-01T12:00:00Z',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-boolean in sets_completed', () => {
    const result = UserProgressRowSchema.safeParse({
      ...validRow,
      sets_completed: [1, 0, 1],
    })
    expect(result.success).toBe(false)
  })
})

// ─── WorkoutDayWithExercisesSchema (joined query) ───────────────────

describe('WorkoutDayWithExercisesSchema', () => {
  const validJoined = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    day: 1,
    week: 1,
    title: 'Quads, Lower Abs & Calves',
    video_url: 'https://www.youtube.com/embed/P7ak9G2A8to',
    cardio_morning: 20,
    cardio_evening: 20,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    exercise_definitions: [
      {
        id: '660e8400-e29b-41d4-a716-446655440001',
        workout_day_id: '550e8400-e29b-41d4-a716-446655440000',
        sort_order: 1,
        title: 'Hack Squats',
        sets: 3,
        is_amrap: false,
        reps: 15,
        variation: '1.5 rep variation',
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440002',
        workout_day_id: '550e8400-e29b-41d4-a716-446655440000',
        sort_order: 2,
        title: 'Walking Forward Lunges',
        sets: 1,
        is_amrap: true,
        reps: 10,
        variation: null,
      },
    ],
  }

  it('accepts a valid joined row', () => {
    const result = WorkoutDayWithExercisesSchema.safeParse(validJoined)
    expect(result.success).toBe(true)
  })

  it('accepts empty exercise_definitions', () => {
    const result = WorkoutDayWithExercisesSchema.safeParse({
      ...validJoined,
      exercise_definitions: [],
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing exercise_definitions key', () => {
    const { exercise_definitions, ...noExercises } = validJoined
    const result = WorkoutDayWithExercisesSchema.safeParse(noExercises)
    expect(result.success).toBe(false)
  })
})

// ─── toClientWorkoutDay (transform) ─────────────────────────────────

describe('toClientWorkoutDay', () => {
  let callCount = 0
  const testDeps: TransformDeps = {
    generateId: () => `local-${++callCount}`,
    generateColor: () => 'hsl(200, 50%, 87.5%)',
  }

  beforeEach(() => {
    callCount = 0
  })

  const row = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    day: 3,
    week: 2,
    title: 'Arms',
    video_url: 'https://youtube.com/embed/abc',
    cardio_morning: 25,
    cardio_evening: 25,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    exercise_definitions: [
      {
        id: 'def-2',
        workout_day_id: '550e8400-e29b-41d4-a716-446655440000',
        sort_order: 2,
        title: 'Curls',
        sets: 3,
        is_amrap: false,
        reps: 12,
        variation: null,
      },
      {
        id: 'def-1',
        workout_day_id: '550e8400-e29b-41d4-a716-446655440000',
        sort_order: 1,
        title: 'Tricep Pushdown',
        sets: 1,
        is_amrap: true,
        reps: 15,
        variation: 'Drop Set',
      },
    ],
  }

  it('maps DB row to client workout day', () => {
    const result = toClientWorkoutDay(row, testDeps)

    expect(result.id).toBe(row.id)
    expect(result.day).toBe(3)
    expect(result.week).toBe(2)
    expect(result.title).toBe('Arms')
    expect(result.videoURL).toBe('https://youtube.com/embed/abc')
    expect(result.cardio).toEqual({ morning: 25, evening: 25 })
    expect(result.date).toBe('Week 2 · Day 3')
    expect(result.completed).toBe(false)
    expect(result.synced).toBe(true)
    expect(result.localId).toBe('local-1')
    expect(result.color).toBe('hsl(200, 50%, 87.5%)')
  })

  it('sorts exercises by sort_order', () => {
    const result = toClientWorkoutDay(row, testDeps)

    expect(result.exercises[0].title).toBe('Tricep Pushdown')
    expect(result.exercises[1].title).toBe('Curls')
  })

  it('initializes selectedSets array with correct length', () => {
    const result = toClientWorkoutDay(row, testDeps)

    // First exercise: is_amrap=true, sets=1 → length 1
    expect(result.exercises[0].selectedSets).toEqual([false])
    // Second exercise: sets=3 → length 3
    expect(result.exercises[1].selectedSets).toEqual([false, false, false])
  })

  it('sets all exercise details as not completed', () => {
    const result = toClientWorkoutDay(row, testDeps)

    result.exercises.forEach((ex) => {
      expect(ex.completed).toBe(false)
    })
  })

  it('preserves is_amrap flag', () => {
    const result = toClientWorkoutDay(row, testDeps)

    expect(result.exercises[0].is_amrap).toBe(true)
    expect(result.exercises[1].is_amrap).toBe(false)
  })

  it('handles null video_url', () => {
    const result = toClientWorkoutDay({ ...row, video_url: null }, testDeps)
    expect(result.videoURL).toBeNull()
  })

  it('handles empty exercise_definitions', () => {
    const result = toClientWorkoutDay(
      { ...row, exercise_definitions: [] },
      testDeps,
    )
    expect(result.exercises).toEqual([])
  })

  it('generates unique localIds across calls', () => {
    const a = toClientWorkoutDay(row, testDeps)
    const b = toClientWorkoutDay(row, testDeps)
    expect(a.localId).not.toBe(b.localId)
  })
})
