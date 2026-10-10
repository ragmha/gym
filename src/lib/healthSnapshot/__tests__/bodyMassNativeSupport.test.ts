import { requireOptionalNativeModule } from 'expo'
import { Platform } from 'react-native'

import { getBodyMassNativeSupport } from '@/lib/healthSnapshot/bodyMassNativeSupport'

let mockNativeVersion: string | null = '1.0.7'
const mockReadNativeVersion = jest.fn()

jest.mock('expo', () => ({ requireOptionalNativeModule: jest.fn() }))
jest.mock('expo-application', () => ({
  get nativeApplicationVersion() {
    mockReadNativeVersion()
    return mockNativeVersion
  },
}))

beforeEach(() => {
  jest.clearAllMocks()
  jest.replaceProperty(Platform, 'OS', 'ios')
  mockNativeVersion = '1.0.7'
  jest.mocked(requireOptionalNativeModule).mockReturnValue({})
})

afterEach(() => jest.restoreAllMocks())

describe('Immutable body-mass native gate', () => {
  it.each(['web', 'android'] as const)(
    'does not resolve new native modules on %s',
    (platform) => {
      jest.replaceProperty(Platform, 'OS', platform)
      expect(getBodyMassNativeSupport()).toMatchObject({
        available: false,
        reason: 'platform',
      })
      expect(requireOptionalNativeModule).not.toHaveBeenCalled()
      expect(mockReadNativeVersion).not.toHaveBeenCalled()
    },
  )

  it('does not import expo-application when its native module is missing', () => {
    jest.mocked(requireOptionalNativeModule).mockReturnValue(null)
    expect(getBodyMassNativeSupport()).toMatchObject({
      available: false,
      reason: 'build-required',
    })
    expect(mockReadNativeVersion).not.toHaveBeenCalled()
  })

  it.each(['1.0.6', null, 'invalid'])(
    'blocks old or unknown native versions regardless of live app config: %j',
    (version) => {
      mockNativeVersion = version
      expect(getBodyMassNativeSupport()).toMatchObject({
        available: false,
        reason: 'build-required',
      })
      expect(mockReadNativeVersion).toHaveBeenCalled()
    },
  )

  it('accepts a known-compatible immutable native version', () => {
    expect(getBodyMassNativeSupport()).toEqual({ available: true })
    expect(requireOptionalNativeModule).toHaveBeenCalledWith('ExpoApplication')
  })

  it('fails closed if native capability detection throws', () => {
    jest.mocked(requireOptionalNativeModule).mockImplementation(() => {
      throw new Error('native module error')
    })
    expect(getBodyMassNativeSupport()).toMatchObject({
      available: false,
      reason: 'build-required',
    })
  })
})
