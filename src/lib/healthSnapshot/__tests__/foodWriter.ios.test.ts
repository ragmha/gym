import { AuthorizationStatus } from '@kingstinct/react-native-healthkit/types'

import {
  DIETARY_CARBS_IDENTIFIER,
  DIETARY_ENERGY_IDENTIFIER,
  DIETARY_FAT_IDENTIFIER,
  DIETARY_PROTEIN_IDENTIFIER,
  FOOD_CORRELATION_IDENTIFIER,
} from '@/lib/healthSnapshot/food'
import { foodWriter } from '@/lib/healthSnapshot/foodWriter.ios'

let mockSupport:
  | { available: true }
  | { available: false; reason: 'build-required'; message: string } = {
  available: true,
}
const saved = (objects = 4) => ({
  uuid: 'saved-food-correlation',
  correlationType: FOOD_CORRELATION_IDENTIFIER,
  objects: Array.from({ length: objects }, () => ({})),
})
const mockHealthKit = {
  isHealthDataAvailable: jest.fn(() => true),
  requestAuthorization: jest.fn<Promise<boolean>, [unknown]>(async () => true),
  authorizationStatusFor: jest.fn<AuthorizationStatus, [string]>(
    () => AuthorizationStatus.sharingAuthorized,
  ),
  saveCorrelationSample: jest.fn<
    Promise<ReturnType<typeof saved> | undefined>,
    unknown[]
  >(async () => saved()),
}

jest.mock('@kingstinct/react-native-healthkit', () => mockHealthKit)
jest.mock('@/lib/healthSnapshot/healthKitWriteNativeSupport', () => ({
  getHealthKitWriteNativeSupport: () => mockSupport,
}))

const eatenAt = new Date(2026, 9, 17, 12, 30)
const entry = {
  name: ' Chicken rice bowl ',
  kcal: 640,
  proteinGrams: 42,
  carbsGrams: 70,
  fatGrams: 18,
  eatenAt,
}
const metadata = { HKFoodType: 'Chicken rice bowl', HKWasUserEntered: true }

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date(2026, 9, 17, 13))
  jest.clearAllMocks()
  mockSupport = { available: true }
  mockHealthKit.isHealthDataAvailable.mockReturnValue(true)
  mockHealthKit.requestAuthorization.mockResolvedValue(true)
  mockHealthKit.authorizationStatusFor.mockReturnValue(
    AuthorizationStatus.sharingAuthorized,
  )
  mockHealthKit.saveCorrelationSample.mockResolvedValue(saved())
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe('iOS food writer', () => {
  it('checks availability without requesting permission or writing', () => {
    expect(foodWriter.getAvailability()).toEqual({ available: true })
    mockSupport = {
      available: false,
      reason: 'build-required',
      message: 'build',
    }
    expect(foodWriter.getAvailability()).toBe(mockSupport)
    expect(mockHealthKit.requestAuthorization).not.toHaveBeenCalled()
    expect(mockHealthKit.saveCorrelationSample).not.toHaveBeenCalled()
  })

  it('saves one user-entered Food correlation with energy and macros', async () => {
    await expect(foodWriter.save(entry)).resolves.toBeUndefined()

    expect(mockHealthKit.requestAuthorization).toHaveBeenCalledWith({
      toShare: [
        DIETARY_ENERGY_IDENTIFIER,
        DIETARY_PROTEIN_IDENTIFIER,
        DIETARY_CARBS_IDENTIFIER,
        DIETARY_FAT_IDENTIFIER,
      ],
      toRead: [],
    })
    const sample = { startDate: eatenAt, endDate: eatenAt, metadata }
    expect(mockHealthKit.saveCorrelationSample).toHaveBeenCalledWith(
      FOOD_CORRELATION_IDENTIFIER,
      [
        {
          ...sample,
          quantityType: DIETARY_ENERGY_IDENTIFIER,
          quantity: 640,
          unit: 'kcal',
        },
        {
          ...sample,
          quantityType: DIETARY_PROTEIN_IDENTIFIER,
          quantity: 42,
          unit: 'g',
        },
        {
          ...sample,
          quantityType: DIETARY_CARBS_IDENTIFIER,
          quantity: 70,
          unit: 'g',
        },
        {
          ...sample,
          quantityType: DIETARY_FAT_IDENTIFIER,
          quantity: 18,
          unit: 'g',
        },
      ],
      eatenAt,
      eatenAt,
      metadata,
    )
  })

  it.each([
    [
      'there are no macros',
      { ...entry, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 },
      AuthorizationStatus.sharingAuthorized,
    ],
    ['macro access is declined', entry, AuthorizationStatus.sharingDenied],
  ])('saves calories alone when %s', async (_, input, macroStatus) => {
    mockHealthKit.authorizationStatusFor.mockImplementation((type) =>
      type === DIETARY_ENERGY_IDENTIFIER
        ? AuthorizationStatus.sharingAuthorized
        : macroStatus,
    )
    mockHealthKit.saveCorrelationSample.mockResolvedValue(saved(1))

    await expect(foodWriter.save(input)).resolves.toBeUndefined()
    const [, samples] = mockHealthKit.saveCorrelationSample.mock.calls[0]
    expect(samples).toEqual([
      expect.objectContaining({
        quantityType: DIETARY_ENERGY_IDENTIFIER,
        quantity: 640,
      }),
    ])
  })

  it.each([
    { ...entry, name: '  ' },
    { ...entry, name: 'x'.repeat(61) },
    { ...entry, kcal: 0 },
    { ...entry, kcal: 640.5 },
    { ...entry, kcal: 5001 },
    { ...entry, proteinGrams: -1 },
    { ...entry, proteinGrams: NaN },
    { ...entry, carbsGrams: 1001 },
    { ...entry, fatGrams: -1 },
    { ...entry, eatenAt: new Date(NaN) },
    { ...entry, eatenAt: new Date(2026, 9, 17, 14) },
    { ...entry, eatenAt: new Date(2026, 9, 16, 23, 59) },
  ])('validates before requesting permission: %j', async (invalid) => {
    await expect(foodWriter.save(invalid)).rejects.toBeInstanceOf(Error)
    expect(mockHealthKit.requestAuthorization).not.toHaveBeenCalled()
    expect(mockHealthKit.saveCorrelationSample).not.toHaveBeenCalled()
  })

  it('does not save when Dietary Energy write access is denied', async () => {
    mockHealthKit.authorizationStatusFor.mockReturnValue(
      AuthorizationStatus.sharingDenied,
    )
    await expect(foodWriter.save(entry)).rejects.toMatchObject({
      code: 'denied',
    })
    expect(mockHealthKit.saveCorrelationSample).not.toHaveBeenCalled()
  })

  it.each([
    ['nothing', undefined],
    ['a dropped sample', saved(1)],
    ['another correlation', { ...saved(), correlationType: 'other' }],
    ['a blank uuid', { ...saved(), uuid: ' ' }],
  ])('treats %s as an unconfirmed save', async (_, result) => {
    mockHealthKit.saveCorrelationSample.mockResolvedValue(result)
    await expect(foodWriter.save(entry)).rejects.toMatchObject({
      code: 'save-failed',
    })
  })

  it('rejects a second save while one is in flight', async () => {
    let finish: (value: ReturnType<typeof saved>) => void = () => undefined
    mockHealthKit.saveCorrelationSample.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const first = foodWriter.save(entry)
    await expect(foodWriter.save(entry)).rejects.toMatchObject({
      code: 'busy',
    })
    finish(saved())
    await expect(first).resolves.toBeUndefined()
    expect(mockHealthKit.saveCorrelationSample).toHaveBeenCalledTimes(1)
  })

  it('sanitizes native failures and releases the save lock for explicit retry', async () => {
    mockHealthKit.saveCorrelationSample.mockRejectedValueOnce(
      new Error('private meal Chicken rice bowl 640 kcal'),
    )
    const failure = await foodWriter.save(entry).catch((error) => error)
    expect(failure).toMatchObject({ code: 'save-failed' })
    expect(String(failure.message)).not.toMatch(/Chicken|640/)
    await expect(foodWriter.save(entry)).resolves.toBeUndefined()
    expect(mockHealthKit.saveCorrelationSample).toHaveBeenCalledTimes(2)
  })
})
