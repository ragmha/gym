import {
  PROGRAMME,
  programmeDayFor,
  savedWorkoutDates,
} from '@/lib/gymProgramme'

describe('programmeDayFor', () => {
  it('maps local dates onto consecutive programme days', () => {
    expect(PROGRAMME).toHaveLength(54)
    expect(programmeDayFor('2026-10-01', '2026-10-01')).toEqual({
      day: PROGRAMME[0],
    })
    expect(programmeDayFor('2026-10-01', '2026-10-09')).toEqual({
      day: PROGRAMME[8],
    })
  })

  it('stays on calendar days across a daylight-saving change', () => {
    expect(programmeDayFor('2026-10-20', '2026-10-27')).toEqual({
      day: PROGRAMME[7],
    })
  })

  it('reports dates outside the programme', () => {
    expect(programmeDayFor('2026-10-01', '2026-09-30')).toEqual({
      reason: 'before-start',
    })
    expect(programmeDayFor('2026-10-01', '2026-11-24')).toEqual({
      reason: 'finished',
    })
  })
})

describe('savedWorkoutDates', () => {
  it('maps each saved day to its latest date', () => {
    const dates = savedWorkoutDates({
      '2026-10-18': { day: '2' },
      '2026-10-02': { day: '2' },
      '2026-10-17': { day: '1' },
    })
    expect([...dates]).toEqual(
      expect.arrayContaining([
        ['1', '2026-10-17'],
        ['2', '2026-10-18'],
      ]),
    )
    expect(dates.size).toBe(2)
  })

  it('is empty without saved workouts', () => {
    expect(savedWorkoutDates({}).size).toBe(0)
  })
})

describe('exerciseHistory', () => {
  it('collects sessions by title in date order with an Epley estimate', () => {
    const { exerciseHistory, estimateOneRepMax } =
      jest.requireActual<typeof import('@/lib/gymProgramme')>(
        '@/lib/gymProgramme',
      )
    const logs = {
      '2026-10-24': {
        day: '8',
        sets: { 'exercise-1': [{ reps: 15, kilograms: 50 }] },
      },
      '2026-10-17': {
        day: '1',
        sets: {
          'exercise-1': [
            { reps: 15, kilograms: 40 },
            { reps: 10, kilograms: null },
          ],
        },
      },
      '2026-10-30': {
        day: '1',
        sets: { 'exercise-1': [{ reps: 1, kilograms: 100 }] },
      },
    }
    expect(estimateOneRepMax({ reps: 10, kilograms: null })).toBeNull()
    const history = exerciseHistory(logs, 'Hack Squats', '2026-10-24')
    expect(history.map((s) => s.dateKey)).toEqual(['2026-10-17'])
    expect(history[0]).toMatchObject({ oneRepMax: 60 })
    expect(history[0].sets).toHaveLength(2)
  })
})

describe('StrongLifts 5×5', () => {
  const { FIVE_BY_FIVE, findProgrammeDay, nextFiveByFive, nextWeight } =
    jest.requireActual<typeof import('@/lib/gymProgramme')>(
      '@/lib/gymProgramme',
    )
  const [squat] = FIVE_BY_FIVE[0].exercises
  const deadlift = FIVE_BY_FIVE[1].exercises[2]
  const session = (kilograms: number, reps: number[]) => ({
    dateKey: '2026-10-01',
    oneRepMax: null,
    sets: reps.map((r) => ({ reps: r, kilograms })),
  })

  it('keeps its history apart from programme titles', () => {
    const titles = new Set(
      PROGRAMME.flatMap((d) => d.exercises.map((e) => e.title)),
    )
    for (const workout of FIVE_BY_FIVE) {
      expect(findProgrammeDay(workout.day)).toBe(workout)
      for (const e of workout.exercises) expect(titles).not.toContain(e.title)
    }
  })

  it('alternates A and B from the latest earlier 5×5 log', () => {
    expect(nextFiveByFive({}, '2026-10-17').day).toBe('5x5-A')
    const logs = {
      '2026-10-10': { day: '5x5-A' },
      '2026-10-12': { day: '3' },
      '2026-10-17': { day: '5x5-B' },
    }
    expect(nextFiveByFive(logs, '2026-10-16').day).toBe('5x5-B')
    expect(nextFiveByFive(logs, '2026-10-20').day).toBe('5x5-A')
  })

  it('adds the increment after every rep, else repeats', () => {
    expect(nextWeight([], squat)).toBeNull()
    expect(nextWeight([session(60, [5, 5, 5, 5, 5])], squat)).toEqual({
      kilograms: 62.5,
      reason: 'up',
    })
    expect(nextWeight([session(100, [5])], deadlift)).toEqual({
      kilograms: 105,
      reason: 'up',
    })
    expect(nextWeight([session(60, [5, 5, 5, 4, 3])], squat)).toEqual({
      kilograms: 60,
      reason: 'repeat',
    })
    // An extra "+" set cannot make up for a missed planned set.
    expect(nextWeight([session(60, [5, 5, 5, 5, 4, 5])], squat)).toEqual({
      kilograms: 60,
      reason: 'repeat',
    })
  })

  it('deloads 10% after three misses in a row at the same weight', () => {
    const miss = session(60, [5, 5, 5, 5, 4])
    expect(nextWeight([miss, miss, miss], squat)).toEqual({
      kilograms: 55,
      reason: 'deload',
    })
    expect(
      nextWeight([miss, session(57.5, [5, 5, 5, 5, 4]), miss, miss], squat),
    ).toMatchObject({ reason: 'repeat' })
  })
})
