import type { IOSNativeProps } from '@react-native-community/datetimepicker'
import { usePreventRemove } from '@react-navigation/native'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { createElement, type ComponentType } from 'react'
import { StyleSheet, View, useWindowDimensions } from 'react-native'
import type { ReactTestInstance } from 'react-test-renderer'

import { Colors, type ThemeName } from '@/constants/Colors'
import {
  BodyMassWriteError,
  type BodyMassAvailability,
  type BodyMassEntry,
} from '@/lib/healthSnapshot/bodyMass'
import type { HealthBodyMassSample } from '@/lib/healthSnapshot/types'

import AddWeightScreen from '../add-weight'

const now = new Date(2026, 8, 21, 15, 42, 18)
const mockSave = jest.fn<Promise<void>, [BodyMassEntry]>()
const mockAvailability = jest.fn<BodyMassAvailability, []>()
const mockLoadPicker = jest.fn<ComponentType<IOSNativeProps> | null, []>()
const mockBodyMassHistory = jest.fn<
  Promise<HealthBodyMassSample[]>,
  [Date, number]
>()
const mockDismissTo = jest.fn()
let mockTheme: ThemeName = 'light'

function PickerStub(props: IOSNativeProps) {
  return createElement(View, props)
}

jest.mock('@/lib/healthSnapshot/bodyMassWriter', () => ({
  bodyMassWriter: {
    getAvailability: () => mockAvailability(),
    save: (entry: BodyMassEntry) => mockSave(entry),
  },
}))
jest.mock('@/lib/healthSnapshot/HealthSnapshotSource', () => ({
  healthSnapshot: {
    getBodyMassHistory: (date: Date, days: number) =>
      mockBodyMassHistory(date, days),
  },
}))
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(),
}))
jest.mock('@/components/health/weightDateTimePicker', () => ({
  loadWeightDateTimePicker: () => mockLoadPicker(),
}))
jest.mock('@react-navigation/native', () => ({
  usePreventRemove: jest.fn(),
}))
jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } =
    jest.requireActual<typeof import('@/constants/Colors')>(
      '@/constants/Colors',
    )
  return { useTheme: () => Colors[mockTheme] }
})
jest.mock('@/hooks/useColorScheme', () => ({ useColorScheme: () => mockTheme }))

function confirmEntry(value = '78,4') {
  fireEvent.changeText(screen.getByLabelText('Weight in kilograms'), value)
  fireEvent(screen.getByTestId('weight-confirm-time'), 'valueChange', true)
}

function chooseMeasurement(date: Date, type: 'set' | 'dismissed' = 'set') {
  fireEvent(
    screen.getByTestId('weight-date-time-picker'),
    'change',
    {
      type,
      nativeEvent: { timestamp: date.getTime(), utcOffset: 0 },
    },
    date,
  )
}

function pressHandler(testID: string): () => void {
  let node: ReactTestInstance | null = screen.getByTestId(testID)
  while (node && typeof node.props.onPress !== 'function') node = node.parent
  if (!node) throw new Error(`No press handler for ${testID}`)
  return node.props.onPress
}

function rulerValue() {
  return screen.getByTestId('weight-ruler').props.accessibilityValue.text
}

function adjustRuler(actionName: 'increment' | 'decrement') {
  fireEvent(screen.getByTestId('weight-ruler'), 'accessibilityAction', {
    nativeEvent: { actionName },
  })
}

function scrollRuler(
  event:
    | 'scroll'
    | 'scrollBeginDrag'
    | 'scrollEndDrag'
    | 'momentumScrollBegin'
    | 'momentumScrollEnd',
  x: number,
) {
  fireEvent(
    screen.getByTestId('weight-ruler-list', { includeHiddenElements: true }),
    event,
    {
      nativeEvent: {
        contentOffset: { x, y: 0 },
        contentSize: { width: 28_320, height: 76 },
        layoutMeasurement: { width: 320, height: 76 },
      },
    },
  )
}

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(now)
  jest.clearAllMocks()
  mockTheme = 'light'
  mockSave.mockReset().mockResolvedValue(undefined)
  mockBodyMassHistory.mockReset().mockResolvedValue([])
  mockAvailability.mockReturnValue({ available: true })
  mockLoadPicker.mockReturnValue(PickerStub)
  jest
    .mocked(useWindowDimensions)
    .mockReturnValue({ width: 402, height: 874, scale: 3, fontScale: 1 })
  jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2026-09-21' })
  jest
    .mocked(useRouter)
    .mockReturnValue({ ...useRouter(), dismissTo: mockDismissTo })
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe('Add weight route', () => {
  it.each(['light', 'dark'] as const)(
    'uses the shared %s palette and native picker appearance',
    (theme) => {
      mockTheme = theme
      render(<AddWeightScreen />)
      expect(
        StyleSheet.flatten(
          screen.getByTestId('weight-entry-screen').props.style,
        ).backgroundColor,
      ).toBe(Colors[theme].background)
      expect(
        StyleSheet.flatten(screen.getByTestId('weight-kilograms').props.style)
          .color,
      ).toBe(Colors[theme].text)
      expect(
        screen.getByTestId('weight-date-time-picker').props.themeVariant,
      ).toBe(theme)
      expect(screen.getByTestId('weight-date-time-picker').props.display).toBe(
        'inline',
      )
    },
  )

  it('keeps the compact picker where the inline calendar would be squeezed', () => {
    jest
      .mocked(useWindowDimensions)
      .mockReturnValue({ width: 320, height: 568, scale: 2, fontScale: 1 })
    render(<AddWeightScreen />)
    expect(screen.getByTestId('weight-date-time-picker').props.display).toBe(
      'compact',
    )
  })

  it('makes room under the ruler for kilogram labels that grow with Dynamic Type', () => {
    jest
      .mocked(useWindowDimensions)
      .mockReturnValue({ width: 402, height: 874, scale: 3, fontScale: 2 })
    render(<AddWeightScreen />)
    expect(
      StyleSheet.flatten(screen.getByTestId('weight-ruler').props.style).height,
    ).toBe(92)
  })

  it('starts the ruler at the latest weigh-in without entering a weight', async () => {
    mockBodyMassHistory.mockResolvedValue([
      { kilograms: 80.1, startISO: '2026-09-12T06:30:00.000Z' },
      { kilograms: 82.44, startISO: '2026-09-20T06:30:00.000Z' },
    ])
    render(<AddWeightScreen />)
    await act(async () => {})
    expect(mockBodyMassHistory).toHaveBeenCalledWith(
      new Date(2026, 8, 21, 12),
      30,
    )
    expect(rulerValue()).toBe('82.4 kilograms')
    expect(screen.getByTestId('weight-kilograms').props.value).toBe('')
    expect(screen.getByTestId('weight-kilograms').props.placeholder).toBe(
      '82.4',
    )
  })

  it('keeps the ruler at 70 kg when Health has no readable weight', async () => {
    mockBodyMassHistory.mockRejectedValue(new Error('denied'))
    render(<AddWeightScreen />)
    await act(async () => {})
    expect(rulerValue()).toBe('70.0 kilograms')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('moves the ruler to a typed weight and ignores a later Health read', async () => {
    let finish!: (samples: HealthBodyMassSample[]) => void
    mockBodyMassHistory.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    render(<AddWeightScreen />)
    fireEvent.changeText(screen.getByLabelText('Weight in kilograms'), '80,2')
    await act(async () =>
      finish([{ kilograms: 90, startISO: '2026-09-20T06:30:00.000Z' }]),
    )
    expect(rulerValue()).toBe('80.2 kilograms')
    expect(screen.getByDisplayValue('80,2')).toBeTruthy()
    fireEvent.changeText(screen.getByLabelText('Weight in kilograms'), '80.')
    expect(rulerValue()).toBe('80.2 kilograms')
  })

  it('enters the dragged ruler weight in 0.1 kg steps, ignoring programmatic scrolls', async () => {
    render(<AddWeightScreen />)
    await act(async () => {})
    fireEvent(screen.getByTestId('weight-ruler'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 76 } },
    })
    scrollRuler('scroll', 6_000)
    expect(screen.getByTestId('weight-kilograms').props.value).toBe('')
    scrollRuler('scrollBeginDrag', 5_000)
    scrollRuler('scroll', 5_840)
    expect(screen.getByDisplayValue('78.4')).toBeTruthy()
    scrollRuler('scrollEndDrag', 5_843)
    scrollRuler('momentumScrollBegin', 5_843)
    scrollRuler('momentumScrollEnd', 5_850)
    expect(screen.getByDisplayValue('78.5')).toBeTruthy()
    expect(rulerValue()).toBe('78.5 kilograms')
    scrollRuler('scroll', 7_000)
    // A non-animated programmatic scroll still reports a momentum end on iOS.
    scrollRuler('momentumScrollEnd', 7_000)
    expect(screen.getByDisplayValue('78.5')).toBeTruthy()
  })

  it('steps the ruler by 0.1 kg with VoiceOver adjust gestures', async () => {
    render(<AddWeightScreen />)
    await act(async () => {})
    adjustRuler('increment')
    expect(screen.getByDisplayValue('70.1')).toBeTruthy()
    adjustRuler('decrement')
    adjustRuler('decrement')
    expect(screen.getByDisplayValue('69.9')).toBeTruthy()
    expect(rulerValue()).toBe('69.9 kilograms')
  })
  it.each([
    { date: 'invalid' },
    { date: '2026-02-31' },
    { date: '' },
    { date: ['2026-09-20', '2026-09-21'] },
    { date: '2026-09-22' },
  ])(
    'rejects invalid, ambiguous, and future route dates without opening a writer: %j',
    (params) => {
      jest.mocked(useLocalSearchParams).mockReturnValue(params)
      render(<AddWeightScreen />)
      expect(screen.getByRole('alert')).toBeTruthy()
      expect(mockAvailability).not.toHaveBeenCalled()
      expect(mockLoadPicker).not.toHaveBeenCalled()
      expect(mockSave).not.toHaveBeenCalled()
    },
  )

  it.each(['platform', 'build-required', 'unavailable'] as const)(
    'shows an honest %s state without loading the new picker or saving',
    (reason) => {
      mockAvailability.mockReturnValue({
        available: false,
        reason,
        message: 'A compatible iOS build is required.',
      })
      render(<AddWeightScreen />)
      expect(screen.getByRole('alert')).toHaveTextContent(
        /compatible iOS build/,
      )
      expect(screen.queryByTestId('weight-kilograms')).toBeNull()
      expect(mockLoadPicker).not.toHaveBeenCalled()
      expect(mockBodyMassHistory).not.toHaveBeenCalled()
      expect(mockSave).not.toHaveBeenCalled()
    },
  )

  it('fails closed when a compatible version lacks the native picker', () => {
    mockLoadPicker.mockReturnValue(null)
    render(<AddWeightScreen />)
    expect(screen.getByRole('alert')).toHaveTextContent(
      /new iOS build is required/,
    )
    expect(screen.queryByTestId('save-weight')).toBeNull()
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('defaults today to the actual current timestamp, shows it, and requires confirmation', () => {
    render(<AddWeightScreen />)
    expect(screen.getByTestId('weight-date-time-picker').props.value).toEqual(
      now,
    )
    expect(screen.getByTestId('weight-measured-at')).toHaveTextContent(/2026/)
    expect(screen.getByTestId('weight-confirm-time').props.value).toBe(false)
    expect(screen.getByTestId('save-weight')).toBeDisabled()
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('makes a past-day default explicit instead of fabricating a morning timestamp', () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2026-09-20' })
    render(<AddWeightScreen />)
    expect(screen.getByTestId('weight-date-time-picker').props.value).toEqual(
      new Date(2026, 8, 20, 15, 42, 18),
    )
    expect(
      screen.getByText(/initial time is the current local time/),
    ).toBeTruthy()
    expect(screen.getByText(/first reading before local noon/)).toBeTruthy()
  })

  it('does not save on editing, Enter, blur, picker dismissal, Cancel, or unmount', () => {
    const { unmount } = render(<AddWeightScreen />)
    confirmEntry()
    fireEvent(screen.getByTestId('weight-kilograms'), 'submitEditing')
    fireEvent(screen.getByTestId('weight-kilograms'), 'blur')
    chooseMeasurement(new Date(2026, 8, 20, 7), 'dismissed')
    expect(screen.getByTestId('weight-date-time-picker').props.value).toEqual(
      now,
    )
    fireEvent.press(screen.getByTestId('cancel-weight-entry'))
    expect(mockDismissTo).toHaveBeenCalledWith({
      pathname: '/',
      params: { date: '2026-09-21' },
    })
    unmount()
    expect(mockSave).not.toHaveBeenCalled()
  })

  it.each(['0', '-5', 'NaN', 'Infinity', '78 kg'])(
    'rejects invalid input %s before calling the writer',
    async (value) => {
      render(<AddWeightScreen />)
      confirmEntry(value)
      await act(async () => fireEvent.press(screen.getByTestId('save-weight')))
      expect(screen.getByRole('alert')).toHaveTextContent(/greater than zero/)
      expect(screen.getByDisplayValue(value)).toBeTruthy()
      expect(mockSave).not.toHaveBeenCalled()
    },
  )

  it('requires new confirmation after changing the timestamp and rejects future/invalid picker dates', () => {
    render(<AddWeightScreen />)
    confirmEntry()
    chooseMeasurement(new Date(2026, 8, 20, 10, 32))
    expect(screen.getByTestId('weight-confirm-time').props.value).toBe(false)
    expect(screen.getByTestId('save-weight')).toBeDisabled()
    chooseMeasurement(new Date(2026, 8, 22))
    expect(screen.getByRole('alert')).toHaveTextContent(
      /cannot be in the future/,
    )
    chooseMeasurement(new Date(NaN))
    expect(screen.getByRole('alert')).toHaveTextContent(
      /valid measurement date/,
    )
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('saves the chosen time, never submission time, and preserves the original Home day on success', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2026-09-20' })
    render(<AddWeightScreen />)
    const measuredAt = new Date(2026, 8, 19, 16, 32)
    chooseMeasurement(measuredAt)
    confirmEntry()
    jest.setSystemTime(new Date(2026, 8, 21, 18))
    await act(async () => fireEvent.press(screen.getByTestId('save-weight')))
    expect(mockSave).toHaveBeenCalledWith({ kilograms: 78.4, measuredAt })
    expect(screen.getByText('Saved to Apple Health')).toBeTruthy()
    expect(screen.getByText(/Read access is separate/)).toBeTruthy()
    expect(
      screen.getByText(/afternoon measurement is saved at its actual time/),
    ).toBeTruthy()
    expect(screen.queryByTestId('save-weight')).toBeNull()
    fireEvent.press(screen.getByTestId('weight-return-home'))
    expect(mockDismissTo).toHaveBeenCalledWith({
      pathname: '/',
      params: { date: '2026-09-20' },
    })
  })

  it.each(['authorization', 'denied', 'save-failed'] as const)(
    'keeps the entered weight and chosen time after %s so an explicit retry can work',
    async (code) => {
      mockSave.mockRejectedValueOnce(new BodyMassWriteError(code))
      render(<AddWeightScreen />)
      const measuredAt = new Date(2026, 8, 20, 9, 18)
      chooseMeasurement(measuredAt)
      confirmEntry()
      await act(async () => fireEvent.press(screen.getByTestId('save-weight')))
      expect(screen.getByRole('alert')).toBeTruthy()
      expect(screen.getByDisplayValue('78,4')).toBeTruthy()
      expect(screen.getByTestId('weight-date-time-picker').props.value).toEqual(
        measuredAt,
      )
      expect(screen.queryByText('Saved to Apple Health')).toBeNull()
      expect(mockDismissTo).not.toHaveBeenCalled()
      expect(screen.getByTestId('save-weight')).toBeEnabled()
      await act(async () => fireEvent.press(screen.getByTestId('save-weight')))
      expect(mockSave).toHaveBeenCalledTimes(2)
      expect(screen.getByText('Saved to Apple Health')).toBeTruthy()
    },
  )

  it('synchronously guards double taps and conflicting navigation, then exposes success only after saving', async () => {
    let finish!: () => void
    mockSave.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    render(<AddWeightScreen />)
    confirmEntry()
    const save = pressHandler('save-weight')
    const cancel = pressHandler('cancel-weight-entry')
    await act(async () => {
      save()
      save()
      cancel()
    })
    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(mockDismissTo).not.toHaveBeenCalled()
    expect(
      screen.getByTestId('save-weight').props.accessibilityState,
    ).toMatchObject({ busy: true, disabled: true })
    expect(screen.getByTestId('cancel-weight-entry')).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Cancel weight entry' }),
    ).toBeDisabled()
    expect(screen.getByTestId('weight-kilograms').props.editable).toBe(false)
    expect(
      screen.getByTestId('weight-ruler').props.accessibilityState,
    ).toMatchObject({ disabled: true })
    adjustRuler('increment')
    expect(screen.getByDisplayValue('78,4')).toBeTruthy()
    expect(screen.getByTestId('weight-date-time-picker').props.disabled).toBe(
      true,
    )
    expect(usePreventRemove).toHaveBeenLastCalledWith(
      true,
      expect.any(Function),
    )
    expect(screen.queryByText('Saved to Apple Health')).toBeNull()
    await act(async () => finish())
    expect(screen.getByText('Saved to Apple Health')).toBeTruthy()
    expect(usePreventRemove).toHaveBeenLastCalledWith(
      false,
      expect.any(Function),
    )
    await act(async () => save())
    expect(mockSave).toHaveBeenCalledTimes(1)
  })

  it('never exposes or logs private native errors', async () => {
    const detail = 'Private native sample 78.4 kg / patient record'
    mockSave.mockRejectedValueOnce(new Error(detail))
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    const error = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    render(<AddWeightScreen />)
    confirmEntry()
    await act(async () => fireEvent.press(screen.getByTestId('save-weight')))
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      /private native|78\.4 kg|patient record/i,
    )
    expect(log).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })
})
