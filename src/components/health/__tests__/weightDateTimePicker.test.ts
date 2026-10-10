import type { IOSNativeProps } from '@react-native-community/datetimepicker'
import type { ComponentType } from 'react'

import type { BodyMassAvailability } from '@/lib/healthSnapshot/bodyMass'

let mockSupport: BodyMassAvailability
const mockHasView = jest.fn()
const mockPickerImported = jest.fn()
const mockPicker = () => null
jest.mock('react-native', () => ({
  UIManager: { hasViewManagerConfig: (name: string) => mockHasView(name) },
}))
jest.mock('@/lib/healthSnapshot/bodyMassNativeSupport', () => ({
  getBodyMassNativeSupport: () => mockSupport,
}))
jest.mock('@react-native-community/datetimepicker', () => {
  mockPickerImported()
  return { __esModule: true, default: mockPicker }
})

function loadIOSPicker() {
  let result: ComponentType<IOSNativeProps> | null = null
  jest.isolateModules(() => {
    const { loadWeightDateTimePicker } = jest.requireActual<{
      loadWeightDateTimePicker: () => ComponentType<IOSNativeProps> | null
    }>('@/components/health/weightDateTimePicker.ios')
    result = loadWeightDateTimePicker()
  })
  return result
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSupport = { available: true }
  mockHasView.mockReturnValue(true)
})

describe('Lazy native measurement picker', () => {
  it.each(['platform', 'build-required', 'unavailable'] as const)(
    'never evaluates the native picker when %s',
    (reason) => {
      mockSupport = { available: false, reason, message: 'Unavailable' }
      expect(loadIOSPicker()).toBeNull()
      expect(mockHasView).not.toHaveBeenCalled()
      expect(mockPickerImported).not.toHaveBeenCalled()
    },
  )

  it('does not import the picker when its native view is missing', () => {
    mockHasView.mockReturnValue(false)
    expect(loadIOSPicker()).toBeNull()
    expect(mockPickerImported).not.toHaveBeenCalled()
  })

  it('loads only after the immutable binary and native view gates pass', () => {
    expect(loadIOSPicker()).toBe(mockPicker)
    expect(mockHasView).toHaveBeenCalledWith('RNDateTimePicker')
    expect(mockPickerImported).toHaveBeenCalledTimes(1)
  })

  it('fails closed without importing the picker if the native view lookup throws', () => {
    mockHasView.mockImplementation(() => {
      throw new Error('view missing')
    })
    expect(loadIOSPicker()).toBeNull()
    expect(mockPickerImported).not.toHaveBeenCalled()
  })

  it('has an explicitly unavailable web/Android implementation with no native imports', () => {
    const { loadWeightDateTimePicker } = jest.requireActual<{
      loadWeightDateTimePicker: () => ComponentType<IOSNativeProps> | null
    }>('@/components/health/weightDateTimePicker.ts')
    expect(loadWeightDateTimePicker()).toBeNull()
    expect(mockHasView).not.toHaveBeenCalled()
    expect(mockPickerImported).not.toHaveBeenCalled()
  })
})
