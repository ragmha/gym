import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import {
  AppState,
  Platform,
  StyleSheet,
  type RefreshControlProps,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ActivityHeatmap } from '@/components/charts/ActivityHeatmap'
import { makeSnapshot } from '@/components/dashboard/__fixtures__/healthSnapshot'
import { Colors, type ThemeName } from '@/constants/Colors'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'

import HomeScreen from '../index'

let mockTheme: ThemeName = 'light'
let mockState: ReturnType<typeof useHealthSnapshot>
let mockInitialParams: Record<string, string> = {}
const mockRefresh = jest.fn<Promise<void>, []>()
const mockPush = jest.fn()
const mockSetParams = jest.fn()
const originalPlatform = Platform.OS
const originalAppState = Object.getOwnPropertyDescriptor(
  AppState,
  'currentState',
)
let focusCleanup: void | (() => void)

function focusHome(): void {
  const callback = jest.mocked(useFocusEffect).mock.lastCall?.[0]
  if (!callback) throw new Error('Home did not register a focus effect')
  focusCleanup?.()
  focusCleanup = callback()
}

function useTestSearchParams() {
  const [params, setParams] = useState(mockInitialParams)
  mockSetParams.mockImplementation((next: Record<string, string>) =>
    setParams((current) => ({ ...current, ...next })),
  )
  return params
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
    mockInitialParams = {}
    focusCleanup = undefined
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      writable: true,
      value: 'active',
    })
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
    jest.mocked(useLocalSearchParams).mockImplementation(useTestSearchParams)
    jest.mocked(useRouter).mockReturnValue({
      ...useRouter(),
      push: mockPush,
      setParams: mockSetParams,
    })
  })

  afterEach(() => {
    focusCleanup?.()
    jest.useRealTimers()
    if (originalAppState) {
      Object.defineProperty(AppState, 'currentState', originalAppState)
    }
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform,
    })
  })

  it('shows only the five daily priorities, with other metrics behind their route', () => {
    render(<HomeScreen />)

    expect(screen.queryByText(/Recovery/i)).toBeNull()
    expect(screen.getByLabelText('Steps 5,000')).toBeTruthy()
    expect(screen.queryByLabelText('Active calories 300 kcal')).toBeNull()
    expect(screen.queryByLabelText('Sleep 8.0 hrs')).toBeNull()
    expect(screen.getByText('Cardio')).toBeTruthy()
    expect(screen.getByText('Lift')).toBeTruthy()
    expect(screen.getByText('Water')).toBeTruthy()
    expect(screen.getByText('Morning weight')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Previous week' })).toBeNull()
    expect(ActivityHeatmap).not.toHaveBeenCalled()
    expect(screen.queryByText('More health data')).toBeNull()
    expect(screen.getByRole('button', { name: 'See all metrics' })).toBeTruthy()
  })

  it('keeps a steps-only day useful without empty metric cards', () => {
    mockState = {
      ...mockState,
      snapshot: makeSnapshot({
        calories: null,
        sleepHours: null,
        hrv: null,
        restingHeartRate: null,
        waterLiters: null,
        bodyMassHistory: null,
      }),
    }
    render(<HomeScreen />)

    expect(screen.getByLabelText('Steps 5,000')).toBeTruthy()
    expect(screen.queryByText('Sleep')).toBeNull()
    expect(screen.queryByText('Active calories')).toBeNull()
    expect(screen.queryByText(/Recovery|No workouts/i)).toBeNull()
    fireEvent.press(
      screen.getByRole('button', { name: 'Review Health access' }),
    )
    expect(mockPush).toHaveBeenCalledWith('/settings')
  })

  it('does not treat measured zero activity as missing data', () => {
    mockState = {
      ...mockState,
      snapshot: makeSnapshot({ steps: 0, calories: 0, sleepHours: null }),
    }
    render(<HomeScreen />)

    expect(screen.getByLabelText('Steps 0')).toBeTruthy()
    expect(screen.getByText('20,000 steps to go')).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Review Health access' }),
    ).toBeNull()
  })

  it('shows the morning weigh-in without mounting the activity heatmap', () => {
    render(<HomeScreen />)

    expect(screen.getByLabelText('Morning weight 78.4 kilograms')).toBeTruthy()
    expect(screen.getByText('7-day average: 78.4 kg')).toBeTruthy()
    expect(ActivityHeatmap).not.toHaveBeenCalled()
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
    expect(mockSetParams).toHaveBeenCalledWith({ date: '2026-09-11' })
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

  it('allows returning to the current week before local noon', () => {
    jest.setSystemTime(new Date(2026, 8, 12, 7))
    mockInitialParams = { date: '2026-09-05' }
    render(<HomeScreen />)
    fireEvent.press(screen.getByRole('button', { name: /Choose date/ }))

    expect(
      screen.getByRole('button', { name: 'Next week' }).props
        .accessibilityState,
    ).toMatchObject({ disabled: false })
    fireEvent.press(screen.getByRole('button', { name: 'Next week' }))
    expect(
      jest.mocked(useHealthSnapshot).mock.lastCall?.[0]?.toDateString(),
    ).toBe(new Date(2026, 8, 12).toDateString())
  })

  it('does not present an empty day while its data is still loading', () => {
    mockState = { ...mockState, status: 'loading', snapshot: null }
    const { rerender } = render(<HomeScreen />)

    expect(screen.getByText('Loading health data...')).toBeTruthy()
    expect(screen.queryByLabelText('Recovery unavailable')).toBeNull()
    expect(screen.queryByText('No workouts available for this day')).toBeNull()

    mockState = { ...mockState, status: 'ready', snapshot: makeSnapshot() }
    rerender(<HomeScreen />)
    expect(screen.getByLabelText('Steps 5,000')).toBeTruthy()
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
    expect(screen.getByLabelText('Steps 5,000')).toBeTruthy()
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
      [{ pathname: '/coach', params: { date: '2026-09-12' } }],
      [{ pathname: '/fitness-metrics', params: { date: '2026-09-12' } }],
    ])
  })

  it('keeps the selected day after weight entry without synthesizing a returned reading', async () => {
    mockInitialParams = { date: '2026-09-11' }
    mockState = {
      ...mockState,
      snapshot: makeSnapshot({ bodyMassHistory: null }),
    }
    render(<HomeScreen />)
    act(focusHome)
    fireEvent.press(screen.getByRole('button', { name: 'Add weight' }))
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/add-weight',
      params: { date: '2026-09-11' },
    })
    await act(async () => focusHome())
    expect(mockRefresh).not.toHaveBeenCalled()
    expect(
      jest.mocked(useHealthSnapshot).mock.lastCall?.[0]?.toDateString(),
    ).toBe(new Date(2026, 8, 11).toDateString())
    expect(screen.getByLabelText('Morning weight unavailable')).toBeTruthy()
  })

  it('carries the selected day into steps, coach, and the full metric breakdown', () => {
    render(<HomeScreen />)
    fireEvent.press(screen.getByRole('button', { name: 'Choose date, TODAY' }))
    fireEvent.press(
      screen.getByRole('button', { name: 'Friday, September 11, 2026' }),
    )

    fireEvent.press(screen.getByRole('button', { name: 'Steps 5,000' }))
    fireEvent.press(screen.getByRole('button', { name: 'Open coach' }))
    fireEvent.press(screen.getByRole('button', { name: 'See all metrics' }))

    expect(mockPush.mock.calls).toEqual([
      [{ pathname: '/steps', params: { date: '2026-09-11' } }],
      [{ pathname: '/coach', params: { date: '2026-09-11' } }],
      [{ pathname: '/fitness-metrics', params: { date: '2026-09-11' } }],
    ])
  })

  it('restores the selected day from the home URL after a browser back navigation', () => {
    jest
      .mocked(useLocalSearchParams)
      .mockImplementation(() => ({ date: '2026-09-11' }))
    render(<HomeScreen />)

    expect(
      jest.mocked(useHealthSnapshot).mock.lastCall?.[0]?.toDateString(),
    ).toBe(new Date(2026, 8, 11).toDateString())
    expect(
      screen.getByRole('button', { name: 'Choose date, SEP 11, 2026' }),
    ).toBeTruthy()
  })

  it('leaves immediate focus refreshes to the shared snapshot hook', () => {
    render(<HomeScreen />)
    act(focusHome)
    act(focusHome)

    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('keeps the fallback on the selected day after returning from Health access settings', async () => {
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
    expect(mockRefresh).not.toHaveBeenCalled()
    await act(async () => jest.advanceTimersByTime(5 * 60_000))
    rerender(<HomeScreen />)

    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(
      jest.mocked(useHealthSnapshot).mock.lastCall?.[0]?.toDateString(),
    ).toBe(new Date(2026, 8, 11).toDateString())
    expect(screen.getByLabelText('Steps 8,500')).toBeTruthy()
    expect(mockState.requestAuthorization).not.toHaveBeenCalled()
  })

  it('keeps unavailable data honest when the fallback runs without read access', async () => {
    mockState = { ...mockState, snapshot: null }
    render(<HomeScreen />)
    act(focusHome)

    await act(async () => focusHome())
    await act(async () => jest.advanceTimersByTime(5 * 60_000))

    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByLabelText('Recovery unavailable')).toBeNull()
    expect(screen.getByLabelText('Steps unavailable')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Review Health access' }),
    ).toBeTruthy()
    expect(mockState.requestAuthorization).not.toHaveBeenCalled()
  })

  it('catches a late-synced workout on the five-minute fallback, not every 30 seconds', async () => {
    mockRefresh.mockImplementation(async () => {
      mockState = {
        ...mockState,
        snapshot: makeSnapshot({
          workouts: [
            {
              kind: 'stairClimber',
              activityName: 'Stair climbing',
              averageHeartRate: 143,
              durationMinutes: 32,
              calories: null,
              distance: null,
              startISO: new Date(2026, 8, 12, 8).toISOString(),
              endISO: new Date(2026, 8, 12, 8, 32).toISOString(),
            },
          ],
        }),
      }
    })
    const { rerender } = render(<HomeScreen />)
    act(focusHome)
    expect(mockRefresh).not.toHaveBeenCalled()
    await act(async () => jest.advanceTimersByTime(5 * 60_000 - 1))
    expect(mockRefresh).not.toHaveBeenCalled()
    await act(async () => jest.advanceTimersByTime(1))
    rerender(<HomeScreen />)

    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(
      screen.getByText('StairMaster: 32 min synced / 143 bpm avg'),
    ).toBeTruthy()
    expect(screen.queryByText('Goal met')).toBeNull()
  })

  it('limits periodic refreshes to twelve per hour while home stays active', async () => {
    render(<HomeScreen />)
    act(focusHome)

    await act(async () => jest.advanceTimersByTimeAsync(60 * 60_000))

    expect(mockRefresh).toHaveBeenCalledTimes(12)
  })

  it('does not poll demo data, backgrounded home, or home after blur', async () => {
    const { rerender } = render(<HomeScreen />)
    act(focusHome)
    Object.defineProperty(AppState, 'currentState', { value: 'background' })
    await act(async () => jest.advanceTimersByTime(15 * 60_000))
    expect(mockRefresh).not.toHaveBeenCalled()

    focusCleanup?.()
    Object.defineProperty(AppState, 'currentState', { value: 'active' })
    await act(async () => jest.advanceTimersByTime(15 * 60_000))
    expect(mockRefresh).not.toHaveBeenCalled()

    mockState = { ...mockState, isDemoMode: true }
    rerender(<HomeScreen />)
    act(focusHome)
    const callsAfterFocus = mockRefresh.mock.calls.length
    await act(async () => jest.advanceTimersByTime(15 * 60_000))
    expect(mockRefresh).toHaveBeenCalledTimes(callsAfterFocus)
  })

  it('does not overlap periodic Health reads when a previous poll is still pending', async () => {
    let finish: (() => void) | undefined
    mockRefresh.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    render(<HomeScreen />)
    act(focusHome)
    await act(async () => jest.advanceTimersByTime(15 * 60_000))
    expect(mockRefresh).toHaveBeenCalledTimes(1)
    await act(async () => finish?.())
  })

  it('identifies non-iOS demo data explicitly', () => {
    mockState = { ...mockState, isDemoMode: true }
    render(<HomeScreen />)

    expect(
      screen.getByText('Demo data - Apple Health is available on iOS.'),
    ).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Review Health access' }),
    ).toBeNull()
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
      expect(screen.getByLabelText('Steps 5,000')).toBeTruthy()
    },
  )
})
