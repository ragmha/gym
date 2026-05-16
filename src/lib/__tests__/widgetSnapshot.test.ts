import { buildTodaySnapshot } from '@/lib/widgetSnapshot'

describe('buildTodaySnapshot', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-05-16T09:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('uses graceful defaults when input data is missing', () => {
    expect(
      buildTodaySnapshot(undefined, undefined, undefined, undefined),
    ).toEqual({
      date: '2026-05-16',
      steps: 0,
      stepsGoal: 10_000,
      workoutXp: 0,
      lastWorkoutAt: null,
    })
  })

  it('serializes recent and older workout timestamps', () => {
    const recent = buildTodaySnapshot(
      4000,
      10_000,
      80,
      '2026-05-16T08:45:00.000Z',
    )
    const old = buildTodaySnapshot(4000, 10_000, 80, '2026-05-01T08:45:00.000Z')

    expect(recent.lastWorkoutAt).toBe('2026-05-16T08:45:00.000Z')
    expect(old.lastWorkoutAt).toBe('2026-05-01T08:45:00.000Z')
  })

  it('preserves steps above goal and normalizes invalid goal values', () => {
    const snapshot = buildTodaySnapshot(14_250, 0, 120, null)

    expect(snapshot.steps).toBe(14_250)
    expect(snapshot.stepsGoal).toBe(1)
    expect(snapshot.workoutXp).toBe(120)
  })
})
