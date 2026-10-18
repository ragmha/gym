import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import type { HealthKitWriteAvailability } from '@/lib/healthSnapshot/healthKitWriteNativeSupport'

export const DIETARY_ENERGY_IDENTIFIER =
  'HKQuantityTypeIdentifierDietaryEnergyConsumed'
export const DIETARY_PROTEIN_IDENTIFIER =
  'HKQuantityTypeIdentifierDietaryProtein'
export const DIETARY_CARBS_IDENTIFIER =
  'HKQuantityTypeIdentifierDietaryCarbohydrates'
export const DIETARY_FAT_IDENTIFIER = 'HKQuantityTypeIdentifierDietaryFatTotal'
export const FOOD_CORRELATION_IDENTIFIER = 'HKCorrelationTypeIdentifierFood'
export const FOOD_MIN_NATIVE_VERSION = '1.0.11'

const messages = {
  'invalid-name': 'The meal needs a name before it can be saved.',
  'invalid-kcal': 'Meal calories must be a whole number from 1 to 5000.',
  'invalid-macros':
    'Meal protein, carbs and fat must each be between 0 and 1000 g.',
  'invalid-date': 'Choose a valid meal time.',
  'future-date': 'Meal time cannot be in the future.',
  'other-day': 'Only meals eaten today can be added. Nothing was saved.',
  platform:
    'Food entry is available only in a compatible iOS app. This preview cannot save to Apple Health.',
  'build-required':
    'A new iOS build is required to add food. Install version 1.0.11 or later.',
  unavailable: 'Apple Health is unavailable on this device. Nothing was saved.',
  authorization:
    'The Health access request did not complete. Nothing was saved. You can try again.',
  denied:
    'The meal was not saved. Allow this app to write Dietary Energy in Apple Health, then try again.',
  'save-failed':
    'Apple Health did not confirm the saved meal. Check Health before retrying to avoid a duplicate.',
  busy: 'The meal is already being saved. Please wait.',
} as const

export type FoodWriteErrorCode = keyof typeof messages

export class FoodWriteError extends Error {
  constructor(readonly code: FoodWriteErrorCode) {
    super(messages[code])
    this.name = 'FoodWriteError'
  }
}

export type FoodEntry = {
  name: string
  kcal: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  eatenAt: Date
}

const MACROS = ['proteinGrams', 'carbsGrams', 'fatGrams'] as const

export interface FoodWriter {
  getAvailability(): HealthKitWriteAvailability
  save(entry: FoodEntry): Promise<void>
}

export function foodWriterUnavailable(
  reason: 'platform' | 'build-required' | 'unavailable',
): HealthKitWriteAvailability {
  return { available: false, reason, message: messages[reason] }
}

export function foodErrorMessage(error: unknown): string {
  return error instanceof FoodWriteError
    ? messages[error.code]
    : messages['save-failed']
}

export function validateFoodEntry(
  entry: FoodEntry,
  now = new Date(),
): FoodEntry {
  const name = typeof entry?.name === 'string' ? entry.name.trim() : ''
  if (!name || name.length > 60) throw new FoodWriteError('invalid-name')
  if (!Number.isInteger(entry.kcal) || entry.kcal < 1 || entry.kcal > 5000) {
    throw new FoodWriteError('invalid-kcal')
  }
  for (const macro of MACROS) {
    const grams = entry[macro]
    if (
      typeof grams !== 'number' ||
      !Number.isFinite(grams) ||
      grams < 0 ||
      grams > 1000
    ) {
      throw new FoodWriteError('invalid-macros')
    }
  }
  if (
    !(entry.eatenAt instanceof Date) ||
    !Number.isFinite(entry.eatenAt.getTime())
  ) {
    throw new FoodWriteError('invalid-date')
  }
  if (
    !Number.isFinite(now.getTime()) ||
    entry.eatenAt.getTime() > now.getTime()
  ) {
    throw new FoodWriteError('future-date')
  }
  if (localDateKey(entry.eatenAt) !== localDateKey(now)) {
    throw new FoodWriteError('other-day')
  }
  return {
    name,
    kcal: entry.kcal,
    proteinGrams: entry.proteinGrams,
    carbsGrams: entry.carbsGrams,
    fatGrams: entry.fatGrams,
    eatenAt: new Date(entry.eatenAt),
  }
}
