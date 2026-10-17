import { AuthorizationStatus } from '@kingstinct/react-native-healthkit/types'

import { DIETARY_WATER_IDENTIFIER } from '@/lib/healthSnapshot/water'
import { waterWriter } from '@/lib/healthSnapshot/waterWriter.ios'

let mockSupport = { available: true as const }
const mockHealthKit = {
  isHealthDataAvailable: jest.fn(() => true),
  requestAuthorization: jest.fn<Promise<boolean>, [unknown]>(async () => true),
  authorizationStatusFor: jest.fn(() => AuthorizationStatus.sharingAuthorized),
  saveQuantitySample: jest.fn<
    Promise<{ uuid: string; quantityType: string } | undefined>,
    unknown[]
  >(async () => ({
    uuid: 'saved-water-sample',
    quantityType: DIETARY_WATER_IDENTIFIER,
  })),
}

jest.mock('@kingstinct/react-native-healthkit', () => mockHealthKit)
jest.mock('@/lib/healthSnapshot/healthKitWriteNativeSupport', () => ({
  getHealthKitWriteNativeSupport: () => mockSupport,
}))

const entry = { liters: 0.25, measuredAt: new Date(2026, 9, 17, 12) }

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
  mockHealthKit.saveQuantitySample.mockResolvedValue({
    uuid: 'saved-water-sample',
    quantityType: DIETARY_WATER_IDENTIFIER,
  })
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe('iOS Dietary Water writer', () => {
  it('checks availability without requesting permission or writing', () => {
    expect(waterWriter.getAvailability()).toEqual({ available: true })
    expect(mockHealthKit.requestAuthorization).not.toHaveBeenCalled()
    expect(mockHealthKit.saveQuantitySample).not.toHaveBeenCalled()
  })

  it('requests only water write permission and requires a confirmed saved sample', async () => {
    await expect(waterWriter.save(entry)).resolves.toBeUndefined()
    expect(mockHealthKit.requestAuthorization).toHaveBeenCalledWith({
      toShare: [DIETARY_WATER_IDENTIFIER],
      toRead: [],
    })
    expect(mockHealthKit.authorizationStatusFor).toHaveBeenCalledWith(
      DIETARY_WATER_IDENTIFIER,
    )
    expect(mockHealthKit.saveQuantitySample).toHaveBeenCalledWith(
      DIETARY_WATER_IDENTIFIER,
      'l',
      0.25,
      entry.measuredAt,
      entry.measuredAt,
      { HKWasUserEntered: true },
    )
  })

  it.each([
    { liters: 0, measuredAt: entry.measuredAt },
    { liters: -0.25, measuredAt: entry.measuredAt },
    { liters: NaN, measuredAt: entry.measuredAt },
    { liters: Infinity, measuredAt: entry.measuredAt },
    { liters: 0.25, measuredAt: new Date(NaN) },
    { liters: 0.25, measuredAt: new Date(2026, 9, 18) },
  ])('validates before requesting permission: %j', async (invalid) => {
    await expect(waterWriter.save(invalid)).rejects.toBeInstanceOf(Error)
    expect(mockHealthKit.requestAuthorization).not.toHaveBeenCalled()
    expect(mockHealthKit.saveQuantitySample).not.toHaveBeenCalled()
  })

  it('does not save when HealthKit write access is denied', async () => {
    mockHealthKit.authorizationStatusFor.mockReturnValue(
      AuthorizationStatus.sharingDenied,
    )
    await expect(waterWriter.save(entry)).rejects.toMatchObject({
      code: 'denied',
    })
    expect(mockHealthKit.saveQuantitySample).not.toHaveBeenCalled()
  })

  it('sanitizes native failures and releases the save lock for explicit retry', async () => {
    mockHealthKit.saveQuantitySample.mockRejectedValueOnce(
      new Error('private water sample 0.25 liters'),
    )
    await expect(waterWriter.save(entry)).rejects.toMatchObject({
      code: 'save-failed',
    })
    await expect(waterWriter.save(entry)).resolves.toBeUndefined()
    expect(mockHealthKit.saveQuantitySample).toHaveBeenCalledTimes(2)
  })
})
