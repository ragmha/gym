import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import { supportsNativeApplicationVersion } from '@/lib/healthSnapshot/nativeApplicationVersion'

export const BODY_MASS_IDENTIFIER = 'HKQuantityTypeIdentifierBodyMass'
export const BODY_MASS_MIN_NATIVE_VERSION = '1.0.7'

const messages = {
  'invalid-weight':
    'Enter a weight greater than zero in kilograms. Use a decimal point or comma, without thousands separators.',
  'invalid-date': 'Choose a valid measurement date and time.',
  'future-date':
    'The measurement cannot be in the future. Check the date and time.',
  'confirm-time':
    'Confirm that the displayed date and time are when you measured this weight.',
  platform:
    'Adding weight is available only in a compatible iOS app. This preview cannot save to Apple Health.',
  'build-required':
    'A new iOS build is required to add weight. Install version 1.0.7 or later with weight-entry support. A JavaScript update cannot add this capability.',
  unavailable:
    'Apple Health is unavailable on this device. Nothing has been saved.',
  authorization:
    'The Health access request did not complete. Nothing was saved. You can try again.',
  denied:
    'Weight was not saved. Allow this app to write Body Mass in Apple Health, then try again. Read access is separate.',
  'save-failed':
    'Apple Health did not confirm a saved weight. Check Health before retrying to avoid a duplicate. Your form is unchanged.',
  busy: 'A weight is already being saved. Please wait.',
} as const

export type BodyMassErrorCode = keyof typeof messages

export class BodyMassWriteError extends Error {
  constructor(readonly code: BodyMassErrorCode) {
    super(messages[code])
    this.name = 'BodyMassWriteError'
  }
}

export type BodyMassEntry = {
  kilograms: number
  measuredAt: Date
}

export type BodyMassAvailability =
  | { available: true }
  | {
      available: false
      reason: 'platform' | 'build-required' | 'unavailable'
      message: string
    }

export interface BodyMassWriter {
  getAvailability(): BodyMassAvailability
  save(entry: BodyMassEntry): Promise<void>
}

export function bodyMassUnavailable(
  reason: 'platform' | 'build-required' | 'unavailable',
): BodyMassAvailability {
  return { available: false, reason, message: messages[reason] }
}

export function bodyMassErrorMessage(error: unknown): string {
  return error instanceof BodyMassWriteError
    ? messages[error.code]
    : messages['save-failed']
}

export function parseBodyMassKilograms(input: string): number {
  const text = input.trim()
  if (!/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(text)) {
    throw new BodyMassWriteError('invalid-weight')
  }
  const kilograms = Number(text.replace(',', '.'))
  if (!Number.isFinite(kilograms) || kilograms <= 0) {
    throw new BodyMassWriteError('invalid-weight')
  }
  return kilograms
}

export function validateBodyMassEntry(
  entry: BodyMassEntry,
  now = new Date(),
): BodyMassEntry {
  if (
    typeof entry?.kilograms !== 'number' ||
    !Number.isFinite(entry.kilograms) ||
    entry.kilograms <= 0
  ) {
    throw new BodyMassWriteError('invalid-weight')
  }
  if (
    !(entry.measuredAt instanceof Date) ||
    !Number.isFinite(entry.measuredAt.getTime())
  ) {
    throw new BodyMassWriteError('invalid-date')
  }
  if (
    !Number.isFinite(now.getTime()) ||
    entry.measuredAt.getTime() > now.getTime()
  ) {
    throw new BodyMassWriteError('future-date')
  }
  return { kilograms: entry.kilograms, measuredAt: new Date(entry.measuredAt) }
}

export function initialBodyMassDate(selectedDay: Date, now = new Date()): Date {
  if (
    !Number.isFinite(selectedDay.getTime()) ||
    !Number.isFinite(now.getTime())
  ) {
    throw new BodyMassWriteError('invalid-date')
  }
  if (localDateKey(selectedDay) > localDateKey(now)) {
    throw new BodyMassWriteError('future-date')
  }
  if (localDateKey(selectedDay) === localDateKey(now)) return new Date(now)
  const measuredAt = new Date(selectedDay)
  measuredAt.setHours(
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  )
  return measuredAt
}

export function supportsBodyMassNativeVersion(
  version: string | null | undefined,
): boolean {
  return supportsNativeApplicationVersion(version, BODY_MASS_MIN_NATIVE_VERSION)
}
