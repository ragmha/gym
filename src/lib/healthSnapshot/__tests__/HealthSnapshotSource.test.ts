import { Platform } from 'react-native'

import { iosHealthKitAdapter } from '@/lib/healthSnapshot/iosAdapter'
import { deterministicMockAdapter } from '@/lib/healthSnapshot/mockAdapter'
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
      dietaryCalories: 1841,
      workouts: [
        {
          activityName: 'Running',
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
    { activityType: 37, label: 'Running' },
    { activityType: 13, label: 'Cycling' },
    { activityType: 63, label: 'High intensity interval training' },
    { activityType: 50, label: 'Traditional strength training' },
    { activityType: 3000, label: 'Other' },
  ])(
    'decodes native workout type $activityType as $label',
    async ({ activityType, label }) => {
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
        activityName: label,
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
    hk.queryQuantitySamples.mockResolvedValue([{ quantity: 0 }])
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
      dietaryCalories: 0,
      workouts: [
        {
          activityName: 'Running',
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
        activityName: 'Running',
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
    expect(consoleWarnSpy).toHaveBeenCalledTimes(11)
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

  it('uses one daily statistics collection and one bulk workouts query for intensity', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-20T10:00:00.000Z'))

    hk.queryStatisticsCollectionForQuantity.mockResolvedValue([
      { sumQuantity: { quantity: 3500 }, startDate: new Date(2026, 1, 19) },
      { sumQuantity: { quantity: 500 }, startDate: new Date(2026, 1, 20) },
    ])
    hk.queryWorkoutSamples.mockResolvedValue([
      {
        startDate: '2026-02-19T18:00:00.000Z',
        endDate: '2026-02-19T18:30:00.000Z',
      },
      {
        startDate: '2026-02-18T18:00:00.000Z',
        endDate: '2026-02-18T18:30:00.000Z',
      },
    ])

    const intensity = await iosHealthKitAdapter.getRangeIntensity(7)

    expect(hk.queryQuantitySamples).not.toHaveBeenCalled()
    expect(hk.queryStatisticsCollectionForQuantity).toHaveBeenCalledTimes(1)
    expect(hk.queryStatisticsCollectionForQuantity).toHaveBeenCalledWith(
      'HKQuantityTypeIdentifierStepCount',
      ['cumulativeSum'],
      new Date(2026, 1, 14),
      { day: 1 },
      {
        unit: 'count',
        filter: {
          date: {
            startDate: new Date(2026, 1, 14),
            endDate: new Date('2026-02-20T10:00:00.000Z'),
          },
        },
      },
    )
    expect(hk.queryWorkoutSamples).toHaveBeenCalledTimes(1)
    expect(intensity.get('2026-02-19')).toBe(8500)
    expect(intensity.get('2026-02-20')).toBe(500)
    expect(intensity.get('2026-02-18')).toBe(5000)

    jest.useRealTimers()
  })

  it('omits missing step measurements from range intensity but retains observed zero', async () => {
    hk.queryStatisticsCollectionForQuantity.mockResolvedValue([
      { startDate: new Date(2026, 1, 18) },
      { sumQuantity: null, startDate: new Date(2026, 1, 19) },
      { sumQuantity: { quantity: 0 }, startDate: new Date(2026, 1, 20) },
    ])

    const intensity = await iosHealthKitAdapter.getRangeIntensity(7)

    expect(Array.from(intensity.entries())).toEqual([['2026-02-20', 0]])
  })

  it('does not fill an empty intensity range with zero measurements', async () => {
    await expect(iosHealthKitAdapter.getRangeIntensity(7)).resolves.toEqual(
      new Map(),
    )
  })

  it('keeps range reads isolated when steps are rejected and workouts remain readable', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    hk.queryStatisticsCollectionForQuantity.mockRejectedValue(
      new Error('steps denied'),
    )
    hk.queryWorkoutSamples.mockResolvedValue([
      {
        startDate: '2026-02-19T08:00:00.000Z',
        endDate: '2026-02-19T08:30:00.000Z',
      },
    ])

    await expect(iosHealthKitAdapter.getRangeIntensity(7)).resolves.toEqual(
      new Map([['2026-02-19', 5000]]),
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[HealthSnapshotSource] intensity steps read failed (Error)',
    )
  })

  it('leaves range measurements absent when every range read is rejected', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    hk.queryStatisticsCollectionForQuantity.mockRejectedValue(
      new Error('steps denied'),
    )
    hk.queryWorkoutSamples.mockRejectedValue(new Error('workouts denied'))

    await expect(iosHealthKitAdapter.getRangeIntensity(7)).resolves.toEqual(
      new Map(),
    )
    expect(consoleWarnSpy).toHaveBeenCalledTimes(2)
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[HealthSnapshotSource] intensity workouts read failed (Error)',
    )
  })

  it('keeps mock intensity consistent for overlapping date ranges', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-20T10:00:00.000Z'))

    const first = await deterministicMockAdapter.getRangeIntensity(10)
    const second = await deterministicMockAdapter.getRangeIntensity(10)
    const different = await deterministicMockAdapter.getRangeIntensity(11)

    expect(Array.from(second.entries())).toEqual(Array.from(first.entries()))
    expect(Array.from(different.entries())).not.toEqual(
      Array.from(first.entries()),
    )
    expect(first.size).toBeGreaterThan(0)
    for (const [date, steps] of first) {
      expect(different.get(date)).toBe(steps)
    }

    jest.useRealTimers()
  })

  it('uses HealthKit cumulative totals instead of summing overlapping device samples', async () => {
    hk.queryStatisticsForQuantity.mockResolvedValue({
      sumQuantity: { quantity: 1200 },
    })
    hk.queryQuantitySamples.mockResolvedValue([
      { quantity: 1200 },
      { quantity: 1200 },
    ])
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
      getRangeIntensity: true,
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
        'HKCategoryTypeIdentifierSleepAnalysis',
        'HKWorkoutTypeIdentifier',
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
      await expect(iosHealthKitAdapter.getRangeIntensity(7)).resolves.toEqual(
        new Map(),
      )

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
})
