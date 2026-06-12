import { computeWorkoutEfficiency } from '..'
import type { WorkoutSession, WorkoutTemplate } from '@/types/models'

function template(overrides: Partial<WorkoutTemplate> = {}): WorkoutTemplate {
  return {
    id: 'template-a',
    day: 'Day 1',
    week: 'Week 2',
    title: 'Upper Strength',
    videoURL: null,
    cardio: { morning: 0, evening: 10 },
    color: '#000000',
    exercises: [
      { id: 'bench', title: 'Bench Press', sets: 3, reps: 5, variation: null },
      { id: 'squat', title: 'Back Squat', sets: 2, reps: 8, variation: null },
    ],
    ...overrides,
  }
}

function session(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 'session-a',
    templateId: 'template-a',
    startedAt: '2026-06-10T10:00:00.000Z',
    completedAt: '2026-06-10T10:45:00.000Z',
    exerciseProgress: {
      bench: {
        detailId: 'bench',
        selectedSets: [true, false, true],
        weightPerSet: [100, 105, 110],
      },
      squat: {
        detailId: 'squat',
        selectedSets: [true, true],
        weightPerSet: [140],
      },
    },
    cardio: { morning: 0, evening: 10 },
    cardioCompleted: { morning: false, evening: true },
    status: 'complete',
    ...overrides,
  }
}

describe('computeWorkoutEfficiency', () => {
  it('computes volume, completion, density, and per-exercise metrics', () => {
    const result = computeWorkoutEfficiency(session(), template())

    expect(result.totalVolumeKg).toBe(2170)
    expect(result.completedSets).toBe(4)
    expect(result.totalSets).toBe(5)
    expect(result.completionRate).toBe(0.8)
    expect(result.durationMinutes).toBe(45)
    expect(result.sessionDensityKgPerMin).toBeCloseTo(48.22, 2)
    expect(result.perExercise).toEqual([
      {
        detailId: 'bench',
        title: 'Bench Press',
        volumeKg: 1050,
        completedSets: 2,
        totalSets: 3,
        topSetKg: 110,
      },
      {
        detailId: 'squat',
        title: 'Back Squat',
        volumeKg: 1120,
        completedSets: 2,
        totalSets: 2,
        topSetKg: 140,
      },
    ])
  })

  it('respects set and rep overrides and ignores selected sets beyond the target', () => {
    const result = computeWorkoutEfficiency(
      session({
        exerciseProgress: {
          bench: {
            detailId: 'bench',
            selectedSets: [true, true, true, true],
            weightPerSet: [20, 20, 0, 30],
            setsOverride: 3,
            repsOverride: 10,
          },
        },
      }),
      template({
        exercises: [
          {
            id: 'bench',
            title: 'Dumbbell Bench',
            sets: 4,
            reps: 8,
            variation: null,
          },
        ],
      }),
    )

    expect(result.totalVolumeKg).toBe(400)
    expect(result.completedSets).toBe(3)
    expect(result.totalSets).toBe(3)
    expect(result.perExercise[0].topSetKg).toBe(20)
  })

  it('treats missing or zero weights as bodyweight with completed sets but no volume', () => {
    const result = computeWorkoutEfficiency(
      session({
        exerciseProgress: {
          bench: {
            detailId: 'bench',
            selectedSets: [true, true, true],
            weightPerSet: [],
          },
        },
      }),
      template({
        exercises: [
          { id: 'bench', title: 'Push-up', sets: 3, reps: 12, variation: null },
        ],
      }),
    )

    expect(result.totalVolumeKg).toBe(0)
    expect(result.completedSets).toBe(3)
    expect(result.completionRate).toBe(1)
    expect(result.sessionDensityKgPerMin).toBe(0)
  })

  it('computes week-over-week volume from the most recent aggregate', () => {
    const oneExerciseTemplate = template({
      exercises: [
        {
          id: 'bench',
          title: 'Bench Press',
          sets: 1,
          reps: 10,
          variation: null,
        },
      ],
    })

    const result = computeWorkoutEfficiency(
      session({
        exerciseProgress: {
          bench: {
            detailId: 'bench',
            selectedSets: [true],
            weightPerSet: [120],
          },
        },
      }),
      oneExerciseTemplate,
      [
        { completedAt: '2026-06-01T10:45:00.000Z', totalVolumeKg: 500 },
        { completedAt: '2026-06-08T10:45:00.000Z', totalVolumeKg: 1000 },
      ],
    )

    expect(result.weekOverWeekVolumePct).toBe(20)
  })

  it('returns null week-over-week volume for empty history or zero prior volume', () => {
    expect(
      computeWorkoutEfficiency(session(), template()).weekOverWeekVolumePct,
    ).toBeNull()
    expect(
      computeWorkoutEfficiency(session(), template(), [
        { completedAt: '2026-06-08T10:45:00.000Z', totalVolumeKg: 0 },
      ]).weekOverWeekVolumePct,
    ).toBeNull()
  })

  it('returns null for incomplete duration and guarded comparisons', () => {
    const result = computeWorkoutEfficiency(
      session({ completedAt: null, status: 'in-progress' }),
      template(),
      [],
    )

    expect(result.durationMinutes).toBeNull()
    expect(result.sessionDensityKgPerMin).toBeNull()
    expect(result.weekOverWeekVolumePct).toBeNull()
  })

  it('keeps zero duration but does not divide density by zero', () => {
    const result = computeWorkoutEfficiency(
      session({ completedAt: '2026-06-10T10:00:00.000Z' }),
      template(),
    )

    expect(result.durationMinutes).toBe(0)
    expect(result.sessionDensityKgPerMin).toBeNull()
  })

  it('guards empty templates without division by zero', () => {
    const result = computeWorkoutEfficiency(
      session({ exerciseProgress: {} }),
      template({ exercises: [] }),
    )

    expect(result.totalVolumeKg).toBe(0)
    expect(result.completedSets).toBe(0)
    expect(result.totalSets).toBe(0)
    expect(result.completionRate).toBe(0)
  })
})
