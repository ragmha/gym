import { AuthorizationStatus } from '@kingstinct/react-native-healthkit/types'

import {
  BODY_MASS_IDENTIFIER,
  BodyMassWriteError,
  bodyMassUnavailable,
  validateBodyMassEntry,
  type BodyMassAvailability,
  type BodyMassWriter,
} from '@/lib/healthSnapshot/bodyMass'
import { getBodyMassNativeSupport } from '@/lib/healthSnapshot/bodyMassNativeSupport'

type HealthKit = typeof import('@kingstinct/react-native-healthkit')

function loadHealthKit(): HealthKit {
  // The immutable binary gate must run before touching native write APIs.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@kingstinct/react-native-healthkit')
}

function getAvailability(): BodyMassAvailability {
  const support = getBodyMassNativeSupport()
  if (!support.available) return support
  try {
    return loadHealthKit().isHealthDataAvailable()
      ? { available: true }
      : bodyMassUnavailable('unavailable')
  } catch {
    return bodyMassUnavailable('unavailable')
  }
}

let saving = false

export const bodyMassWriter: BodyMassWriter = {
  getAvailability,
  async save(input) {
    if (saving) throw new BodyMassWriteError('busy')
    const { kilograms, measuredAt } = validateBodyMassEntry(input)
    const availability = getAvailability()
    if (!availability.available)
      throw new BodyMassWriteError(availability.reason)
    saving = true
    try {
      const healthKit = loadHealthKit()
      let completed: boolean
      try {
        completed = await healthKit.requestAuthorization({
          toShare: [BODY_MASS_IDENTIFIER],
          toRead: [],
        })
      } catch {
        throw new BodyMassWriteError('authorization')
      }
      if (completed !== true) throw new BodyMassWriteError('authorization')
      // This is write authorization, unlike HealthKit's private read grants.
      if (
        healthKit.authorizationStatusFor(BODY_MASS_IDENTIFIER) !==
        AuthorizationStatus.sharingAuthorized
      ) {
        throw new BodyMassWriteError('denied')
      }
      validateBodyMassEntry({ kilograms, measuredAt })
      const saved = await healthKit.saveQuantitySample(
        BODY_MASS_IDENTIFIER,
        'kg',
        kilograms,
        measuredAt,
        measuredAt,
        { HKWasUserEntered: true },
      )
      if (
        !saved ||
        typeof saved.uuid !== 'string' ||
        !saved.uuid.trim() ||
        saved.quantityType !== BODY_MASS_IDENTIFIER
      ) {
        throw new BodyMassWriteError('save-failed')
      }
    } catch (error) {
      throw error instanceof BodyMassWriteError
        ? error
        : new BodyMassWriteError('save-failed')
    } finally {
      saving = false
    }
  },
}
