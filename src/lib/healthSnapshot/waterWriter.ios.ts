import { AuthorizationStatus } from '@kingstinct/react-native-healthkit/types'

import { getHealthKitWriteNativeSupport } from '@/lib/healthSnapshot/healthKitWriteNativeSupport'
import {
  DIETARY_WATER_IDENTIFIER,
  WATER_MIN_NATIVE_VERSION,
  WaterWriteError,
  validateWaterEntry,
  waterWriterUnavailable,
  type WaterWriter,
} from '@/lib/healthSnapshot/water'

type HealthKit = typeof import('@kingstinct/react-native-healthkit')

function loadHealthKit(): HealthKit {
  // Gate before touching native write APIs.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@kingstinct/react-native-healthkit')
}

function getAvailability() {
  const support = getHealthKitWriteNativeSupport(
    WATER_MIN_NATIVE_VERSION,
    'Add water',
  )
  if (!support.available) return support
  try {
    return loadHealthKit().isHealthDataAvailable()
      ? support
      : waterWriterUnavailable('unavailable')
  } catch {
    return waterWriterUnavailable('unavailable')
  }
}

let saving = false

export const waterWriter: WaterWriter = {
  getAvailability,
  async save(input) {
    if (saving) throw new WaterWriteError('busy')
    const { liters, measuredAt } = validateWaterEntry(input)
    const availability = getAvailability()
    if (!availability.available) throw new WaterWriteError(availability.reason)
    saving = true
    try {
      const healthKit = loadHealthKit()
      let completed: boolean
      try {
        completed = await healthKit.requestAuthorization({
          toShare: [DIETARY_WATER_IDENTIFIER],
          toRead: [],
        })
      } catch {
        throw new WaterWriteError('authorization')
      }
      if (completed !== true) throw new WaterWriteError('authorization')
      if (
        healthKit.authorizationStatusFor(DIETARY_WATER_IDENTIFIER) !==
        AuthorizationStatus.sharingAuthorized
      ) {
        throw new WaterWriteError('denied')
      }
      validateWaterEntry({ liters, measuredAt })
      const saved = await healthKit.saveQuantitySample(
        DIETARY_WATER_IDENTIFIER,
        'l',
        liters,
        measuredAt,
        measuredAt,
        { HKWasUserEntered: true },
      )
      if (
        !saved ||
        typeof saved.uuid !== 'string' ||
        !saved.uuid.trim() ||
        saved.quantityType !== DIETARY_WATER_IDENTIFIER
      ) {
        throw new WaterWriteError('save-failed')
      }
    } catch (error) {
      throw error instanceof WaterWriteError
        ? error
        : new WaterWriteError('save-failed')
    } finally {
      saving = false
    }
  },
}
