import {
  BODY_MASS_IDENTIFIER,
  type BodyMassAvailability,
} from '@/lib/healthSnapshot/bodyMass'
import { bodyMassWriter } from '@/lib/healthSnapshot/bodyMassWriter.ios'

let mockSupport: BodyMassAvailability = { available: true }
const mockHealthKit = {
  isHealthDataAvailable: jest.fn(() => true),
  requestAuthorization: jest.fn<Promise<boolean>, [unknown]>(async () => true),
  authorizationStatusFor: jest.fn(() => 2),
  saveQuantitySample: jest.fn<
    Promise<{ uuid: string; quantityType: string } | undefined>,
    unknown[]
  >(async () => ({
    uuid: 'native-saved-sample',
    quantityType: 'HKQuantityTypeIdentifierBodyMass',
  })),
}
jest.mock('@kingstinct/react-native-healthkit', () => mockHealthKit)
jest.mock('@/lib/healthSnapshot/bodyMassNativeSupport', () => ({
  getBodyMassNativeSupport: () => mockSupport,
}))

const entry = { kilograms: 78.4, measuredAt: new Date(2026, 8, 20, 15, 42) }

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date(2026, 8, 21, 16))
  jest.clearAllMocks()
  mockSupport = { available: true }
  mockHealthKit.isHealthDataAvailable.mockReturnValue(true)
  mockHealthKit.requestAuthorization.mockResolvedValue(true)
  mockHealthKit.authorizationStatusFor.mockReturnValue(2)
  mockHealthKit.saveQuantitySample.mockResolvedValue({
    uuid: 'native-saved-sample',
    quantityType: BODY_MASS_IDENTIFIER,
  })
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe('iOS body-mass writer', () => {
  it('does not request access or save while checking availability', () => {
    expect(bodyMassWriter.getAvailability()).toEqual({ available: true })
    expect(mockHealthKit.requestAuthorization).not.toHaveBeenCalled()
    expect(mockHealthKit.saveQuantitySample).not.toHaveBeenCalled()
  })

  it('requests only body-mass write access and saves exactly the confirmed kg, timestamp and manual metadata', async () => {
    await expect(bodyMassWriter.save(entry)).resolves.toBeUndefined()
    expect(mockHealthKit.requestAuthorization).toHaveBeenCalledWith({
      toShare: [BODY_MASS_IDENTIFIER],
      toRead: [],
    })
    expect(mockHealthKit.authorizationStatusFor).toHaveBeenCalledWith(
      BODY_MASS_IDENTIFIER,
    )
    expect(mockHealthKit.saveQuantitySample).toHaveBeenCalledWith(
      BODY_MASS_IDENTIFIER,
      'kg',
      78.4,
      entry.measuredAt,
      entry.measuredAt,
      { HKWasUserEntered: true },
    )
  })

  it.each([
    { kilograms: 0, measuredAt: entry.measuredAt },
    { kilograms: -1, measuredAt: entry.measuredAt },
    { kilograms: NaN, measuredAt: entry.measuredAt },
    { kilograms: Infinity, measuredAt: entry.measuredAt },
    { kilograms: 78, measuredAt: new Date(NaN) },
    { kilograms: 78, measuredAt: new Date(2026, 8, 22) },
  ])('validates before any permission request: %j', async (invalid) => {
    await expect(bodyMassWriter.save(invalid)).rejects.toBeInstanceOf(Error)
    expect(mockHealthKit.requestAuthorization).not.toHaveBeenCalled()
    expect(mockHealthKit.saveQuantitySample).not.toHaveBeenCalled()
  })

  it.each(['build-required', 'platform', 'unavailable'] as const)(
    'does not touch HealthKit when %s',
    async (reason) => {
      mockSupport = { available: false, reason, message: 'Unavailable' }
      await expect(bodyMassWriter.save(entry)).rejects.toMatchObject({
        code: reason,
      })
      expect(mockHealthKit.isHealthDataAvailable).not.toHaveBeenCalled()
      expect(mockHealthKit.requestAuthorization).not.toHaveBeenCalled()
      expect(mockHealthKit.saveQuantitySample).not.toHaveBeenCalled()
    },
  )

  it('does not request or save when native HealthKit is unavailable', async () => {
    mockHealthKit.isHealthDataAvailable.mockReturnValue(false)
    await expect(bodyMassWriter.save(entry)).rejects.toMatchObject({
      code: 'unavailable',
    })
    expect(mockHealthKit.requestAuthorization).not.toHaveBeenCalled()
  })

  it.each([false, 'rejected'])(
    'handles an uncompleted/cancelled authorization request: %s',
    async (result) => {
      if (result === false)
        mockHealthKit.requestAuthorization.mockResolvedValue(false)
      else
        mockHealthKit.requestAuthorization.mockRejectedValue(
          new Error('private native authorization detail'),
        )
      await expect(bodyMassWriter.save(entry)).rejects.toMatchObject({
        code: 'authorization',
      })
      expect(mockHealthKit.saveQuantitySample).not.toHaveBeenCalled()
    },
  )

  it.each([0, 1])(
    'does not equate request completion with write permission, status %s',
    async (status) => {
      mockHealthKit.authorizationStatusFor.mockReturnValue(status)
      await expect(bodyMassWriter.save(entry)).rejects.toMatchObject({
        code: 'denied',
      })
      expect(mockHealthKit.saveQuantitySample).not.toHaveBeenCalled()
    },
  )

  it.each([
    undefined,
    { uuid: '', quantityType: BODY_MASS_IDENTIFIER },
    { uuid: 'other', quantityType: 'HKQuantityTypeIdentifierStepCount' },
  ])(
    'requires native evidence of the saved body-mass sample: %j',
    async (result) => {
      mockHealthKit.saveQuantitySample.mockResolvedValue(result)
      await expect(bodyMassWriter.save(entry)).rejects.toMatchObject({
        code: 'save-failed',
      })
    },
  )

  it('sanitizes native failures without logging private weight or sample details', async () => {
    const spies = ['log', 'warn', 'error'].map((method) =>
      jest
        .spyOn(console, method as 'log' | 'warn' | 'error')
        .mockImplementation(() => undefined),
    )
    mockHealthKit.saveQuantitySample.mockRejectedValue(
      new Error('private body mass 78.4 kg sample'),
    )
    await expect(bodyMassWriter.save(entry)).rejects.toMatchObject({
      code: 'save-failed',
      message: expect.not.stringContaining('78.4'),
    })
    for (const spy of spies) expect(spy).not.toHaveBeenCalled()
  })

  it('guards concurrent calls synchronously and copies the measurement before awaiting authorization', async () => {
    let authorize!: (value: boolean) => void
    mockHealthKit.requestAuthorization.mockReturnValueOnce(
      new Promise((resolve) => {
        authorize = resolve
      }),
    )
    const measuredAt = new Date(entry.measuredAt)
    const first = bodyMassWriter.save({ ...entry, measuredAt })
    measuredAt.setHours(7)
    await expect(bodyMassWriter.save(entry)).rejects.toMatchObject({
      code: 'busy',
    })
    expect(mockHealthKit.requestAuthorization).toHaveBeenCalledTimes(1)
    authorize(true)
    await first
    expect(mockHealthKit.saveQuantitySample).toHaveBeenCalledTimes(1)
    expect(mockHealthKit.saveQuantitySample.mock.calls[0][3]).toEqual(
      entry.measuredAt,
    )
  })

  it('releases the writer lock after a failure so an explicit retry can work', async () => {
    mockHealthKit.saveQuantitySample.mockRejectedValueOnce(
      new Error('native failure'),
    )
    await expect(bodyMassWriter.save(entry)).rejects.toMatchObject({
      code: 'save-failed',
    })
    await expect(bodyMassWriter.save(entry)).resolves.toBeUndefined()
    expect(mockHealthKit.saveQuantitySample).toHaveBeenCalledTimes(2)
  })

  it('revalidates the measurement after a permission dialog if the system clock changes', async () => {
    mockHealthKit.requestAuthorization.mockImplementationOnce(async () => {
      jest.setSystemTime(new Date(2026, 8, 19, 16))
      return true
    })
    await expect(bodyMassWriter.save(entry)).rejects.toMatchObject({
      code: 'future-date',
    })
    expect(mockHealthKit.saveQuantitySample).not.toHaveBeenCalled()
  })
})
