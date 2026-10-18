import { Platform } from 'react-native'

import { iosHealthKitAdapter } from '@/lib/healthSnapshot/iosAdapter'
import {
  createDeterministicMockSnapshot,
  deterministicMockAdapter,
} from '@/lib/healthSnapshot/mockAdapter'
import type { HealthSnapshotSource } from '@/lib/healthSnapshot/types'

jest.mock('@kingstinct/react-native-healthkit')

// eslint-disable-next-line @typescript-eslint/no-require-imports
const hk = require('@kingstinct/react-native-healthkit')

describe('HealthSnapshotSource adapters', () => {
  const originalPlatform = Platform.OS
  const emptySnapshot = {
    date: '2026-02-15',
    steps: null,
    calories: null,
    sleepHours: null,
    heartRate: null,
    hrv: null,
    restingHeartRate: null,
    waterLiters: null,
    flightsClimbed: null,
    bodyMassKg: null,
    bodyMassHistory: null,
    dietaryCalories: null,
    workouts: [],
  }

  beforeEach(() => {
    jest.resetAllMocks()
    hk.queryQuantitySamples.mockResolvedValue([])
    hk.queryStatisticsForQuantity.mockResolvedValue({ sources: [] })
    hk.queryStatisticsCollectionForQuantity.mockResolvedValue([])
    hk.queryCategorySamples.mockResolvedValue([])
    hk.getMostRecentQuantitySample.mockResolvedValue(undefined)
    hk.queryWorkoutSamples.mockResolvedValue([])
    hk.isHealthDataAvailable.mockResolvedValue(true)
    hk.requestAuthorization.mockResolvedValue(true)
    hk.subscribeToChanges.mockReturnValue({ remove: jest.fn() })
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' })
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform,
    })
  })

  it('iosHealthKitAdapter.getDailySnapshot rounds metrics and computes sleep hours from sleep samples', async () => {
    const date = new Date('2026-02-15T12:00:00.000Z')
    const sleepStart = new Date('2026-02-15T01:00:00.000Z')
    const sleepEnd = new Date('2026-02-15T07:45:00.000Z')

    hk.queryStatisticsForQuantity.mockImplementation((identifier: string) => {
      const totals: Record<string, number> = {
        HKQuantityTypeIdentifierStepCount: 1236.6,
        HKQuantityTypeIdentifierActiveEnergyBurned: 249.7,
        HKQuantityTypeIdentifierDietaryWater: 1.49,
        HKQuantityTypeIdentifierFlightsClimbed: 4.5,
        HKQuantityTypeIdentifierDietaryEnergyConsumed: 1840.6,
      }
      return Promise.resolve({ sumQuantity: { quantity: totals[identifier] } })
    })
    hk.queryCategorySamples.mockResolvedValue([
      { value: 1, startDate: sleepStart, endDate: sleepEnd },
    ])
    hk.queryQuantitySamples.mockImplementation((identifier: string) => {
      const quantities: Record<string, number> = {
        HKQuantityTypeIdentifierHeartRate: 71.6,
        HKQuantityTypeIdentifierHeartRateVariabilitySDNN: 42.4,
        HKQuantityTypeIdentifierRestingHeartRate: 55.5,
      }
      return Promise.resolve([{ quantity: quantities[identifier] }])
    })
    hk.getMostRecentQuantitySample.mockResolvedValue({ quantity: 78.46 })
    hk.queryWorkoutSamples.mockResolvedValue([
      {
        workoutActivityType: 37,
        duration: { quantity: 2700, unit: 's' },
        totalEnergyBurned: { quantity: 250.4 },
        totalDistance: { quantity: 5.25 },
        startDate: '2026-02-15T08:00:00.000Z',
        endDate: '2026-02-15T08:45:00.000Z',
      },
    ])

    await expect(iosHealthKitAdapter.getDailySnapshot(date)).resolves.toEqual({
      date: '2026-02-15',
      steps: 1237,
      calories: 250,
      sleepHours: 6.8,
      heartRate: 72,
      hrv: 42,
      restingHeartRate: 56,
      waterLiters: 1.5,
      flightsClimbed: 5,
      bodyMassKg: 78.5,
      bodyMassHistory: null,
      dietaryCalories: 1841,
      workouts: [
        {
          kind: 'running',
          activityName: 'Running',
          averageHeartRate: null,
          calories: 250,
          distance: 5.25,
          durationMinutes: 45,
          startISO: '2026-02-15T08:00:00.000Z',
          endISO: '2026-02-15T08:45:00.000Z',
        },
      ],
    })
  })

  it('iosHealthKitAdapter.getDailySnapshot isolates one rejected identifier to that field only', async () => {
    const date = new Date('2026-02-15T12:00:00.000Z')
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

    hk.queryStatisticsForQuantity.mockImplementation((identifier: string) => {
      if (identifier === 'HKQuantityTypeIdentifierActiveEnergyBurned') {
        return Promise.reject(new Error('calories denied'))
      }
      return Promise.resolve({ sumQuantity: { quantity: 1000 } })
    })

    hk.queryCategorySamples.mockResolvedValue([])
    hk.getMostRecentQuantitySample.mockResolvedValue({ quantity: 70 })
    hk.queryWorkoutSamples.mockResolvedValue([])

    const snapshot = await iosHealthKitAdapter.getDailySnapshot(date)

    expect(snapshot.calories).toBeNull()
    expect(snapshot.steps).toBe(1000)
    expect(snapshot.waterLiters).toBe(1000)
    expect(snapshot.workouts).toEqual([])
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[HealthSnapshotSource] calories read failed (Error)',
    )
  })

  it.each([
    { activityType: 37, label: 'Running', kind: 'running' },
    { activityType: 13, label: 'Cycling', kind: 'other' },
    {
      activityType: 63,
      label: 'High intensity interval training',
      kind: 'other',
    },
    {
      activityType: 50,
      label: 'Traditional strength training',
      kind: 'strength',
    },
    {
      activityType: 20,
      label: 'Functional strength training',
      kind: 'strength',
    },
    { activityType: 44, label: 'Stair climbing', kind: 'stairClimber' },
    { activityType: 68, label: 'Stairs', kind: 'other' },
    { activityType: 69, label: 'Step training', kind: 'other' },
    { activityType: 3000, label: 'Other', kind: 'other' },
  ])(
    'decodes native workout type $activityType as $label',
    async ({ activityType, label, kind }) => {
      hk.queryWorkoutSamples.mockResolvedValue([
        {
          workoutActivityType: activityType,
          duration: { quantity: 1800, unit: 's' },
          startDate: '2026-02-15T08:00:00.000Z',
          endDate: '2026-02-15T08:30:00.000Z',
          getStatistic: jest.fn(async () => undefined),
        },
      ])

      const snapshot = await iosHealthKitAdapter.getDailySnapshot(
        new Date('2026-02-15T12:00:00.000Z'),
      )

      expect(snapshot.workouts).toHaveLength(1)
      expect(snapshot.workouts[0]).toMatchObject({
        activityName: label,
        kind,
        durationMinutes: 30,
        calories: null,
        distance: null,
      })
    },
  )

  it.each([undefined, 9999, NaN])(
    'keeps an unsupported workout type %s without displaying a raw code',
    async (activityType) => {
      const warn = jest.spyOn(console, 'warn').mockImplementation()
      hk.queryWorkoutSamples.mockResolvedValue([
        {
          workoutActivityType: activityType,
          duration: { quantity: 1800, unit: 's' },
          startDate: '2026-02-15T08:00:00.000Z',
          endDate: '2026-02-15T08:30:00.000Z',
        },
      ])

      const snapshot = await iosHealthKitAdapter.getDailySnapshot(
        new Date('2026-02-15T12:00:00.000Z'),
      )

      expect(snapshot.workouts).toHaveLength(1)
      expect(snapshot.workouts[0]).toMatchObject({
        activityName: 'Unknown workout',
        durationMinutes: 30,
      })
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(
        '[HealthSnapshotSource] workout activity type failed (TypeError)',
      )
    },
  )

  it.each([undefined, null])(
    'keeps every unobserved metric null when HealthKit returns empty reads and a %s latest sample',
    async (sample) => {
      hk.getMostRecentQuantitySample.mockResolvedValue(sample)

      await expect(
        iosHealthKitAdapter.getDailySnapshot(
          new Date('2026-02-15T12:00:00.000Z'),
        ),
      ).resolves.toEqual(emptySnapshot)
    },
  )

  it('does not invent measurements from samples without quantities or asleep intervals', async () => {
    hk.queryQuantitySamples.mockResolvedValue([
      {},
      { quantity: undefined },
      { quantity: null },
    ])
    hk.queryStatisticsForQuantity.mockResolvedValue({ sumQuantity: {} })
    hk.getMostRecentQuantitySample.mockResolvedValue({})
    hk.queryCategorySamples.mockResolvedValue([
      {
        value: 0,
        startDate: '2026-02-15T01:00:00.000Z',
        endDate: '2026-02-15T07:00:00.000Z',
      },
      {
        value: 2,
        startDate: '2026-02-15T07:00:00.000Z',
        endDate: '2026-02-15T08:00:00.000Z',
      },
    ])

    await expect(
      iosHealthKitAdapter.getDailySnapshot(
        new Date('2026-02-15T12:00:00.000Z'),
      ),
    ).resolves.toEqual(emptySnapshot)
  })

  it('preserves observed zero quantities, including workout values', async () => {
    hk.queryQuantitySamples.mockImplementation((identifier: string) =>
      Promise.resolve([
        identifier === 'HKQuantityTypeIdentifierBodyMass'
          ? { quantity: 0, startDate: '2026-02-15T07:00:00.000Z' }
          : { quantity: 0 },
      ]),
    )
    hk.queryStatisticsForQuantity.mockResolvedValue({
      sumQuantity: { quantity: 0 },
    })
    hk.getMostRecentQuantitySample.mockResolvedValue({ quantity: 0 })
    hk.queryCategorySamples.mockResolvedValue([
      {
        value: 1,
        startDate: '2026-02-15T07:00:00.000Z',
        endDate: '2026-02-15T07:00:00.000Z',
      },
    ])
    hk.queryWorkoutSamples.mockResolvedValue([
      {
        workoutActivityType: 37,
        duration: { quantity: 0, unit: 's' },
        totalEnergyBurned: { quantity: 0 },
        totalDistance: { quantity: 0 },
        startDate: '2026-02-15T08:00:00.000Z',
        endDate: '2026-02-15T08:30:00.000Z',
      },
    ])

    await expect(
      iosHealthKitAdapter.getDailySnapshot(
        new Date('2026-02-15T12:00:00.000Z'),
      ),
    ).resolves.toEqual({
      date: '2026-02-15',
      steps: 0,
      calories: 0,
      sleepHours: 0,
      heartRate: 0,
      hrv: 0,
      restingHeartRate: 0,
      waterLiters: 0,
      flightsClimbed: 0,
      bodyMassKg: 0,
      bodyMassHistory: [{ kilograms: 0, startISO: '2026-02-15T07:00:00.000Z' }],
      dietaryCalories: 0,
      workouts: [
        {
          kind: 'running',
          activityName: 'Running',
          averageHeartRate: null,
          calories: 0,
          distance: 0,
          durationMinutes: 0,
          startISO: '2026-02-15T08:00:00.000Z',
          endISO: '2026-02-15T08:30:00.000Z',
        },
      ],
    })
  })

  it('keeps missing workout energy and distance null without dropping the workout', async () => {
    hk.queryWorkoutSamples.mockResolvedValue([
      {
        workoutActivityType: 37,
        duration: { quantity: 1800, unit: 's' },
        startDate: '2026-02-15T08:00:00.000Z',
        endDate: '2026-02-15T08:30:00.000Z',
      },
    ])

    const snapshot = await iosHealthKitAdapter.getDailySnapshot(
      new Date('2026-02-15T12:00:00.000Z'),
    )

    expect(snapshot.workouts).toEqual([
      {
        kind: 'running',
        activityName: 'Running',
        averageHeartRate: null,
        calories: null,
        distance: null,
        durationMinutes: 30,
        startISO: '2026-02-15T08:00:00.000Z',
        endISO: '2026-02-15T08:30:00.000Z',
      },
    ])
  })

  it('uses recorded workout duration instead of counting pauses as activity', async () => {
    hk.queryWorkoutSamples.mockResolvedValue([
      {
        workoutActivityType: 37,
        duration: { quantity: 1800, unit: 's' },
        startDate: '2026-02-15T08:00:00.000Z',
        endDate: '2026-02-15T08:45:00.000Z',
      },
    ])

    const snapshot = await iosHealthKitAdapter.getDailySnapshot(
      new Date('2026-02-15T12:00:00.000Z'),
    )

    expect(snapshot.workouts[0]).toMatchObject({
      durationMinutes: 30,
      startISO: '2026-02-15T08:00:00.000Z',
      endISO: '2026-02-15T08:45:00.000Z',
    })
  })

  it('keeps rejected reads unavailable and logs error kinds without sensitive error details', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    const error = new Error('Authorization denied: private sample details')
    hk.queryQuantitySamples.mockRejectedValue(error)
    hk.queryStatisticsForQuantity.mockRejectedValue(error)
    hk.queryCategorySamples.mockRejectedValue(error)
    hk.getMostRecentQuantitySample.mockRejectedValue(error)
    hk.queryWorkoutSamples.mockRejectedValue(error)

    await expect(
      iosHealthKitAdapter.getDailySnapshot(
        new Date('2026-02-15T12:00:00.000Z'),
      ),
    ).resolves.toEqual(emptySnapshot)
    expect(consoleWarnSpy).toHaveBeenCalledTimes(12)
    expect(consoleWarnSpy.mock.calls).toEqual(
      expect.arrayContaining([
        ['[HealthSnapshotSource] steps read failed (Error)'],
        ['[HealthSnapshotSource] workouts read failed (Error)'],
      ]),
    )
    expect(JSON.stringify(consoleWarnSpy.mock.calls)).not.toContain(
      error.message,
    )
  })

  it('keeps mock snapshots and workouts stable for the same day as the clock advances', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-20T10:00:00.000Z'))

    const first = await deterministicMockAdapter.getDailySnapshot(
      new Date('2026-02-15T12:00:00.000Z'),
    )
    const second = await deterministicMockAdapter.getDailySnapshot(
      new Date('2026-02-15T20:00:00.000Z'),
    )
    const different = await deterministicMockAdapter.getDailySnapshot(
      new Date('2026-02-16T12:00:00.000Z'),
    )

    expect(second).toEqual(first)
    expect(different).not.toEqual(first)

    const todayAtTen = await deterministicMockAdapter.getDailySnapshot(
      new Date('2026-02-20T08:00:00.000Z'),
    )
    jest.setSystemTime(new Date('2026-02-20T10:01:00.000Z'))
    const todayAtTenOhOne = await deterministicMockAdapter.getDailySnapshot(
      new Date('2026-02-20T08:00:00.000Z'),
    )
    expect(todayAtTen.date).toBe('2026-02-20')
    expect(todayAtTenOhOne).toEqual(todayAtTen)
    jest.setSystemTime(new Date('2026-02-21T10:00:00.000Z'))
    await expect(
      deterministicMockAdapter.getDailySnapshot(
        new Date('2026-02-20T08:00:00.000Z'),
      ),
    ).resolves.toEqual(todayAtTen)

    jest.useRealTimers()
  })

  it('reads step history in one daily statistics query, keeping observed zero and leaving gaps null', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 1, 20, 10))
    hk.queryStatisticsCollectionForQuantity.mockResolvedValue([
      { sumQuantity: null, startDate: new Date(2026, 1, 18) },
      { sumQuantity: { quantity: 8499.6 }, startDate: new Date(2026, 1, 19) },
      { sumQuantity: { quantity: 0 }, startDate: new Date(2026, 1, 20) },
    ])

    const history = await iosHealthKitAdapter.getStepHistory(
      new Date(2026, 1, 20, 12),
      4,
    )

    expect(hk.queryStatisticsCollectionForQuantity).toHaveBeenCalledTimes(1)
    expect(hk.queryStatisticsCollectionForQuantity).toHaveBeenCalledWith(
      'HKQuantityTypeIdentifierStepCount',
      ['cumulativeSum'],
      new Date(2026, 1, 17),
      { day: 1 },
      {
        unit: 'count',
        filter: {
          date: {
            startDate: new Date(2026, 1, 17),
            endDate: new Date(2026, 1, 20, 10),
          },
        },
      },
    )
    expect(history).toEqual([
      { date: '2026-02-17', steps: null },
      { date: '2026-02-18', steps: null },
      { date: '2026-02-19', steps: 8500 },
      { date: '2026-02-20', steps: 0 },
    ])
  })

  it('keeps mock step history consistent with the daily snapshot', async () => {
    const date = new Date(2026, 1, 20, 12)
    const history = await deterministicMockAdapter.getStepHistory(date, 3)
    const snapshot = await deterministicMockAdapter.getDailySnapshot(date)

    expect(history.map((day) => day.date)).toEqual([
      '2026-02-18',
      '2026-02-19',
      '2026-02-20',
    ])
    expect(history[2].steps).toBe(snapshot.steps)
  })

  it('reads water history in one daily statistics query, keeping missing days null and observed zero', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 1, 20, 10))
    hk.queryStatisticsCollectionForQuantity.mockResolvedValue([
      { sumQuantity: { quantity: 1.26 }, startDate: new Date(2026, 1, 18) },
      { sumQuantity: { quantity: 0 }, startDate: new Date(2026, 1, 19) },
      { sumQuantity: null, startDate: new Date(2026, 1, 20) },
    ])

    const history = await iosHealthKitAdapter.getWaterHistory(
      new Date(2026, 1, 20, 12),
      4,
    )

    expect(hk.queryStatisticsCollectionForQuantity).toHaveBeenCalledTimes(1)
    expect(hk.queryStatisticsCollectionForQuantity).toHaveBeenCalledWith(
      'HKQuantityTypeIdentifierDietaryWater',
      ['cumulativeSum'],
      new Date(2026, 1, 17),
      { day: 1 },
      {
        unit: 'l',
        filter: {
          date: {
            startDate: new Date(2026, 1, 17),
            endDate: new Date(2026, 1, 20, 10),
          },
        },
      },
    )
    expect(history).toEqual([
      { date: '2026-02-17', liters: null },
      { date: '2026-02-18', liters: 1.3 },
      { date: '2026-02-19', liters: 0 },
      { date: '2026-02-20', liters: null },
    ])
  })

  it('reads workout history in one bulk query bucketed by local start day', async () => {
    hk.queryWorkoutSamples.mockResolvedValue([
      {
        workoutActivityType: 37,
        startDate: new Date(2026, 1, 18, 7),
        endDate: new Date(2026, 1, 18, 7, 30),
        duration: { quantity: 1800, unit: 's' },
      },
      {
        workoutActivityType: 37,
        startDate: new Date(2026, 1, 19, 7),
        endDate: new Date(2026, 1, 19, 7, 10),
        duration: { quantity: 600, unit: 's' },
      },
    ])

    const history = await iosHealthKitAdapter.getWorkoutHistory(
      new Date(2026, 1, 20, 12),
      3,
    )

    expect(hk.queryWorkoutSamples).toHaveBeenCalledTimes(1)
    expect(hk.queryWorkoutSamples).toHaveBeenCalledWith({
      limit: 0,
      filter: {
        date: {
          startDate: new Date(2026, 1, 18),
          endDate: new Date(2026, 1, 21),
        },
      },
    })
    expect(history.map((d) => [d.date, d.workouts.length])).toEqual([
      ['2026-02-18', 1],
      ['2026-02-19', 1],
      ['2026-02-20', 0],
    ])
    expect(history[0].workouts[0].durationMinutes).toBe(30)
  })

  it('rejects a failed workout history read instead of reporting empty days', async () => {
    hk.queryWorkoutSamples.mockRejectedValue(new Error('workout denied'))

    await expect(
      iosHealthKitAdapter.getWorkoutHistory(new Date(2026, 1, 20, 12), 7),
    ).rejects.toThrow('workout denied')
  })

  it('serves deterministic mock workout history off iOS', async () => {
    const date = new Date(2026, 1, 20, 12)
    const history = await deterministicMockAdapter.getWorkoutHistory(date, 2)
    expect(history.map((d) => d.date)).toEqual(['2026-02-19', '2026-02-20'])
    expect(history[1].workouts).toEqual(
      createDeterministicMockSnapshot(date).workouts,
    )
  })

  it('rejects a failed water history read instead of reporting empty days', async () => {
    hk.queryStatisticsCollectionForQuantity.mockRejectedValue(
      new Error('water denied'),
    )

    await expect(
      iosHealthKitAdapter.getWaterHistory(new Date(2026, 1, 20, 12), 7),
    ).rejects.toThrow('water denied')
  })

  it('returns null water days without querying when HealthKit is unavailable', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'web',
    })

    await expect(
      iosHealthKitAdapter.getWaterHistory(new Date(2026, 1, 20, 12), 2),
    ).resolves.toEqual([
      { date: '2026-02-19', liters: null },
      { date: '2026-02-20', liters: null },
    ])
    expect(hk.queryStatisticsCollectionForQuantity).not.toHaveBeenCalled()
  })

  it('keeps mock water history consistent with the daily snapshot', async () => {
    const date = new Date(2026, 1, 20, 12)
    const history = await deterministicMockAdapter.getWaterHistory(date, 3)
    const snapshot = await deterministicMockAdapter.getDailySnapshot(date)

    expect(history.map((day) => day.date)).toEqual([
      '2026-02-18',
      '2026-02-19',
      '2026-02-20',
    ])
    expect(history[2].liters).toBe(snapshot.waterLiters)
  })

  it('reads one day of meals with their HealthKit names and macro totals', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 1, 20, 22))
    const day = {
      startDate: new Date(2026, 1, 20),
      endDate: new Date(2026, 1, 20, 22),
    }
    const grams: Record<string, number> = {
      HKQuantityTypeIdentifierDietaryProtein: 41.6,
      HKQuantityTypeIdentifierDietaryCarbohydrates: 120.4,
      HKQuantityTypeIdentifierDietaryFatTotal: 35.2,
    }
    hk.queryStatisticsForQuantity.mockImplementation((identifier: string) =>
      Promise.resolve({ sumQuantity: { quantity: grams[identifier] } }),
    )
    hk.queryQuantitySamples.mockResolvedValue([
      {
        quantity: 412.4,
        startDate: new Date(2026, 1, 20, 8),
        metadata: { HKFoodType: ' Oatmeal ' },
      },
      { quantity: 250, startDate: new Date(2026, 1, 20, 13), metadata: {} },
      { quantity: Number.NaN, startDate: new Date(2026, 1, 20, 14) },
      { quantity: -5, startDate: new Date(2026, 1, 20, 15) },
    ])

    const log = await iosHealthKitAdapter.getFoodLog(new Date(2026, 1, 20, 12))

    for (const identifier of Object.keys(grams)) {
      expect(hk.queryStatisticsForQuantity).toHaveBeenCalledWith(
        identifier,
        ['cumulativeSum'],
        { unit: 'g', filter: { date: day } },
      )
    }
    expect(hk.queryQuantitySamples).toHaveBeenCalledWith(
      'HKQuantityTypeIdentifierDietaryEnergyConsumed',
      { limit: 0, ascending: true, unit: 'kcal', filter: { date: day } },
    )
    expect(log).toEqual({
      proteinGrams: 42,
      carbsGrams: 120,
      fatGrams: 35,
      meals: [
        {
          name: 'Oatmeal',
          kcal: 412,
          startISO: new Date(2026, 1, 20, 8).toISOString(),
        },
        {
          name: null,
          kcal: 250,
          startISO: new Date(2026, 1, 20, 13).toISOString(),
        },
      ],
    })
  })

  it('keeps failed macro reads unavailable but rejects a failed meal read', async () => {
    const date = new Date(2026, 1, 20, 12)
    hk.queryStatisticsForQuantity.mockRejectedValue(new Error('macros denied'))
    await expect(iosHealthKitAdapter.getFoodLog(date)).resolves.toEqual({
      proteinGrams: null,
      carbsGrams: null,
      fatGrams: null,
      meals: [],
    })

    hk.queryQuantitySamples.mockRejectedValue(new Error('energy denied'))
    await expect(iosHealthKitAdapter.getFoodLog(date)).rejects.toThrow(
      'energy denied',
    )
  })

  it('returns an empty food log without querying when HealthKit is unavailable', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' })

    await expect(
      iosHealthKitAdapter.getFoodLog(new Date(2026, 1, 20, 12)),
    ).resolves.toEqual({
      proteinGrams: null,
      carbsGrams: null,
      fatGrams: null,
      meals: [],
    })
    expect(hk.queryQuantitySamples).not.toHaveBeenCalled()
  })

  it('keeps mock meals summing to the daily snapshot calories', async () => {
    const date = new Date(2026, 1, 20, 12)
    const log = await deterministicMockAdapter.getFoodLog(date)
    const snapshot = await deterministicMockAdapter.getDailySnapshot(date)

    expect(log.meals.reduce((sum, meal) => sum + meal.kcal, 0)).toBe(
      snapshot.dietaryCalories,
    )
  })

  it('uses HealthKit cumulative totals instead of summing overlapping device samples', async () => {
    hk.queryStatisticsForQuantity.mockResolvedValue({
      sumQuantity: { quantity: 1200 },
    })
    hk.queryQuantitySamples.mockImplementation((identifier: string) =>
      Promise.resolve(
        identifier === 'HKQuantityTypeIdentifierBodyMass'
          ? []
          : [{ quantity: 1200 }, { quantity: 1200 }],
      ),
    )
    const date = new Date(2026, 1, 15, 12)

    const snapshot = await iosHealthKitAdapter.getDailySnapshot(date)

    expect(snapshot.steps).toBe(1200)
    expect(hk.queryStatisticsForQuantity).toHaveBeenCalledWith(
      'HKQuantityTypeIdentifierStepCount',
      ['cumulativeSum'],
      {
        unit: 'count',
        filter: {
          date: {
            startDate: new Date(2026, 1, 15),
            endDate: new Date(2026, 1, 16),
          },
        },
      },
    )
    expect(hk.queryQuantitySamples).not.toHaveBeenCalledWith(
      'HKQuantityTypeIdentifierStepCount',
      expect.anything(),
    )
  })

  it('bounds cardiac reads to the selected day while retaining the latest weigh-in', async () => {
    hk.getMostRecentQuantitySample.mockResolvedValue({ quantity: 78.4 })

    const snapshot = await iosHealthKitAdapter.getDailySnapshot(
      new Date(2026, 1, 15, 12),
    )

    expect(snapshot).toMatchObject({
      heartRate: null,
      hrv: null,
      restingHeartRate: null,
      bodyMassKg: 78.4,
    })
    for (const [identifier, unit] of [
      ['HKQuantityTypeIdentifierHeartRate', 'count/min'],
      ['HKQuantityTypeIdentifierHeartRateVariabilitySDNN', 'ms'],
      ['HKQuantityTypeIdentifierRestingHeartRate', 'count/min'],
    ]) {
      expect(hk.queryQuantitySamples).toHaveBeenCalledWith(identifier, {
        limit: 1,
        ascending: false,
        unit,
        filter: {
          date: {
            startDate: new Date(2026, 1, 15),
            endDate: new Date(2026, 1, 16),
          },
        },
      })
    }
    expect(hk.getMostRecentQuantitySample).toHaveBeenCalledTimes(1)
    expect(hk.getMostRecentQuantitySample).toHaveBeenCalledWith(
      'HKQuantityTypeIdentifierBodyMass',
      'kg',
    )
  })

  it('counts overlapping sleep sources and stages only once', async () => {
    hk.queryCategorySamples.mockResolvedValue([
      {
        value: 4,
        startDate: new Date(2026, 1, 15, 3),
        endDate: new Date(2026, 1, 15, 7),
      },
      {
        value: 1,
        startDate: new Date(2026, 1, 14, 23),
        endDate: new Date(2026, 1, 15, 7),
      },
      {
        value: 3,
        startDate: new Date(2026, 1, 14, 23),
        endDate: new Date(2026, 1, 15, 3),
      },
    ])

    const snapshot = await iosHealthKitAdapter.getDailySnapshot(
      new Date(2026, 1, 15, 12),
    )

    expect(snapshot.sleepHours).toBe(8)
  })

  it('clips sleep to the selected night and excludes intervals wholly outside it', async () => {
    hk.queryCategorySamples.mockResolvedValue([
      {
        value: 1,
        startDate: new Date(2026, 1, 14, 17),
        endDate: new Date(2026, 1, 14, 19),
      },
      {
        value: 1,
        startDate: new Date(2026, 1, 15, 11),
        endDate: new Date(2026, 1, 15, 13),
      },
      {
        value: 1,
        startDate: new Date(2026, 1, 15, 14),
        endDate: new Date(2026, 1, 15, 16),
      },
    ])

    const snapshot = await iosHealthKitAdapter.getDailySnapshot(
      new Date(2026, 1, 15, 12),
    )

    expect(snapshot.sleepHours).toBe(2)
  })

  it('reports malformed sleep intervals as unavailable without exposing sample details', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation()
    hk.queryCategorySamples.mockResolvedValue([
      {
        value: 1,
        startDate: 'invalid',
        endDate: new Date(2026, 1, 15, 7),
      },
    ])

    const snapshot = await iosHealthKitAdapter.getDailySnapshot(
      new Date(2026, 1, 15, 12),
    )

    expect(snapshot.sleepHours).toBeNull()
    expect(warn).toHaveBeenCalledWith(
      '[HealthSnapshotSource] sleep read failed (TypeError)',
    )
  })

  it('does not turn sleep outside the window into an observed zero at its boundaries', async () => {
    hk.queryCategorySamples.mockResolvedValue([
      {
        value: 1,
        startDate: new Date(2026, 1, 14, 17),
        endDate: new Date(2026, 1, 14, 18),
      },
      {
        value: 1,
        startDate: new Date(2026, 1, 15, 12),
        endDate: new Date(2026, 1, 15, 13),
      },
    ])

    const snapshot = await iosHealthKitAdapter.getDailySnapshot(
      new Date(2026, 1, 15, 12),
    )

    expect(snapshot.sleepHours).toBeNull()
  })

  it.each([iosHealthKitAdapter, deterministicMockAdapter])(
    'labels snapshots using the requested local calendar day near midnight',
    async (adapter) => {
      const snapshot = await adapter.getDailySnapshot(
        new Date(2026, 8, 13, 0, 30),
      )
      expect(snapshot.date).toBe('2026-09-13')
    },
  )

  it.each([
    ['iOS', iosHealthKitAdapter],
    ['mock', deterministicMockAdapter],
  ])('exposes only read operations in the %s source contract', (_, adapter) => {
    const readOnlyMethods: Record<keyof HealthSnapshotSource, true> = {
      getDailySnapshot: true,
      getFoodLog: true,
      getStepHistory: true,
      getWaterHistory: true,
      getWorkoutHistory: true,
      getStairWorkouts: true,
      getStairSessions: true,
      subscribeToWorkoutChanges: true,
      requestAuthorization: true,
      isAvailable: true,
    }

    expect(Object.keys(adapter).sort()).toEqual(
      Object.keys(readOnlyMethods).sort(),
    )
    expect(adapter).not.toHaveProperty('saveCardioWorkout')
  })

  it('requestAuthorization requests exactly the read scopes with an empty write scope while mock completes immediately', async () => {
    hk.isHealthDataAvailable.mockResolvedValue(true)
    hk.requestAuthorization.mockResolvedValue(true)

    await expect(iosHealthKitAdapter.requestAuthorization()).resolves.toBe(true)
    expect(hk.requestAuthorization).toHaveBeenCalledWith({
      toRead: [
        'HKQuantityTypeIdentifierStepCount',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKQuantityTypeIdentifierHeartRate',
        'HKQuantityTypeIdentifierRestingHeartRate',
        'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
        'HKQuantityTypeIdentifierDietaryWater',
        'HKQuantityTypeIdentifierFlightsClimbed',
        'HKQuantityTypeIdentifierBodyMass',
        'HKQuantityTypeIdentifierDietaryEnergyConsumed',
        'HKQuantityTypeIdentifierDietaryProtein',
        'HKQuantityTypeIdentifierDietaryCarbohydrates',
        'HKQuantityTypeIdentifierDietaryFatTotal',
        'HKCategoryTypeIdentifierSleepAnalysis',
        'HKWorkoutTypeIdentifier',
        'HKCharacteristicTypeIdentifierDateOfBirth',
      ],
      toShare: [],
    })

    await expect(deterministicMockAdapter.requestAuthorization()).resolves.toBe(
      true,
    )
  })

  it('does not treat authorization completion as proof of read access or log empty reads as denied', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

    await expect(iosHealthKitAdapter.requestAuthorization()).resolves.toBe(true)
    await expect(
      iosHealthKitAdapter.getDailySnapshot(
        new Date('2026-02-15T12:00:00.000Z'),
      ),
    ).resolves.toEqual(emptySnapshot)
    expect(consoleWarnSpy).not.toHaveBeenCalled()
  })

  it('propagates authorization request failures instead of reporting success', async () => {
    const error = new Error('Authorization request failed')
    hk.requestAuthorization.mockRejectedValue(error)

    await expect(iosHealthKitAdapter.requestAuthorization()).rejects.toBe(error)
  })

  it('requestAuthorization returns false without requesting permissions when iOS health data is unavailable', async () => {
    hk.isHealthDataAvailable.mockResolvedValue(false)

    await expect(iosHealthKitAdapter.requestAuthorization()).resolves.toBe(
      false,
    )
    expect(hk.requestAuthorization).not.toHaveBeenCalled()
  })

  it.each(['android', 'web'])(
    'does not call native HealthKit APIs through the iOS adapter on %s',
    async (platform) => {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: platform,
      })

      await expect(iosHealthKitAdapter.requestAuthorization()).resolves.toBe(
        false,
      )
      await expect(
        iosHealthKitAdapter.getDailySnapshot(
          new Date('2026-02-15T12:00:00.000Z'),
        ),
      ).resolves.toEqual(emptySnapshot)
      await expect(
        iosHealthKitAdapter.getStepHistory(new Date(2026, 1, 20, 12), 1),
      ).resolves.toEqual([{ date: '2026-02-20', steps: null }])
      expect(
        iosHealthKitAdapter.subscribeToWorkoutChanges(jest.fn()),
      ).toBeNull()

      for (const nativeMethod of Object.values(hk)) {
        expect(nativeMethod).not.toHaveBeenCalled()
      }
    },
  )

  it('isAvailable reports iOS availability only for the real adapter and false for the mock adapter', () => {
    expect(iosHealthKitAdapter.isAvailable()).toBe(true)

    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    })

    expect(iosHealthKitAdapter.isAvailable()).toBe(false)
    expect(deterministicMockAdapter.isAvailable()).toBe(false)
  })

  it('queries weigh-in history once within a strict 14-day local window', async () => {
    const morning = new Date(2026, 1, 15, 7)
    hk.queryQuantitySamples.mockImplementation((identifier: string) =>
      Promise.resolve(
        identifier === 'HKQuantityTypeIdentifierBodyMass'
          ? [{ quantity: 78.46, startDate: morning }]
          : [],
      ),
    )
    const snapshot = await iosHealthKitAdapter.getDailySnapshot(
      new Date(2026, 1, 15, 12),
    )
    expect(snapshot.bodyMassHistory).toEqual([
      { kilograms: 78.46, startISO: morning.toISOString() },
    ])
    const calls = hk.queryQuantitySamples.mock.calls.filter(
      ([identifier]: [string]) =>
        identifier === 'HKQuantityTypeIdentifierBodyMass',
    )
    expect(calls).toEqual([
      [
        'HKQuantityTypeIdentifierBodyMass',
        {
          limit: 0,
          ascending: true,
          unit: 'kg',
          filter: {
            date: {
              startDate: new Date(2026, 1, 2),
              endDate: new Date(2026, 1, 16),
              strictStartDate: true,
            },
          },
        },
      ],
    ])
  })

  it('keeps a failed weigh-in history separate from the latest known body mass', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation()
    hk.getMostRecentQuantitySample.mockResolvedValue({ quantity: 78.4 })
    hk.queryQuantitySamples.mockImplementation((identifier: string) =>
      identifier === 'HKQuantityTypeIdentifierBodyMass'
        ? Promise.reject(new Error('private weight details'))
        : Promise.resolve([]),
    )
    const snapshot = await iosHealthKitAdapter.getDailySnapshot(
      new Date(2026, 1, 15, 12),
    )
    expect(snapshot.bodyMassKg).toBe(78.4)
    expect(snapshot.bodyMassHistory).toBeNull()
    expect(warn.mock.calls).toEqual([
      ['[HealthSnapshotSource] body mass history read failed (Error)'],
    ])
  })

  it('does not round a 29:59 run up to the 30-minute goal', async () => {
    hk.queryWorkoutSamples.mockResolvedValue([
      {
        workoutActivityType: 37,
        duration: { quantity: 1799, unit: 's' },
        startDate: new Date(2026, 1, 15, 8),
        endDate: new Date(2026, 1, 15, 8, 29, 59),
      },
    ])
    const snapshot = await iosHealthKitAdapter.getDailySnapshot(
      new Date(2026, 1, 15, 12),
    )
    expect(snapshot.workouts[0].durationMinutes).toBe(1799 / 60)
    expect(snapshot.workouts[0].durationMinutes).toBeLessThan(30)
  })

  it('reads heart rate for only the longest selected-day stair workout, not daily heart rate', async () => {
    const shortStats = jest.fn()
    const longStats = jest.fn(async () => ({
      averageQuantity: { quantity: 142.6 },
    }))
    const yesterdayStats = jest.fn()
    const stairs = (day: number, seconds: number, getStatistic: jest.Mock) => ({
      workoutActivityType: 44,
      duration: { quantity: seconds, unit: 's' },
      startDate: new Date(2026, 1, day, 8),
      endDate: new Date(2026, 1, day, 9),
      getStatistic,
    })
    hk.queryWorkoutSamples.mockResolvedValue([
      stairs(15, 1200, shortStats),
      stairs(15, 2400, longStats),
      stairs(14, 3600, yesterdayStats),
    ])
    const snapshot = await iosHealthKitAdapter.getDailySnapshot(
      new Date(2026, 1, 15, 12),
    )
    expect(snapshot.workouts[1]).toMatchObject({
      kind: 'stairClimber',
      durationMinutes: 40,
      averageHeartRate: 143,
    })
    expect(longStats).toHaveBeenCalledWith(
      'HKQuantityTypeIdentifierHeartRate',
      'count/min',
    )
    expect(shortStats).not.toHaveBeenCalled()
    expect(yesterdayStats).not.toHaveBeenCalled()
  })

  it('keeps a synced stair session when its heart-rate statistics fail', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation()
    hk.queryWorkoutSamples.mockResolvedValue([
      {
        workoutActivityType: 44,
        duration: { quantity: 1800, unit: 's' },
        startDate: new Date(2026, 1, 15, 8),
        endDate: new Date(2026, 1, 15, 8, 30),
        getStatistic: jest.fn(async () => {
          throw new Error('private heart rate')
        }),
      },
    ])
    const snapshot = await iosHealthKitAdapter.getDailySnapshot(
      new Date(2026, 1, 15, 12),
    )
    expect(snapshot.workouts[0]).toMatchObject({
      kind: 'stairClimber',
      durationMinutes: 30,
      averageHeartRate: null,
    })
    expect(warn.mock.calls).toEqual([
      ['[HealthSnapshotSource] stair workout heart rate read failed (Error)'],
    ])
  })

  it('reads every stair session of the day with its heart rate and an age-predicted max', async () => {
    const stair = (hour: number, bpm: number) => ({
      workoutActivityType: 44,
      duration: { quantity: 1800, unit: 's' },
      startDate: new Date(2026, 1, 15, hour),
      endDate: new Date(2026, 1, 15, hour, 30),
      getStatistic: jest.fn(async () => ({
        averageQuantity: { quantity: bpm },
      })),
    })
    hk.queryWorkoutSamples.mockResolvedValue([
      {
        ...stair(8, 140),
        // Manual pause overlapping a motion pause, then an open pause at the end.
        events: [
          { type: 1, startDate: new Date(2026, 1, 15, 8, 5) },
          { type: 5, startDate: new Date(2026, 1, 15, 8, 6) },
          { type: 2, startDate: new Date(2026, 1, 15, 8, 7) },
          { type: 3, startDate: new Date(2026, 1, 15, 8, 8) },
          { type: 6, startDate: new Date(2026, 1, 15, 8, 9) },
          { type: 1, startDate: new Date(2026, 1, 15, 8, 25) },
        ],
      },
      { ...stair(9, 0), workoutActivityType: 37 },
      stair(18, 130),
    ])
    hk.queryQuantitySamples.mockResolvedValue([
      { quantity: 120.4, startDate: new Date(2026, 1, 15, 8, 1) },
      { quantity: Number.NaN, startDate: new Date(2026, 1, 15, 8, 2) },
    ])
    hk.getDateOfBirthAsync.mockResolvedValue(new Date(1990, 5, 1))

    const sessions = await iosHealthKitAdapter.getStairSessions(
      new Date(2026, 1, 15, 12),
    )

    expect(hk.queryQuantitySamples).toHaveBeenCalledWith(
      'HKQuantityTypeIdentifierHeartRate',
      {
        limit: 0,
        ascending: true,
        unit: 'count/min',
        filter: {
          date: {
            startDate: new Date(2026, 1, 15, 18),
            endDate: new Date(2026, 1, 15, 18, 30),
          },
        },
      },
    )
    expect(sessions).toHaveLength(2)
    expect(sessions[0]).toMatchObject({
      workout: { averageHeartRate: 140, durationMinutes: 30 },
      samples: [
        { bpm: 120, startISO: new Date(2026, 1, 15, 8, 1).toISOString() },
      ],
      // Born June 1990, so still 35 in February 2026.
      maxHeartRate: 185,
      pauses: [
        {
          startISO: new Date(2026, 1, 15, 8, 5).toISOString(),
          endISO: new Date(2026, 1, 15, 8, 9).toISOString(),
        },
        {
          startISO: new Date(2026, 1, 15, 8, 25).toISOString(),
          endISO: new Date(2026, 1, 15, 8, 30).toISOString(),
        },
      ],
    })
    expect(sessions[1].pauses).toEqual([])
    expect(sessions[1].workout).toMatchObject({
      averageHeartRate: 130,
      startISO: new Date(2026, 1, 15, 18).toISOString(),
    })
  })

  it('returns no stair sessions without one, and no zones without a birth date', async () => {
    await expect(
      iosHealthKitAdapter.getStairSessions(new Date(2026, 1, 15, 12)),
    ).resolves.toEqual([])
    expect(hk.queryQuantitySamples).not.toHaveBeenCalledWith(
      'HKQuantityTypeIdentifierHeartRate',
      expect.anything(),
    )

    hk.queryWorkoutSamples.mockResolvedValue([
      {
        workoutActivityType: 44,
        duration: { quantity: 600, unit: 's' },
        startDate: new Date(2026, 1, 15, 8),
        endDate: new Date(2026, 1, 15, 8, 10),
        getStatistic: jest.fn(async () => undefined),
      },
    ])
    await expect(
      iosHealthKitAdapter.getStairSessions(new Date(2026, 1, 15, 12)),
    ).resolves.toMatchObject([{ samples: [], maxHeartRate: null }])
  })

  it('keeps a stair session when its heart-rate samples fail to load', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation()
    hk.queryWorkoutSamples.mockResolvedValue([
      {
        workoutActivityType: 44,
        duration: { quantity: 1800, unit: 's' },
        startDate: new Date(2026, 1, 15, 8),
        endDate: new Date(2026, 1, 15, 8, 30),
        getStatistic: jest.fn(async () => ({
          averageQuantity: { quantity: 141 },
        })),
      },
    ])
    hk.queryQuantitySamples.mockRejectedValue(new Error('private samples'))

    await expect(
      iosHealthKitAdapter.getStairSessions(new Date(2026, 1, 15, 12)),
    ).resolves.toMatchObject([
      {
        workout: { durationMinutes: 30, averageHeartRate: 141 },
        samples: [],
      },
    ])
    expect(warn).toHaveBeenCalledWith(
      '[HealthSnapshotSource] stair heart rate read failed (Error)',
    )
  })

  it('reads all stair history in one query, oldest first', async () => {
    hk.queryWorkoutSamples.mockResolvedValue([
      {
        workoutActivityType: 44,
        duration: { quantity: 1200, unit: 's' },
        startDate: new Date(2023, 0, 2, 8),
        endDate: new Date(2023, 0, 2, 8, 20),
      },
    ])
    await expect(iosHealthKitAdapter.getStairWorkouts()).resolves.toMatchObject(
      [{ kind: 'stairClimber', durationMinutes: 20 }],
    )
    expect(hk.queryWorkoutSamples).toHaveBeenCalledWith({
      limit: 0,
      ascending: true,
      filter: { workoutActivityType: 44 },
    })
  })

  it('observes saved workouts and removes the native subscription', () => {
    const remove = jest.fn()
    hk.subscribeToChanges.mockReturnValue({ remove })
    const onChange = jest.fn()
    const unsubscribe = iosHealthKitAdapter.subscribeToWorkoutChanges(onChange)
    expect(hk.subscribeToChanges).toHaveBeenCalledWith(
      'HKWorkoutTypeIdentifier',
      expect.any(Function),
    )
    hk.subscribeToChanges.mock.calls[0][1]({
      typeIdentifier: 'HKWorkoutTypeIdentifier',
    })
    expect(onChange).toHaveBeenCalledTimes(1)
    unsubscribe?.()
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('reports observation failures without exposing native error details', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation()
    const onChange = jest.fn()
    iosHealthKitAdapter.subscribeToWorkoutChanges(onChange)
    hk.subscribeToChanges.mock.calls[0][1]({
      errorMessage: 'private native details',
    })
    expect(onChange).not.toHaveBeenCalled()
    hk.subscribeToChanges.mockImplementationOnce(() => {
      throw new Error('private native details')
    })
    expect(iosHealthKitAdapter.subscribeToWorkoutChanges(onChange)).toBeNull()
    expect(warn.mock.calls).toEqual([
      ['[HealthSnapshotSource] workout observation failed (Error)'],
      ['[HealthSnapshotSource] workout observation failed (Error)'],
    ])
  })
})
