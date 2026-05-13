import { WorkoutActivityType } from '@kingstinct/react-native-healthkit/types'
import { Platform } from 'react-native'

import { iosHealthKitAdapter } from '../iosAdapter'
import { deterministicMockAdapter } from '../mockAdapter'

jest.mock('@kingstinct/react-native-healthkit')

// eslint-disable-next-line @typescript-eslint/no-require-imports
const hk = require('@kingstinct/react-native-healthkit')

describe('HealthSnapshotSource adapters', () => {
  const originalPlatform = Platform.OS

  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' })
  })

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform,
    })
  })

  it('iosHealthKitAdapter.getDailySnapshot rounds metrics and computes sleep hours from sleep samples', async () => {
    const date = new Date('2026-02-15T12:00:00.000Z')
    const sleepStart = new Date('2026-02-15T01:00:00.000Z')
    const sleepEnd = new Date('2026-02-15T07:45:00.000Z')

    hk.queryQuantitySamples.mockImplementation((identifier: string) => {
      const quantities: Record<string, { quantity: number }[]> = {
        HKQuantityTypeIdentifierStepCount: [
          { quantity: 1234.4 },
          { quantity: 2.2 },
        ],
        HKQuantityTypeIdentifierActiveEnergyBurned: [
          { quantity: 199.5 },
          { quantity: 50.2 },
        ],
        HKQuantityTypeIdentifierDietaryWater: [
          { quantity: 0.74 },
          { quantity: 0.75 },
        ],
        HKQuantityTypeIdentifierFlightsClimbed: [
          { quantity: 3.2 },
          { quantity: 1.3 },
        ],
      }
      return Promise.resolve(quantities[identifier] ?? [])
    })
    hk.queryCategorySamples.mockResolvedValue([
      { value: 1, startDate: sleepStart, endDate: sleepEnd },
    ])
    hk.getMostRecentQuantitySample.mockImplementation((identifier: string) => {
      const quantities: Record<string, number> = {
        HKQuantityTypeIdentifierHeartRate: 71.6,
        HKQuantityTypeIdentifierHeartRateVariabilitySDNN: 42.4,
        HKQuantityTypeIdentifierRestingHeartRate: 55.5,
      }
      return Promise.resolve({ quantity: quantities[identifier] })
    })
    hk.queryWorkoutSamples.mockResolvedValue([
      {
        workoutActivityType: 'Running',
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

    hk.queryQuantitySamples.mockImplementation((identifier: string) => {
      if (identifier === 'HKQuantityTypeIdentifierActiveEnergyBurned') {
        return Promise.reject(new Error('calories denied'))
      }
      return Promise.resolve([{ quantity: 1000 }])
    })
    hk.queryCategorySamples.mockResolvedValue([])
    hk.getMostRecentQuantitySample.mockResolvedValue({ quantity: 70 })
    hk.queryWorkoutSamples.mockResolvedValue([])

    const snapshot = await iosHealthKitAdapter.getDailySnapshot(date)

    expect(snapshot.calories).toBeNull()
    expect(snapshot.steps).toBe(1000)
    expect(snapshot.waterLiters).toBe(1000)
    expect(snapshot.workouts).toEqual([])

    consoleWarnSpy.mockRestore()
  })

  it('deterministicMockAdapter.getDailySnapshot is stable for past dates and refreshes for today as the clock advances', async () => {
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

    // Past dates are seeded by the date itself -- deterministic.
    expect(second).toEqual(first)
    expect(different).not.toEqual(first)

    // "Today" is seeded by Date.now() so two snapshots taken at different
    // moments on the same calendar day differ -- the user-visible
    // pull-to-refresh behaviour. No Math.random() involved.
    const todayAtTen = await deterministicMockAdapter.getDailySnapshot(
      new Date('2026-02-20T08:00:00.000Z'),
    )
    jest.setSystemTime(new Date('2026-02-20T10:01:00.000Z'))
    const todayAtTenOhOne = await deterministicMockAdapter.getDailySnapshot(
      new Date('2026-02-20T08:00:00.000Z'),
    )
    expect(todayAtTen.date).toBe('2026-02-20')
    expect(todayAtTenOhOne).not.toEqual(todayAtTen)

    jest.useRealTimers()
  })

  it('iosHealthKitAdapter.getRangeIntensity uses one bulk steps query and one bulk workouts query with workout boosts', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-20T10:00:00.000Z'))

    hk.queryQuantitySamples.mockResolvedValue([
      { quantity: 1000, startDate: '2026-02-19T08:00:00.000Z' },
      { quantity: 2500, startDate: '2026-02-19T12:00:00.000Z' },
      { quantity: 500, startDate: '2026-02-20T08:00:00.000Z' },
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

    expect(hk.queryQuantitySamples).toHaveBeenCalledTimes(1)
    expect(hk.queryQuantitySamples).toHaveBeenCalledWith(
      'HKQuantityTypeIdentifierStepCount',
      expect.objectContaining({ limit: 0 }),
    )
    expect(hk.queryWorkoutSamples).toHaveBeenCalledTimes(1)
    expect(intensity.get('2026-02-19')).toBe(8500)
    expect(intensity.get('2026-02-20')).toBe(500)
    expect(intensity.get('2026-02-18')).toBe(5000)

    jest.useRealTimers()
  })

  it('deterministicMockAdapter.getRangeIntensity returns a deterministic map seeded by daysBack', async () => {
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

    jest.useRealTimers()
  })

  it('saveCardioWorkout writes mixedCardio on iOS, mock succeeds, and non-positive durations no-op', async () => {
    const startDate = new Date('2026-02-20T08:00:00.000Z')
    const endDate = new Date('2026-02-20T08:30:00.000Z')

    await expect(
      iosHealthKitAdapter.saveCardioWorkout({
        startDate,
        endDate,
        durationMinutes: 30,
        caloriesBurned: 220,
      }),
    ).resolves.toBe(true)

    expect(hk.saveWorkoutSample).toHaveBeenCalledWith(
      WorkoutActivityType.mixedCardio,
      [
        {
          quantityType: 'HKQuantityTypeIdentifierActiveEnergyBurned',
          quantity: 220,
          unit: 'kcal',
          startDate,
          endDate,
        },
      ],
      startDate,
      endDate,
      { energyBurned: 220 },
    )

    hk.saveWorkoutSample.mockClear()

    await expect(
      iosHealthKitAdapter.saveCardioWorkout({
        startDate,
        endDate,
        durationMinutes: 0,
      }),
    ).resolves.toBe(false)
    await expect(
      deterministicMockAdapter.saveCardioWorkout({
        startDate,
        endDate,
        durationMinutes: 30,
      }),
    ).resolves.toBe(true)
    await expect(
      deterministicMockAdapter.saveCardioWorkout({
        startDate,
        endDate,
        durationMinutes: 0,
      }),
    ).resolves.toBe(false)
    expect(hk.saveWorkoutSample).not.toHaveBeenCalled()
  })

  it('requestAuthorization uses documented read and write permissions for iOS while mock authorizes immediately', async () => {
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
        'HKCategoryTypeIdentifierSleepAnalysis',
        'HKWorkoutTypeIdentifier',
      ],
      toShare: [
        'HKWorkoutTypeIdentifier',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
      ],
    })

    await expect(deterministicMockAdapter.requestAuthorization()).resolves.toBe(
      true,
    )
  })

  it('requestAuthorization returns false without requesting permissions when iOS health data is unavailable', async () => {
    hk.isHealthDataAvailable.mockResolvedValue(false)

    await expect(iosHealthKitAdapter.requestAuthorization()).resolves.toBe(
      false,
    )
    expect(hk.requestAuthorization).not.toHaveBeenCalled()
  })

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
