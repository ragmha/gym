import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'

import {
  DASHBOARD_GOALS,
  FITNESS_METRIC_ORDER,
  presentCalories,
  presentFlightsClimbed,
  presentHeartRate,
  presentHrv,
  presentRestingHr,
  presentSleep,
  presentSteps,
} from '../presenter'

function snapshot(
  overrides: Partial<DailyHealthSnapshot> = {},
): DailyHealthSnapshot {
  return {
    date: '2026-02-20',
    steps: null,
    calories: null,
    sleepHours: null,
    heartRate: null,
    hrv: null,
    restingHeartRate: null,
    waterLiters: null,
    flightsClimbed: null,
    workouts: [],
    ...overrides,
  }
}

describe('fitness metric presenters', () => {
  it.each([
    [0, '--', 0, 'empty'],
    [5_000, '5,000', 0.5, 'progress'],
    [DASHBOARD_GOALS.stepsGoal, '10,000', 1, 'reached'],
    [12_000, '12,000', 1, 'over'],
  ] as const)('presents steps=%s', (steps, value, progress, status) => {
    expect(presentSteps(snapshot({ steps }))).toMatchObject({
      id: 'steps',
      label: 'Steps',
      value,
      subtitle: 'Goal: 10,000',
      progress,
      status,
    })
  })

  it.each([
    [0, '--', 0, 'empty'],
    [300, '300', 0.5, 'progress'],
    [DASHBOARD_GOALS.caloriesGoal, '600', 1, 'reached'],
    [750, '750', 1, 'over'],
  ] as const)('presents calories=%s', (calories, value, progress, status) => {
    expect(presentCalories(snapshot({ calories }))).toMatchObject({
      id: 'calories',
      value,
      unit: 'kcal',
      subtitle: 'Goal: 600 kcal',
      progress,
      status,
    })
  })

  it.each([
    [0, '--', 0, 'empty'],
    [7.5, '7.5', 0.9375, 'progress'],
    [DASHBOARD_GOALS.sleepGoalHours, '8.0', 1, 'reached'],
    [9, '9.0', 1, 'over'],
  ] as const)(
    'presents sleepHours=%s',
    (sleepHours, value, progress, status) => {
      expect(presentSleep(snapshot({ sleepHours }))).toMatchObject({
        id: 'sleep',
        value,
        unit: 'hrs',
        subtitle: 'Goal: 8 hrs',
        progress,
        status,
      })
    },
  )

  it('presents an empty heart-rate reading', () => {
    expect(presentHeartRate(snapshot({ heartRate: 0 }))).toMatchObject({
      id: 'heart-rate',
      value: '--',
      progress: 0,
      status: 'empty',
    })
  })

  it.each([
    [50, 1, 'reached'],
    [125, 0.5, 'progress'],
    [200, 0, 'progress'],
  ] as const)(
    'presents heartRate=%s with inverted band progress',
    (heartRate, progress, status) => {
      expect(presentHeartRate(snapshot({ heartRate }))).toMatchObject({
        value: `${heartRate}`,
        unit: 'bpm',
        progress,
        status,
      })
    },
  )

  it.each([
    [0, '--', 0, 'empty'],
    [40, '40', 0.5, 'progress'],
    [DASHBOARD_GOALS.hrvOptimal, '80', 1, 'reached'],
    [100, '100', 1, 'over'],
  ] as const)('presents hrv=%s', (hrv, value, progress, status) => {
    expect(presentHrv(snapshot({ hrv }))).toMatchObject({
      id: 'hrv',
      value,
      unit: 'ms',
      progress,
      status,
    })
  })

  it.each([
    [0, '--', 0, 'empty'],
    [45, '45', 55 / 60, 'progress'],
    [110, '110', 0, 'over'],
  ] as const)(
    'presents restingHeartRate=%s with penalty curve',
    (restingHeartRate, value, progress, status) => {
      const result = presentRestingHr(snapshot({ restingHeartRate }))

      expect(result).toMatchObject({
        id: 'resting-hr',
        value,
        unit: 'bpm',
        status,
      })
      expect(result.progress).toBeCloseTo(progress)
    },
  )

  it.each([
    [0, '--', 0, 'empty'],
    [10, '10', 0.5, 'progress'],
    [25, '25', 1, 'over'],
  ] as const)(
    'presents flightsClimbed=%s',
    (flightsClimbed, value, progress, status) => {
      expect(presentFlightsClimbed(snapshot({ flightsClimbed }))).toMatchObject(
        {
          id: 'flights-climbed',
          value,
          progress,
          status,
        },
      )
    },
  )

  it('keeps the canonical dashboard ordering local to the module', () => {
    expect(FITNESS_METRIC_ORDER).toEqual([
      'recovery',
      'steps',
      'calories',
      'sleep',
      'hydration',
      'heart-rate',
      'hrv',
      'resting-hr',
      'flights-climbed',
    ])
    expect(FITNESS_METRIC_ORDER[0]).toBe('recovery')
    expect(FITNESS_METRIC_ORDER.indexOf('hydration')).toBe(
      FITNESS_METRIC_ORDER.indexOf('sleep') + 1,
    )
    expect(FITNESS_METRIC_ORDER.indexOf('heart-rate')).toBe(
      FITNESS_METRIC_ORDER.indexOf('hydration') + 1,
    )
  })
})
