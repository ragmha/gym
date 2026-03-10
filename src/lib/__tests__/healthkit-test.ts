import { Platform } from 'react-native'

import {
  getDailyCalories,
  getDailySteps,
  getRecentWorkouts,
  initializeHealthKit,
  isHealthKitAvailable,
} from '../healthkit'

jest.mock('@kingstinct/react-native-healthkit')

// eslint-disable-next-line @typescript-eslint/no-require-imports
const hk = require('@kingstinct/react-native-healthkit')

describe('healthkit service (@kingstinct)', () => {
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

  describe('isHealthKitAvailable', () => {
    it('returns true on iOS', () => {
      expect(isHealthKitAvailable()).toBe(true)
    })

    it('returns false on Android', () => {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: 'android',
      })
      expect(isHealthKitAvailable()).toBe(false)
    })
  })

  describe('initializeHealthKit', () => {
    it('resolves true on successful authorization', async () => {
      hk.isHealthDataAvailable.mockResolvedValue(true)
      hk.requestAuthorization.mockResolvedValue(true)

      const result = await initializeHealthKit()
      expect(result).toBe(true)
      expect(hk.requestAuthorization).toHaveBeenCalledTimes(1)
    })

    it('resolves false when health data is not available', async () => {
      hk.isHealthDataAvailable.mockResolvedValue(false)

      const result = await initializeHealthKit()
      expect(result).toBe(false)
    })

    it('resolves false on non-iOS platform', async () => {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: 'android',
      })
      const result = await initializeHealthKit()
      expect(result).toBe(false)
    })

    it('resolves false on error', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      hk.isHealthDataAvailable.mockRejectedValue(new Error('fail'))

      const result = await initializeHealthKit()
      expect(result).toBe(false)
      consoleWarnSpy.mockRestore()
    })
  })

  describe('getDailySteps', () => {
    it('returns aggregated step count', async () => {
      hk.queryQuantitySamples.mockResolvedValue([
        { quantity: 3000 },
        { quantity: 5000 },
      ])

      const result = await getDailySteps()
      expect(result).toBe(8000)
    })

    it('returns 0 on error', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      hk.queryQuantitySamples.mockRejectedValue(new Error('denied'))

      const result = await getDailySteps()
      expect(result).toBe(0)
      consoleWarnSpy.mockRestore()
    })

    it('returns 0 on non-iOS', async () => {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: 'android',
      })
      const result = await getDailySteps()
      expect(result).toBe(0)
    })
  })

  describe('getDailyCalories', () => {
    it('returns aggregated calories', async () => {
      hk.queryQuantitySamples.mockResolvedValue([
        { quantity: 150 },
        { quantity: 230 },
      ])

      const result = await getDailyCalories()
      expect(result).toBe(380)
    })

    it('returns 0 on error', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      hk.queryQuantitySamples.mockRejectedValue(new Error('denied'))

      const result = await getDailyCalories()
      expect(result).toBe(0)
      consoleWarnSpy.mockRestore()
    })
  })

  describe('getRecentWorkouts', () => {
    it('maps workout samples to HealthKitWorkout', async () => {
      const start = '2024-01-15T08:00:00.000Z'
      const end = '2024-01-15T08:30:00.000Z'
      hk.queryWorkoutSamples.mockResolvedValue([
        {
          workoutActivityType: 'Running',
          totalEnergyBurned: { quantity: 350 },
          totalDistance: { quantity: 5 },
          startDate: start,
          endDate: end,
        },
      ])

      const result = await getRecentWorkouts(7)
      expect(result).toHaveLength(1)
      expect(result[0].activityName).toBe('Running')
      expect(result[0].calories).toBe(350)
      expect(result[0].distance).toBe(5)
    })

    it('returns empty array on error', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      hk.queryWorkoutSamples.mockRejectedValue(new Error('denied'))

      const result = await getRecentWorkouts()
      expect(result).toEqual([])
      consoleWarnSpy.mockRestore()
    })

    it('returns empty array on non-iOS', async () => {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: 'android',
      })
      const result = await getRecentWorkouts()
      expect(result).toEqual([])
    })
  })
})
