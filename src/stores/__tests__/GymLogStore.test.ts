import { useGymLogStore } from '@/stores/GymLogStore'

const key = '2026-10-17'
const state = () => useGymLogStore.getState()

beforeEach(() => useGymLogStore.setState({ programmeStart: null, logs: {} }))

describe('GymLogStore', () => {
  it('logs, undoes and finishes sets for a programme day', () => {
    state().logSet(key, '1', 'exercise-1', { reps: 15, kilograms: 40 })
    state().logSet(key, '1', 'exercise-1', { reps: 12, kilograms: null })
    state().removeLastSet(key, 'exercise-1')
    state().finishWorkout(key, {
      rating: 8,
      finishedAt: new Date('2026-10-17T13:00:00Z'),
    })

    expect(state().logs[key]).toEqual({
      day: '1',
      sets: { 'exercise-1': [{ reps: 15, kilograms: 40 }] },
      finishedAt: '2026-10-17T13:00:00.000Z',
      rating: 8,
    })
  })

  it.each([
    { reps: 0, kilograms: null },
    { reps: 1.5, kilograms: null },
    { reps: 10, kilograms: 0 },
    { reps: 10, kilograms: Number.NaN },
    { reps: 10, kilograms: 1001 },
  ])('rejects invalid set %p', (set) => {
    state().logSet(key, '1', 'exercise-1', set)
    expect(state().logs[key]).toBeUndefined()
  })

  it('locks a finished day and refuses empty or mismatched workouts', () => {
    const finish = () =>
      state().finishWorkout(key, {
        rating: 7,
        finishedAt: new Date(),
      })
    finish()
    expect(state().logs[key]).toBeUndefined()

    state().logSet(key, '1', 'exercise-1', { reps: 10, kilograms: null })
    state().logSet(key, '2', 'exercise-1', { reps: 10, kilograms: null })
    finish()
    state().logSet(key, '1', 'exercise-1', { reps: 10, kilograms: null })
    state().removeLastSet(key, 'exercise-1')

    expect(state().logs[key]?.sets['exercise-1']).toHaveLength(1)
  })

  it('persists only the programme start and logs', () => {
    expect(useGymLogStore.persist.getOptions().partialize?.(state())).toEqual({
      programmeStart: null,
      logs: {},
    })
  })

  it('drops a log once every set is undone so the date can move to another day', () => {
    const store = useGymLogStore.getState()
    store.logSet('2026-10-17', '5', 'exercise-1', { reps: 10, kilograms: null })
    useGymLogStore.getState().removeLastSet('2026-10-17', 'exercise-1')
    expect(useGymLogStore.getState().logs['2026-10-17']).toBeUndefined()
    useGymLogStore
      .getState()
      .logSet('2026-10-17', '1', 'exercise-1', { reps: 15, kilograms: 40 })
    expect(useGymLogStore.getState().logs['2026-10-17']?.day).toBe('1')
  })
})
