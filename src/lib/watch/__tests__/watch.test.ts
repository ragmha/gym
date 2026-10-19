import { applyWatchMessage, watchState } from '@/lib/watch'
import { useGymLogStore } from '@/stores/GymLogStore'

const today = '2026-10-17'
const store = () => useGymLogStore.getState()
const send = (message: object) =>
  applyWatchMessage(JSON.stringify(message), today)
const log = (overrides: object = {}) =>
  send({
    action: 'log',
    dateKey: today,
    day: '1',
    exerciseId: 'exercise-1',
    reps: 12,
    kilograms: 40,
    ...overrides,
  })

beforeEach(() => useGymLogStore.setState({ programmeStart: today, logs: {} }))

describe('watchState', () => {
  it('shows the scheduled programme day with each exercise target', () => {
    const state = watchState(store(), today)

    expect(state).toMatchObject({
      dateKey: today,
      day: '1',
      title: 'Week 1 · Day 01',
      subtitle: 'Quads, Lower Abs & Calves',
      note: null,
      locked: false,
    })
    expect(state.exercises[0]).toEqual({
      id: 'exercise-1',
      title: 'Hack Squats',
      sets: 3,
      reps: 15,
      kilograms: null,
      logged: [],
    })
    expect(state.exercises[3]).toMatchObject({ id: 'exercise-4', sets: null })
  })

  it('starts the load from today’s last set, else the last session’s first', () => {
    useGymLogStore.setState({
      logs: {
        '2026-10-10': {
          day: '1',
          sets: {
            'exercise-1': [
              { reps: 15, kilograms: 60 },
              { reps: 12, kilograms: 65 },
            ],
          },
          finishedAt: '2026-10-10T10:00:00.000Z',
          rating: 8,
        },
      },
    })
    expect(watchState(store(), today).exercises[0].kilograms).toBe(60)

    store().logSet(today, '1', 'exercise-1', { reps: 15, kilograms: null })
    expect(watchState(store(), today).exercises[0].kilograms).toBeNull()
  })

  it.each([
    [null, 'Start the programme on your iPhone.'],
    ['2026-10-18', 'Before your programme starts.'],
    ['2026-01-01', 'Programme complete.'],
    ['2026-10-12', 'Active rest day. Cardio only.'],
  ])('explains a day with nothing to log (start %s)', (start, note) => {
    const state = watchState({ programmeStart: start, logs: {} }, today)

    expect(state.note).toBe(note)
    expect(state.exercises).toEqual([])
  })

  it('keeps a logged day and locks it once finished', () => {
    store().logSet(today, '1', 'exercise-1', { reps: 15, kilograms: 40 })
    store().finishWorkout(today, { rating: 8, finishedAt: new Date() })

    const state = watchState(
      { programmeStart: null, logs: store().logs },
      today,
    )

    expect(state).toMatchObject({ day: '1', locked: true, note: null })
    expect(state.exercises[0].logged).toEqual([{ reps: 15, kilograms: 40 }])
  })

  it('titles a pinned 5×5 log without programme week and day', () => {
    store().logSet(today, '5x5-A', 'squat', { reps: 5, kilograms: 60 })

    const state = watchState(
      { programmeStart: null, logs: store().logs },
      today,
    )

    expect(state).toMatchObject({
      day: '5x5-A',
      title: 'StrongLifts 5×5',
      subtitle: 'Workout A',
      note: null,
    })
    expect(state.exercises[0]).toMatchObject({
      id: 'squat',
      sets: 5,
      reps: 5,
      kilograms: 60,
    })
  })
})

describe('applyWatchMessage', () => {
  it('logs and undoes sets on today’s programme day', () => {
    log()
    log({ reps: 10, kilograms: null })
    send({ action: 'undo', dateKey: today, exerciseId: 'exercise-1' })

    expect(store().logs[today]).toMatchObject({
      day: '1',
      sets: { 'exercise-1': [{ reps: 12, kilograms: 40 }] },
    })
  })

  it.each([
    ['a stale date', { dateKey: '2026-10-16' }],
    ['another programme day', { day: '2' }],
    ['an unknown exercise', { exerciseId: 'exercise-99' }],
    ['an invalid set', { reps: 0 }],
    ['a malformed message', { kilograms: 'heavy' }],
  ])('ignores %s', (_, overrides) => {
    log(overrides)

    expect(store().logs).toEqual({})
  })

  it('ignores sync requests, bad JSON and taps after the workout is finished', () => {
    applyWatchMessage('not json', today)
    send({ action: 'sync' })
    expect(store().logs).toEqual({})

    log()
    store().finishWorkout(today, { rating: 8, finishedAt: new Date() })
    log()
    send({ action: 'undo', dateKey: today, exerciseId: 'exercise-1' })

    expect(store().logs[today]?.sets['exercise-1']).toHaveLength(1)
  })
})
