import { supportsNativeApplicationVersion } from '@/lib/healthSnapshot/nativeApplicationVersion'
import type { HealthKitWriteAvailability } from '@/lib/healthSnapshot/healthKitWriteNativeSupport'

export const DIETARY_WATER_IDENTIFIER = 'HKQuantityTypeIdentifierDietaryWater'
export const WATER_MIN_NATIVE_VERSION = '1.0.9'

const messages = {
  'invalid-water': 'Enter a water amount greater than zero.',
  'invalid-date': 'Choose a valid water measurement time.',
  'future-date': 'Water measurement time cannot be in the future.',
  platform:
    'Water entry is available only in a compatible iOS app. This preview cannot save to Apple Health.',
  'build-required':
    'A new iOS build is required to add water. Install version 1.0.9 or later.',
  unavailable: 'Apple Health is unavailable on this device. Nothing was saved.',
  authorization:
    'The Health access request did not complete. Nothing was saved. You can try again.',
  denied:
    'Water was not saved. Allow this app to write Dietary Water in Apple Health, then try again.',
  'save-failed':
    'Apple Health did not confirm the saved water sample. Check Health before retrying to avoid a duplicate.',
  busy: 'Water is already being saved. Please wait.',
} as const

export type WaterWriteErrorCode = keyof typeof messages

export class WaterWriteError extends Error {
  constructor(readonly code: WaterWriteErrorCode) {
    super(messages[code])
    this.name = 'WaterWriteError'
  }
}

export type WaterEntry = {
  liters: number
  measuredAt: Date
}

export interface WaterWriter {
  getAvailability(): HealthKitWriteAvailability
  save(entry: WaterEntry): Promise<void>
}

export function waterWriterUnavailable(
  reason: 'platform' | 'build-required' | 'unavailable',
): HealthKitWriteAvailability {
  const message =
    reason === 'platform'
      ? messages.platform
      : reason === 'build-required'
        ? messages['build-required']
        : messages.unavailable
  return { available: false, reason, message }
}

export function waterErrorMessage(error: unknown): string {
  return error instanceof WaterWriteError
    ? messages[error.code]
    : messages['save-failed']
}

export function validateWaterEntry(
  entry: WaterEntry,
  now = new Date(),
): WaterEntry {
  if (
    typeof entry?.liters !== 'number' ||
    !Number.isFinite(entry.liters) ||
    entry.liters <= 0
  ) {
    throw new WaterWriteError('invalid-water')
  }
  if (
    !(entry.measuredAt instanceof Date) ||
    !Number.isFinite(entry.measuredAt.getTime())
  ) {
    throw new WaterWriteError('invalid-date')
  }
  if (
    !Number.isFinite(now.getTime()) ||
    entry.measuredAt.getTime() > now.getTime()
  ) {
    throw new WaterWriteError('future-date')
  }
  return { liters: entry.liters, measuredAt: new Date(entry.measuredAt) }
}

export function supportsWaterNativeVersion(
  version: string | null | undefined,
): boolean {
  return supportsNativeApplicationVersion(version, WATER_MIN_NATIVE_VERSION)
}
