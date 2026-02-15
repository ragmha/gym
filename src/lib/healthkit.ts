import { Platform } from 'react-native'

// Lazy import to avoid crashes on Android/web
let AppleHealthKit: any = null
let HealthPermission: any = null

if (Platform.OS === 'ios') {
  try {
    const healthModule = require('react-native-health')
    AppleHealthKit = healthModule.default
    HealthPermission = healthModule.HealthPermission
  } catch {
    // Native module not available (e.g. Expo Go without dev client)
  }
}

export interface HealthKitWorkout {
  activityName: string
  calories: number
  distance: number
  duration: number // minutes
  start: string
  end: string
}

const PERMISSIONS =
  Platform.OS === 'ios'
    ? {
        permissions: {
          read: [
            HealthPermission?.StepCount,
            HealthPermission?.ActiveEnergyBurned,
            HealthPermission?.Workout,
          ].filter(Boolean),
          write: [],
        },
      }
    : { permissions: { read: [], write: [] } }

/**
 * Initialize HealthKit and request authorization.
 * Returns true if initialization succeeded.
 */
export function initializeHealthKit(): Promise<boolean> {
  if (Platform.OS !== 'ios' || !AppleHealthKit) {
    return Promise.resolve(false)
  }

  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(PERMISSIONS, (error: string) => {
      if (error) {
        console.warn('[HealthKit] Init error:', error)
        resolve(false)
      } else {
        resolve(true)
      }
    })
  })
}

/**
 * Check if HealthKit is available on this device.
 */
export function isHealthKitAvailable(): boolean {
  return Platform.OS === 'ios' && AppleHealthKit != null
}

/**
 * Get today's step count.
 */
export function getDailySteps(date?: Date): Promise<number> {
  if (!isHealthKitAvailable()) return Promise.resolve(0)

  const options = {
    date: (date ?? new Date()).toISOString(),
    includeManuallyAdded: true,
  }

  return new Promise((resolve) => {
    AppleHealthKit.getStepCount(
      options,
      (err: string, results: { value: number }) => {
        if (err) {
          console.warn('[HealthKit] Steps error:', err)
          resolve(0)
        } else {
          resolve(results?.value ?? 0)
        }
      },
    )
  })
}

/**
 * Get today's active energy burned (kilocalories).
 */
export function getDailyCalories(date?: Date): Promise<number> {
  if (!isHealthKitAvailable()) return Promise.resolve(0)

  const d = date ?? new Date()
  const startDate = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
  ).toISOString()
  const endDate = d.toISOString()

  const options = {
    startDate,
    endDate,
    ascending: false,
  }

  return new Promise((resolve) => {
    AppleHealthKit.getActiveEnergyBurned(
      options,
      (err: string, results: { value: number }[]) => {
        if (err) {
          console.warn('[HealthKit] Calories error:', err)
          resolve(0)
        } else {
          const total = (results ?? []).reduce(
            (sum, r) => sum + (r.value ?? 0),
            0,
          )
          resolve(Math.round(total))
        }
      },
    )
  })
}

/**
 * Get recent workouts from HealthKit within the last N days.
 */
export function getRecentWorkouts(
  daysBack: number = 7,
): Promise<HealthKitWorkout[]> {
  if (!isHealthKitAvailable()) return Promise.resolve([])

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)

  const options = {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    type: 'Workout',
  }

  return new Promise((resolve) => {
    AppleHealthKit.getSamples(
      options,
      (err: string, results: HealthKitWorkout[]) => {
        if (err) {
          console.warn('[HealthKit] Workouts error:', err)
          resolve([])
        } else {
          resolve(results ?? [])
        }
      },
    )
  })
}
