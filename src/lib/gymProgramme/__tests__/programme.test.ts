import {
  PROGRAMME,
  programmeDayFor,
  programmeWorkoutDates,
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

describe('programmeWorkoutDates', () => {
  it('maps each day to a calendar date, including across month boundaries', () => {
    const dates = programmeWorkoutDates('2026-10-17', {})
    expect(dates.size).toBe(54)
    expect(dates.get('1')).toBe('2026-10-17')
    expect(dates.get('2')).toBe('2026-10-18')
    expect(dates.get('54')).toBe('2026-12-09')
    for (const day of PROGRAMME) {
      expect(programmeDayFor('2026-10-17', dates.get(day.day)!)).toEqual({
        day,
      })
    }
  })

  it('opens the latest saved workout for a day after a restart', () => {
    const dates = programmeWorkoutDates('2026-10-19', {
      '2026-10-18': { day: '2' },
      '2026-10-02': { day: '2' },
    })
    expect(dates.get('2')).toBe('2026-10-18')
    expect(dates.get('3')).toBe('2026-10-21')
  })

  it('does not route a scheduled day to a different pinned workout', () => {
    const dates = programmeWorkoutDates('2026-10-17', {
      '2026-10-18': { day: '10' },
    })
    expect(dates.has('2')).toBe(false)
    expect(dates.get('10')).toBe('2026-10-18')
  })

  it('only opens saved workouts before a programme has been started', () => {
    expect(programmeWorkoutDates(null, {}).size).toBe(0)
    expect([
      ...programmeWorkoutDates(null, { '2026-10-18': { day: '2' } }),
    ]).toEqual([['2', '2026-10-18']])
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
