import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Platform, StyleSheet, type RefreshControlProps } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ActivityHeatmap } from '@/components/charts/ActivityHeatmap'
import { makeSnapshot } from '@/components/dashboard/__fixtures__/healthSnapshot'
import { Colors, type ThemeName } from '@/constants/Colors'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'

import HomeScreen from '../index'

let mockTheme: ThemeName = 'light'
let mockState: ReturnType<typeof useHealthSnapshot>
const mockRefresh = jest.fn<Promise<void>, []>()
const mockPush = jest.fn()
const originalPlatform = Platform.OS

function focusHome(): void {
  const callback = jest.mocked(useFocusEffect).mock.lastCall?.[0]
  if (!callback) throw new Error('Home did not register a focus effect')
  callback()
}

jest.mock('@/hooks/useHealthSnapshot', () => ({
  useHealthSnapshot: jest.fn(() => mockState),
}))

jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } =
    jest.requireActual<typeof import('@/constants/Colors')>(
      '@/constants/Colors',
    )
  return { useTheme: () => Colors[mockTheme] }
})

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: () => mockTheme,
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
}))

jest.mock('@/components/charts/ActivityHeatmap', () => ({
  ActivityHeatmap: jest.fn(() => null),
}))

// React Native's default mock drops the refresh control's props.
jest.mock(
  'react-native/Libraries/Components/RefreshControl/RefreshControl',
  () => {
    const React = jest.requireActual<typeof import('react')>('react')
    const { View } =
      jest.requireActual<typeof import('react-native')>('react-native')
    return {
      __esModule: true,
      default: (props: RefreshControlProps) => React.createElement(View, props),
    }
  },
)

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 8, 12, 12))
    jest.clearAllMocks()
    mockRefresh.mockReset().mockResolvedValue(undefined)
    mockTheme = 'light'
    jest
      .mocked(useSafeAreaInsets)
      .mockReturnValue({ top: 0, bottom: 0, left: 0, right: 0 })
    mockState = {
      snapshot: makeSnapshot(),
      status: 'ready',
      isDemoMode: false,
      error: null,
      authorizationStatus: 'idle',
      authorizationError: null,
      refresh: mockRefresh,
      requestAuthorization: jest.fn(async () => true),
    }
    jest.mocked(useRouter).mockReturnValue({ ...useRouter(), push: mockPush })
  })

  afterEach(() => {
    jest.useRealTimers()
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform,
    })
  })

  it('shows the daily essentials with secondary content collapsed', () => {
    render(<HomeScreen />)

    expect(screen.getByLabelText('Recovery 85%')).toBeTruthy()
    expect(screen.getByLabelText('Steps 5,000')).toBeTruthy()
    expect(screen.getByLabelText('Active calories 300 kcal')).toBeTruthy()
    expect(screen.getByLabelText('Sleep 8.0 hrs')).toBeTruthy()
    expect(screen.queryByText('Weight')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Previous week' })).toBeNull()
    expect(ActivityHeatmap).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'More health data' }).props
        .accessibilityState,
    ).toMatchObject({ expanded: false })
  })

  it('reveals weight and mounts the heatmap only after expansion', () => {
    render(<HomeScreen />)

    fireEvent.press(screen.getByRole('button', { name: 'More health data' }))

    expect(screen.getByText('Weight')).toBeTruthy()
    expect(screen.getByText('78.4')).toBeTruthy()
    expect(ActivityHeatmap).toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'More health data' }).props
        .accessibilityState,
    ).toMatchObject({ expanded: true })

    fireEvent.press(screen.getByRole('button', { name: 'More health data' }))
    expect(screen.queryByText('Weight')).toBeNull()
  })

  it('selects a past day, closes the calendar, and blocks future days', () => {
    render(<HomeScreen />)
    fireEvent.press(screen.getByRole('button', { name: 'Choose date, TODAY' }))

    const futureDay = screen.getByRole('button', {
      name: 'Sunday, September 13, 2026',
    })
    expect(futureDay.props.accessibilityState).toMatchObject({ disabled: true })
    fireEvent.press(futureDay)
    expect(jest.mocked(useHealthSnapshot).mock.lastCall?.[0]?.getDate()).toBe(
      12,
    )

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Friday, September 11, 2026',
      }),
    )

    expect(
      jest.mocked(useHealthSnapshot).mock.lastCall?.[0]?.toDateString(),
    ).toBe(new Date(2026, 8, 11).toDateString())
    expect(
      screen.getByRole('button', { name: 'Choose date, SEP 11, 2026' }).props
        .accessibilityState,
    ).toMatchObject({ expanded: false })
    expect(screen.queryByRole('button', { name: 'Previous week' })).toBeNull()
  })

  it('preserves week navigation while keeping the expanded picker open', () => {
    render(<HomeScreen />)
    fireEvent.press(screen.getByRole('button', { name: /Choose date/ }))
    expect(
      screen.getByRole('button', { name: 'Next week' }).props
        .accessibilityState,
    ).toMatchObject({ disabled: true })

    fireEvent.press(screen.getByRole('button', { name: 'Previous week' }))
    expect(jest.mocked(useHealthSnapshot).mock.lastCall?.[0]?.getDate()).toBe(5)
    expect(
      screen.getByRole('button', { name: 'Next week' }).props
        .accessibilityState,
    ).toMatchObject({ disabled: false })

    fireEvent.press(screen.getByRole('button', { name: 'Next week' }))
    expect(jest.mocked(useHealthSnapshot).mock.lastCall?.[0]?.getDate()).toBe(
      12,
    )
    expect(
      screen.getByRole('button', { name: 'Choose date, TODAY' }).props
        .accessibilityState,
    ).toMatchObject({ expanded: true })
  })

  it('does not present an empty day while its data is still loading', () => {
    mockState = { ...mockState, status: 'loading', snapshot: null }
    const { rerender } = render(<HomeScreen />)

    expect(screen.getByText('Loading health data...')).toBeTruthy()
    expect(screen.queryByLabelText('Recovery unavailable')).toBeNull()
    expect(screen.queryByText('No workouts available for this day')).toBeNull()

    mockState = { ...mockState, status: 'ready', snapshot: makeSnapshot() }
    rerender(<HomeScreen />)
    expect(screen.getByLabelText('Recovery 85%')).toBeTruthy()
  })

  it('shows a read error and lets the user retry successfully', async () => {
    mockState = {
      ...mockState,
      status: 'error',
      snapshot: null,
      error: 'Unable to load health data',
    }
    mockRefresh.mockImplementationOnce(async () => {
      mockState = {
        ...mockState,
        status: 'ready',
        error: null,
        snapshot: makeSnapshot(),
      }
    })
    const { rerender } = render(<HomeScreen />)

    expect(screen.getByRole('alert').props.children).toBe(
      'Unable to load health data',
    )
    expect(screen.queryByLabelText('Recovery unavailable')).toBeNull()

    await act(async () => {
      fireEvent.press(
        screen.getByRole('button', { name: 'Retry loading health data' }),
      )
    })
    rerender(<HomeScreen />)

    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByLabelText('Recovery 85%')).toBeTruthy()
  })

  it('stops the refresh indicator when the hook reports a read failure', async () => {
    let finishRefresh: (() => void) | undefined
    mockRefresh.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishRefresh = resolve
        }),
    )
    const { rerender } = render(<HomeScreen />)
    fireEvent(screen.getByTestId('home-refresh'), 'refresh')

    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('home-refresh').props.refreshing).toBe(true)

    mockState = {
      ...mockState,
      status: 'error',
      error: 'Unable to load health data',
    }
    await act(async () => {
      finishRefresh?.()
    })
    rerender(<HomeScreen />)

    expect(screen.getByTestId('home-refresh').props.refreshing).toBe(false)
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  it('keeps existing navigation destinations reachable', () => {
    render(<HomeScreen />)

    fireEvent.press(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.press(screen.getByRole('button', { name: 'Open coach' }))
    fireEvent.press(screen.getByRole('button', { name: 'See all metrics' }))

    expect(mockPush.mock.calls).toEqual([
      ['/settings'],
      ['/coach'],
      ['/fitness-metrics'],
    ])
  })

  it('refreshes the selected day after returning from Health access settings', async () => {
    mockState = { ...mockState, snapshot: null }
    const { rerender } = render(<HomeScreen />)
    act(focusHome)
    expect(mockRefresh).not.toHaveBeenCalled()

    fireEvent.press(screen.getByRole('button', { name: 'Choose date, TODAY' }))
    fireEvent.press(
      screen.getByRole('button', {
        name: 'Friday, September 11, 2026',
      }),
    )
    fireEvent.press(screen.getByRole('button', { name: 'Settings' }))
    mockRefresh.mockImplementationOnce(async () => {
      mockState = {
        ...mockState,
        snapshot: { ...makeSnapshot(), date: '2026-09-11', steps: 8_500 },
      }
    })

    await act(async () => focusHome())
    rerender(<HomeScreen />)

    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(
      jest.mocked(useHealthSnapshot).mock.lastCall?.[0]?.toDateString(),
    ).toBe(new Date(2026, 8, 11).toDateString())
    expect(screen.getByLabelText('Steps 8,500')).toBeTruthy()
    expect(mockState.requestAuthorization).not.toHaveBeenCalled()
  })

  it('keeps unavailable data honest when returning without read access', async () => {
    mockState = { ...mockState, snapshot: null }
    render(<HomeScreen />)
    act(focusHome)

    await act(async () => focusHome())

    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Recovery unavailable')).toBeTruthy()
    expect(screen.getByLabelText('Steps unavailable')).toBeTruthy()
    expect(mockState.requestAuthorization).not.toHaveBeenCalled()
  })

  it('identifies non-iOS demo data explicitly', () => {
    mockState = { ...mockState, isDemoMode: true }
    render(<HomeScreen />)

    expect(
      screen.getByText('Demo data - Apple Health is available on iOS.'),
    ).toBeTruthy()
  })

  it.each([
    {
      platform: 'android',
      top: 32,
      bottom: 24,
      expectedTop: 40,
      expectedBottom: 56,
    },
    {
      platform: 'ios',
      top: 62,
      bottom: 34,
      expectedTop: 8,
      expectedBottom: 32,
    },
  ])(
    'accounts for $platform safe areas without doubling automatic iOS insets',
    ({ platform, top, bottom, expectedTop, expectedBottom }) => {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: platform,
      })
      jest
        .mocked(useSafeAreaInsets)
        .mockReturnValue({ top, bottom, left: 0, right: 0 })
      render(<HomeScreen />)

      const style = StyleSheet.flatten(
        screen.getByTestId('home-screen').props.contentContainerStyle,
      )
      expect(style.paddingTop).toBe(expectedTop)
      expect(style.paddingBottom).toBe(expectedBottom)
    },
  )

  it.each(['light', 'dark'] as const)(
    'uses the %s home theme and automatic safe-area insets',
    (theme) => {
      mockTheme = theme
      render(<HomeScreen />)

      const scroll = screen.getByTestId('home-screen')
      expect(StyleSheet.flatten(scroll.props.style).backgroundColor).toBe(
        Colors[theme].homeBackground,
      )
      expect(scroll.props.contentInsetAdjustmentBehavior).toBe('automatic')
      expect(screen.getByLabelText('Recovery 85%')).toBeTruthy()
    },
  )
})
