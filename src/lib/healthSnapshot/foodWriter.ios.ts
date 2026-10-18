import {
  AuthorizationStatus,
  type QuantitySampleForSaving,
} from '@kingstinct/react-native-healthkit/types'

import {
  DIETARY_CARBS_IDENTIFIER,
  DIETARY_ENERGY_IDENTIFIER,
  DIETARY_FAT_IDENTIFIER,
  DIETARY_PROTEIN_IDENTIFIER,
  FOOD_CORRELATION_IDENTIFIER,
  FOOD_MIN_NATIVE_VERSION,
  FoodWriteError,
  foodWriterUnavailable,
  validateFoodEntry,
  type FoodWriter,
} from '@/lib/healthSnapshot/food'
import { getHealthKitWriteNativeSupport } from '@/lib/healthSnapshot/healthKitWriteNativeSupport'

type HealthKit = typeof import('@kingstinct/react-native-healthkit')

function loadHealthKit(): HealthKit {
  // Gate before touching native write APIs.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@kingstinct/react-native-healthkit')
}

function getAvailability() {
  const support = getHealthKitWriteNativeSupport(
    FOOD_MIN_NATIVE_VERSION,
    'Add food',
  )
  if (!support.available) return support
  try {
    return loadHealthKit().isHealthDataAvailable()
      ? support
      : foodWriterUnavailable('unavailable')
  } catch {
    return foodWriterUnavailable('unavailable')
  }
}

let saving = false

export const foodWriter: FoodWriter = {
  getAvailability,
  async save(input) {
    if (saving) throw new FoodWriteError('busy')
    const entry = validateFoodEntry(input)
    const availability = getAvailability()
    if (!availability.available) throw new FoodWriteError(availability.reason)
    saving = true
    try {
      const healthKit = loadHealthKit()
      let completed: boolean
      try {
        completed = await healthKit.requestAuthorization({
          toShare: [
            DIETARY_ENERGY_IDENTIFIER,
            DIETARY_PROTEIN_IDENTIFIER,
            DIETARY_CARBS_IDENTIFIER,
            DIETARY_FAT_IDENTIFIER,
          ],
          toRead: [],
        })
      } catch {
        throw new FoodWriteError('authorization')
      }
      if (completed !== true) throw new FoodWriteError('authorization')
      if (
        healthKit.authorizationStatusFor(DIETARY_ENERGY_IDENTIFIER) !==
        AuthorizationStatus.sharingAuthorized
      ) {
        throw new FoodWriteError('denied')
      }
      const { name, kcal, proteinGrams, carbsGrams, fatGrams, eatenAt } =
        validateFoodEntry(entry)
      const metadata = { HKFoodType: name, HKWasUserEntered: true }
      const sample = { startDate: eatenAt, endDate: eatenAt, metadata }
      const samples: QuantitySampleForSaving[] = [
        {
          ...sample,
          quantityType: DIETARY_ENERGY_IDENTIFIER,
          quantity: kcal,
          unit: 'kcal',
        },
      ]
      // Macros are optional: a declined macro grant still saves the calories.
      for (const [quantityType, quantity] of [
        [DIETARY_PROTEIN_IDENTIFIER, proteinGrams],
        [DIETARY_CARBS_IDENTIFIER, carbsGrams],
        [DIETARY_FAT_IDENTIFIER, fatGrams],
      ] as const) {
        if (
          quantity > 0 &&
          healthKit.authorizationStatusFor(quantityType) ===
            AuthorizationStatus.sharingAuthorized
        ) {
          samples.push({ ...sample, quantityType, quantity, unit: 'g' })
        }
      }
      const saved = await healthKit.saveCorrelationSample(
        FOOD_CORRELATION_IDENTIFIER,
        samples,
        eatenAt,
        eatenAt,
        metadata,
      )
      if (
        !saved ||
        typeof saved.uuid !== 'string' ||
        !saved.uuid.trim() ||
        saved.correlationType !== FOOD_CORRELATION_IDENTIFIER ||
        saved.objects?.length !== samples.length
      ) {
        throw new FoodWriteError('save-failed')
      }
    } catch (error) {
      throw error instanceof FoodWriteError
        ? error
        : new FoodWriteError('save-failed')
    } finally {
      saving = false
    }
  },
}
