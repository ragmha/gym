import { PROGRAMME, programmeDayFor } from '@/lib/gymProgramme'

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
