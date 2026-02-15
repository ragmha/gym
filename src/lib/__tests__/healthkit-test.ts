import { Platform } from 'react-native'

import {
  initializeHealthKit,
  isHealthKitAvailable,
  getDailySteps,
  getDailyCalories,
  getRecentWorkouts,
} from '../healthkit'

// Mock the react-native-health module
jest.mock('react-native-health')

describe('healthkit service', () => {
  const originalPlatform = Platform.OS
  let mockHealthKit: any

  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' })
    
    // Get the mocked module
    mockHealthKit = jest.requireMock('react-native-health').default
  })

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform,
    })
  })

  describe('isHealthKitAvailable', () => {
    it('returns true on iOS when module is loaded', () => {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: 'ios',
      })
      const result = isHealthKitAvailable()
      expect(typeof result).toBe('boolean')
    })

    it('returns false on Android', () => {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: 'android',
      })
      const result = isHealthKitAvailable()
      expect(result).toBe(false)
    })
  })

  describe('initializeHealthKit', () => {
    it('resolves true on successful iOS initialization', async () => {
      mockHealthKit.initHealthKit.mockImplementation((_perms: any, callback: (error: string | null) => void) => {
        callback(null)
      })
      
      const result = await initializeHealthKit()
      expect(result).toBe(true)
      expect(mockHealthKit.initHealthKit).toHaveBeenCalledTimes(1)
    })

    it('resolves false on iOS initialization error', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      mockHealthKit.initHealthKit.mockImplementation((_perms: any, callback: (error: string | null) => void) => {
        callback('HealthKit not available')
      })
      
      const result = await initializeHealthKit()
      expect(result).toBe(false)
      expect(consoleWarnSpy).toHaveBeenCalledWith('[HealthKit] Init error:', 'HealthKit not available')
      
      consoleWarnSpy.mockRestore()
    })

    it('resolves false on non-iOS platform', async () => {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: 'android',
      })
      const result = await initializeHealthKit()
      expect(result).toBe(false)
      expect(mockHealthKit.initHealthKit).not.toHaveBeenCalled()
    })
  })

  describe('getDailySteps', () => {
    it('returns step count on successful iOS request', async () => {
      mockHealthKit.getStepCount.mockImplementation((_opts: any, callback: (err: string | null, results: { value: number }) => void) => {
        callback(null, { value: 8543 })
      })
      
      const result = await getDailySteps()
      expect(result).toBe(8543)
      expect(mockHealthKit.getStepCount).toHaveBeenCalledTimes(1)
    })

    it('returns 0 on iOS error', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      mockHealthKit.getStepCount.mockImplementation((_opts: any, callback: (err: string | null) => void) => {
        callback('Permission denied')
      })
      
      const result = await getDailySteps()
      expect(result).toBe(0)
      expect(consoleWarnSpy).toHaveBeenCalledWith('[HealthKit] Steps error:', 'Permission denied')
      
      consoleWarnSpy.mockRestore()
    })

    it('handles null/undefined results gracefully', async () => {
      mockHealthKit.getStepCount.mockImplementation((_opts: any, callback: (err: string | null, results: any) => void) => {
        callback(null, null)
      })
      
      const result = await getDailySteps()
      expect(result).toBe(0)
    })

    it('handles undefined value property gracefully', async () => {
      mockHealthKit.getStepCount.mockImplementation((_opts: any, callback: (err: string | null, results: any) => void) => {
        callback(null, { value: undefined })
      })
      
      const result = await getDailySteps()
      expect(result).toBe(0)
    })

    it('accepts custom date parameter', async () => {
      mockHealthKit.getStepCount.mockImplementation((opts: any, callback: (err: string | null, results: { value: number }) => void) => {
        expect(opts.date).toBeDefined()
        callback(null, { value: 1234 })
      })
      
      const customDate = new Date('2024-01-15')
      const result = await getDailySteps(customDate)
      expect(result).toBe(1234)
    })

    it('resolves to 0 on non-iOS platform', async () => {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: 'android',
      })
      const result = await getDailySteps()
      expect(result).toBe(0)
      expect(mockHealthKit.getStepCount).not.toHaveBeenCalled()
    })
  })

  describe('getDailyCalories', () => {
    it('returns aggregated calories on successful iOS request', async () => {
      mockHealthKit.getActiveEnergyBurned.mockImplementation((_opts: any, callback: (err: string | null, results: { value: number }[]) => void) => {
        callback(null, [{ value: 150 }, { value: 230 }, { value: 95 }])
      })
      
      const result = await getDailyCalories()
      expect(result).toBe(475) // 150 + 230 + 95
      expect(mockHealthKit.getActiveEnergyBurned).toHaveBeenCalledTimes(1)
    })

    it('rounds aggregated calories to nearest integer', async () => {
      mockHealthKit.getActiveEnergyBurned.mockImplementation((_opts: any, callback: (err: string | null, results: { value: number }[]) => void) => {
        callback(null, [{ value: 100.4 }, { value: 200.6 }])
      })
      
      const result = await getDailyCalories()
      expect(result).toBe(301) // Math.round(301.0)
    })

    it('returns 0 on iOS error', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      mockHealthKit.getActiveEnergyBurned.mockImplementation((_opts: any, callback: (err: string | null) => void) => {
        callback('Permission denied')
      })
      
      const result = await getDailyCalories()
      expect(result).toBe(0)
      expect(consoleWarnSpy).toHaveBeenCalledWith('[HealthKit] Calories error:', 'Permission denied')
      
      consoleWarnSpy.mockRestore()
    })

    it('handles null/undefined results gracefully', async () => {
      mockHealthKit.getActiveEnergyBurned.mockImplementation((_opts: any, callback: (err: string | null, results: any) => void) => {
        callback(null, null)
      })
      
      const result = await getDailyCalories()
      expect(result).toBe(0)
    })

    it('handles empty results array', async () => {
      mockHealthKit.getActiveEnergyBurned.mockImplementation((_opts: any, callback: (err: string | null, results: any[]) => void) => {
        callback(null, [])
      })
      
      const result = await getDailyCalories()
      expect(result).toBe(0)
    })

    it('handles null/undefined values in array', async () => {
      mockHealthKit.getActiveEnergyBurned.mockImplementation((_opts: any, callback: (err: string | null, results: any[]) => void) => {
        callback(null, [{ value: 100 }, { value: null }, { value: undefined }, { value: 50 }])
      })
      
      const result = await getDailyCalories()
      expect(result).toBe(150) // 100 + 0 + 0 + 50
    })

    it('accepts custom date parameter', async () => {
      mockHealthKit.getActiveEnergyBurned.mockImplementation((opts: any, callback: (err: string | null, results: { value: number }[]) => void) => {
        expect(opts.startDate).toBeDefined()
        expect(opts.endDate).toBeDefined()
        callback(null, [{ value: 250 }])
      })
      
      const customDate = new Date('2024-01-15T14:30:00')
      const result = await getDailyCalories(customDate)
      expect(result).toBe(250)
    })

    it('resolves to 0 on non-iOS platform', async () => {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: 'android',
      })
      const result = await getDailyCalories()
      expect(result).toBe(0)
      expect(mockHealthKit.getActiveEnergyBurned).not.toHaveBeenCalled()
    })
  })

  describe('getRecentWorkouts', () => {
    it('returns workouts on successful iOS request', async () => {
      const mockWorkouts = [
        {
          activityName: 'Running',
          calories: 350,
          distance: 5000,
          duration: 30,
          start: '2024-01-15T08:00:00.000Z',
          end: '2024-01-15T08:30:00.000Z',
        },
        {
          activityName: 'Cycling',
          calories: 280,
          distance: 12000,
          duration: 45,
          start: '2024-01-14T17:00:00.000Z',
          end: '2024-01-14T17:45:00.000Z',
        },
      ]
      
      mockHealthKit.getSamples.mockImplementation((_opts: any, callback: (err: string | null, results: any[]) => void) => {
        callback(null, mockWorkouts)
      })
      
      const result = await getRecentWorkouts(7)
      expect(result).toEqual(mockWorkouts)
      expect(mockHealthKit.getSamples).toHaveBeenCalledTimes(1)
    })

    it('uses default of 7 days when no parameter provided', async () => {
      mockHealthKit.getSamples.mockImplementation((opts: any, callback: (err: string | null, results: any[]) => void) => {
        expect(opts.type).toBe('Workout')
        expect(opts.startDate).toBeDefined()
        expect(opts.endDate).toBeDefined()
        callback(null, [])
      })
      
      await getRecentWorkouts()
      expect(mockHealthKit.getSamples).toHaveBeenCalledTimes(1)
    })

    it('accepts custom daysBack parameter', async () => {
      mockHealthKit.getSamples.mockImplementation((_opts: any, callback: (err: string | null, results: any[]) => void) => {
        callback(null, [])
      })
      
      await getRecentWorkouts(14)
      expect(mockHealthKit.getSamples).toHaveBeenCalledTimes(1)
    })

    it('returns empty array on iOS error', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      mockHealthKit.getSamples.mockImplementation((_opts: any, callback: (err: string | null) => void) => {
        callback('Permission denied')
      })
      
      const result = await getRecentWorkouts()
      expect(result).toEqual([])
      expect(consoleWarnSpy).toHaveBeenCalledWith('[HealthKit] Workouts error:', 'Permission denied')
      
      consoleWarnSpy.mockRestore()
    })

    it('handles null/undefined results gracefully', async () => {
      mockHealthKit.getSamples.mockImplementation((_opts: any, callback: (err: string | null, results: any) => void) => {
        callback(null, null)
      })
      
      const result = await getRecentWorkouts()
      expect(result).toEqual([])
    })

    it('handles empty workout array', async () => {
      mockHealthKit.getSamples.mockImplementation((_opts: any, callback: (err: string | null, results: any[]) => void) => {
        callback(null, [])
      })
      
      const result = await getRecentWorkouts()
      expect(result).toEqual([])
    })

    it('resolves to empty array on non-iOS platform', async () => {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: 'android',
      })
      const result = await getRecentWorkouts()
      expect(result).toEqual([])
      expect(mockHealthKit.getSamples).not.toHaveBeenCalled()
    })
  })
})
