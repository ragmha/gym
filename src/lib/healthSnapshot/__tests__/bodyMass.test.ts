import {
  BodyMassWriteError,
  bodyMassErrorMessage,
  initialBodyMassDate,
  parseBodyMassKilograms,
  supportsBodyMassNativeVersion,
  validateBodyMassEntry,
  type BodyMassWriter,
} from '@/lib/healthSnapshot/bodyMass'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'

const now = new Date(2026, 8, 21, 15, 42, 18)

describe('Body-mass validation', () => {
  it.each([
    ['78', 78],
    ['78.4', 78.4],
    [' 78,4 ', 78.4],
    ['.5', 0.5],
    [',5', 0.5],
  ])('parses a complete kg value %s', (input, expected) => {
    expect(parseBodyMassKilograms(input)).toBe(expected)
  })

  it.each([
    '',
    ' ',
    '0',
    '0,0',
    '-1',
    '+5',
    'NaN',
    'Infinity',
    '1e3',
    '78kg',
    '78.4x',
    '.',
    '78,',
    '78,4.5',
    '1 000',
    '9'.repeat(400),
  ])('rejects invalid weight text %j', (input) => {
    expect(() => parseBodyMassKilograms(input)).toThrow(BodyMassWriteError)
  })

  it.each([0, -1, NaN, Infinity, -Infinity])(
    'rejects %s kg again at the boundary',
    (kilograms) => {
      expect(() =>
        validateBodyMassEntry({ kilograms, measuredAt: now }, now),
      ).toThrow(BodyMassWriteError)
    },
  )

  it('rejects invalid and future measurement timestamps', () => {
    expect(() =>
      validateBodyMassEntry({ kilograms: 78, measuredAt: new Date(NaN) }, now),
    ).toThrow('Choose a valid')
    expect(() =>
      validateBodyMassEntry(
        { kilograms: 78, measuredAt: new Date(now.getTime() + 1) },
        now,
      ),
    ).toThrow('cannot be in the future')
  })

  it('copies the confirmed measurement timestamp rather than replacing it with save time', () => {
    const measuredAt = new Date(2026, 8, 20, 16, 32)
    const result = validateBodyMassEntry({ kilograms: 78.4, measuredAt }, now)
    expect(result.measuredAt).toEqual(measuredAt)
    expect(result.measuredAt).not.toBe(measuredAt)
  })

  it('defaults today to now and past days to the visible current clock time, never an invented morning', () => {
    expect(initialBodyMassDate(new Date(2026, 8, 21, 12), now)).toEqual(now)
    const past = initialBodyMassDate(new Date(2026, 8, 20, 12), now)
    expect(localDateKey(past)).toBe('2026-09-20')
    expect(past.getHours()).toBe(15)
    expect(past.getMinutes()).toBe(42)
    expect(
      initialBodyMassDate(new Date(2026, 8, 20, 12), now).getSeconds(),
    ).toBe(18)
  })

  it('never silently defaults a future or invalid selected day', () => {
    expect(() => initialBodyMassDate(new Date(NaN), now)).toThrow(
      BodyMassWriteError,
    )
    expect(() => initialBodyMassDate(new Date(2026, 8, 22), now)).toThrow(
      BodyMassWriteError,
    )
  })

  it('never exposes native exception details through error copy', () => {
    const detail = 'private sample weight 78.4 and patient details'
    expect(bodyMassErrorMessage(new Error(detail))).not.toContain(detail)
    const error = new BodyMassWriteError('save-failed')
    error.message = detail
    expect(bodyMassErrorMessage(error)).not.toContain(detail)
  })
})

describe('Native build compatibility', () => {
  it.each([
    null,
    undefined,
    '',
    '1',
    '1.0',
    '1.0.6',
    '0.99.99',
    '1.0.7-beta',
    'invalid',
  ])('fails closed for native version %j', (version) =>
    expect(supportsBodyMassNativeVersion(version)).toBe(false),
  )
  it.each(['1.0.7', '1.0.8', '1.1.0', '2.0.0'])(
    'accepts a compatible stable native version %s',
    (version) => expect(supportsBodyMassNativeVersion(version)).toBe(true),
  )
})

describe('Default body-mass writer', () => {
  it('is explicitly unavailable without an iOS implementation and never pretends to save', async () => {
    const { bodyMassWriter } = jest.requireActual<{
      bodyMassWriter: BodyMassWriter
    }>('@/lib/healthSnapshot/bodyMassWriter.ts')
    expect(bodyMassWriter.getAvailability()).toMatchObject({
      available: false,
      reason: 'platform',
    })
    await expect(
      bodyMassWriter.save({
        kilograms: 78.4,
        measuredAt: new Date(2020, 0, 1),
      }),
    ).rejects.toMatchObject({ code: 'platform' })
  })
})
