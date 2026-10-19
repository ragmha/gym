import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { requireOptionalNativeModule } from 'expo'
import { AppState, Platform, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { makeSnapshot } from '@/components/dashboard/__fixtures__/healthSnapshot'
import { Colors, type ThemeName } from '@/constants/Colors'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { publishDailySummary } from '@/lib/widgets/publishDailySummary'

import HomeScreen from '../index'

let mockTheme: ThemeName = 'light'
let mockState: ReturnType<typeof useHealthSnapshot>
let mockInitialParams: Record<string, string> = {}
const mockRefresh = jest.fn<Promise<void>, []>()
const mockPush = jest.fn()
const mockLive = {
  isReading: jest.fn(() => false),
  startReading: jest.fn(),
  stopReading: jest.fn(async () => {}),
  addStopListener: jest.fn((_listener: () => void) => ({ remove: jest.fn() })),
}
const originalPlatform = Platform.OS
const originalPlatformVersion = Object.getOwnPropertyDescriptor(
  Platform,
  'Version',
)
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

jest.mock('@/hooks/useHealthSnapshot', () => ({
  useHealthSnapshot: jest.fn(() => mockState),
}))

jest.mock('expo', () => ({
  ...jest.requireActual('expo'),
  requireOptionalNativeModule: jest.fn(),
}))

jest.mock('@/lib/readingActivity', () => mockLive)

jest.mock('@/lib/widgets/publishDailySummary', () => ({
  publishDailySummary: jest.fn(() => null),
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

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 8, 12, 12))
    jest.clearAllMocks()
    mockRefresh.mockReset().mockResolvedValue(undefined)
    mockTheme = 'light'
    mockInitialParams = {}
    focusCleanup = undefined
    jest.mocked(requireOptionalNativeModule).mockReturnValue({})
    mockLive.isReading.mockReturnValue(false)
    mockLive.startReading.mockImplementation(() => {})
    mockLive.stopReading.mockImplementation(async () => {})
    mockLive.addStopListener.mockImplementation((_listener) => ({
      remove: jest.fn(),
    }))
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
    jest
      .mocked(useLocalSearchParams)
      .mockImplementation(() => mockInitialParams)
    jest.mocked(useRouter).mockReturnValue({
      ...useRouter(),
      push: mockPush,
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
    if (originalPlatformVersion) {
      Object.defineProperty(Platform, 'Version', originalPlatformVersion)
    }
  })

  it('shows the daily priorities and habit links, with other metrics behind their route', () => {
    render(<HomeScreen />)

    expect(screen.queryByText(/Recovery/i)).toBeNull()
    expect(screen.getByLabelText('Steps 5,000')).toBeTruthy()
    expect(screen.queryByLabelText('Active calories 300 kcal')).toBeNull()
    expect(screen.queryByLabelText('Sleep 8.0 hrs')).toBeNull()
    expect(screen.getByText('Gym')).toBeTruthy()
    expect(screen.getByLabelText(/^Gym,.*Cardio,.*Lift,.*Weight,/)).toBeTruthy()
    expect(screen.getByText('Water')).toBeTruthy()
    for (const formerTile of ['cardio', 'lift', 'weight']) {
      expect(screen.queryByTestId(`goal-tile-${formerTile}`)).toBeNull()
    }
    for (const habit of ['Reading', 'Praying', 'Journal']) {
      expect(screen.getByText(habit)).toBeTruthy()
    }
    expect(screen.queryByText('Morning weight')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Previous week' })).toBeNull()
    expect(screen.queryByText('More health data')).toBeNull()
    fireEvent.press(
      screen.getByRole('button', { name: 'Show dashboard page 2 of 2' }),
    )
    expect(screen.getByText('Speaking')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'See achievements' }),
    ).toBeTruthy()
  })

  it('publishes current-day readings but not demo data, loading data, or historical days', () => {
    const view = render(<HomeScreen />)
    expect(publishDailySummary).toHaveBeenCalledWith(mockState.snapshot)
    jest.mocked(publishDailySummary).mockClear()

    mockState = { ...mockState, isDemoMode: true }
    view.rerender(<HomeScreen />)
    expect(publishDailySummary).not.toHaveBeenCalled()

    mockState = { ...mockState, isDemoMode: false, status: 'loading' }
    view.rerender(<HomeScreen />)
    expect(publishDailySummary).not.toHaveBeenCalled()

    mockState = { ...mockState, status: 'ready' }
    mockInitialParams = { date: '2026-09-11' }
    view.rerender(<HomeScreen />)
    expect(publishDailySummary).not.toHaveBeenCalled()
  })

  it('advances the implicit dashboard date after an overnight foreground resume', () => {
    const listen = jest.spyOn(AppState, 'addEventListener')
    render(<HomeScreen />)
    jest.mocked(publishDailySummary).mockClear()

    jest.setSystemTime(new Date(2026, 8, 13, 0, 15))
    const onStateChange = listen.mock.calls.find(
      ([event]) => event === 'change',
    )?.[1]
    expect(onStateChange).toBeDefined()
    act(() => onStateChange?.('active'))

    expect(jest.mocked(useHealthSnapshot).mock.lastCall?.[0]).toEqual(
      new Date(2026, 8, 13, 0, 15),
    )
    expect(publishDailySummary).toHaveBeenCalledWith(mockState.snapshot)
  })

  it('does not advance an explicitly selected historical date', () => {
    const listen = jest.spyOn(AppState, 'addEventListener')
    mockInitialParams = { date: '2026-09-11' }
    const view = render(<HomeScreen />)
    jest.mocked(publishDailySummary).mockClear()

    jest.setSystemTime(new Date(2026, 8, 13, 0, 15))
    view.rerender(<HomeScreen />)

    expect(jest.mocked(useHealthSnapshot).mock.lastCall?.[0]).toEqual(
      new Date('2026-09-11T12:00:00'),
    )
    expect(listen).not.toHaveBeenCalled()
    expect(publishDailySummary).not.toHaveBeenCalled()
  })

  it('clears widget readings when the current-day Health read fails', () => {
    mockState = {
      ...mockState,
      status: 'error',
      error: 'Unable to load health data',
    }
    render(<HomeScreen />)
    expect(publishDailySummary).toHaveBeenCalledWith(null)
  })

  it('surfaces a widget update failure without hiding the dashboard', () => {
    jest
      .mocked(publishDailySummary)
      .mockReturnValueOnce(
        'Unable to update Daily rings. Reopen the app to try again.',
      )
    render(<HomeScreen />)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByLabelText('Steps 5,000')).toBeTruthy()
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
    fireEvent.press(screen.getByRole('button', { name: 'Settings' }))
    expect(mockPush).toHaveBeenCalledWith('/settings')
  })

  it('does not treat measured zero activity as missing data', () => {
    mockState = {
      ...mockState,
      snapshot: makeSnapshot({ steps: 0, calories: 0, sleepHours: null }),
    }
    render(<HomeScreen />)

    expect(screen.getByLabelText('Steps 0')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Steps 0' }).props.accessibilityValue,
    ).toEqual({ text: 'Goal not met (0%)' })
    expect(
      screen.queryByRole('button', { name: 'Review Health access' }),
    ).toBeNull()
  })

  it('shows the morning weigh-in without mounting the activity heatmap', () => {
    render(<HomeScreen />)

    expect(
      screen.getByLabelText(/^Gym,.*Weight, 78\.4 kg weigh-in/),
    ).toBeTruthy()
    expect(screen.queryByText('7-day average: 78.4 kg')).toBeNull()
  })

  it('keeps Settings in the header and icon-only navigation with page dots in the footer', () => {
    render(<HomeScreen />)

    expect(
      screen.getByRole('header', {
        name: 'Saturday, September 12, 2026',
      }),
    ).toBeTruthy()
    expect(screen.getAllByRole('header')).toHaveLength(1)
    expect(screen.getAllByText('Sat 12')).toHaveLength(1)
    expect(screen.queryByText('Today')).toBeNull()
    expect(screen.queryByRole('button', { name: /Choose date/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Previous week' })).toBeNull()
    for (const name of ['Insights', 'Open coach']) {
      expect(
        within(screen.getByTestId('home-content')).queryByRole('button', {
          name,
        }),
      ).toBeNull()
      expect(
        within(screen.getByTestId('home-footer')).getByRole('button', {
          name,
        }),
      ).toBeTruthy()
    }
    expect(
      within(screen.getByTestId('home-content')).getByRole('button', {
        name: 'Settings',
      }),
    ).toBeTruthy()
    const footer = within(screen.getByTestId('home-footer'))
    expect(footer.queryByRole('button', { name: 'Settings' })).toBeNull()
    expect(footer.getAllByRole('button')).toHaveLength(4)
    expect(
      footer.getByRole('button', { name: 'Show dashboard page 1 of 2' }),
    ).toBeSelected()
    expect(screen.queryByText('0/2')).toBeNull()
    for (const label of ['Insights', 'Settings', 'Chat']) {
      expect(screen.queryByText(label)).toBeNull()
    }
    fireEvent.press(
      within(screen.getByTestId('home-footer')).getByRole('button', {
        name: 'Insights',
      }),
    )
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/insights',
      params: { date: '2026-09-12' },
    })
  })

  it('keeps footer page dots in sync with swipes and disables them when the grid is unavailable', () => {
    const { rerender } = render(<HomeScreen />)
    fireEvent(screen.getByTestId('goal-viewport'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 402, height: 600 } },
    })
    fireEvent.scroll(screen.getByTestId('goal-pages'), {
      nativeEvent: {
        contentOffset: { x: 402, y: 0 },
        contentSize: { width: 804, height: 600 },
        layoutMeasurement: { width: 402, height: 600 },
      },
    })
    expect(
      screen.getByRole('button', { name: 'Show dashboard page 2 of 2' }),
    ).toBeSelected()
    expect(
      screen.getByRole('button', { name: 'Show dashboard page 2 of 2' }).props[
        'aria-pressed'
      ],
    ).toBe(true)
    expect(
      screen.getByRole('button', { name: 'Show dashboard page 1 of 2' }).props[
        'aria-pressed'
      ],
    ).toBe(false)
    fireEvent.press(
      screen.getByRole('button', { name: 'Show dashboard page 1 of 2' }),
    )
    expect(screen.getByLabelText('Steps 5,000')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Show dashboard page 1 of 2' }),
    ).toBeSelected()
    expect(
      screen.getByRole('button', { name: 'Show dashboard page 1 of 2' }).props[
        'aria-pressed'
      ],
    ).toBe(true)

    mockState = {
      ...mockState,
      status: 'error',
      error: 'Unable to load health data',
    }
    rerender(<HomeScreen />)
    expect(
      screen.getByRole('button', { name: 'Show dashboard page 1 of 2' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Insights' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Open coach' })).toBeEnabled()
  })

  it('opens Insights on the day currently displayed on the dashboard', () => {
    mockInitialParams = { date: '2026-09-11' }
    render(<HomeScreen />)
    fireEvent.press(screen.getByRole('button', { name: 'Insights' }))
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/insights',
      params: { date: '2026-09-11' },
    })
    expect(
      jest.mocked(useHealthSnapshot).mock.lastCall?.[0]?.toDateString(),
    ).toBe(new Date(2026, 8, 11).toDateString())
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

  it('keeps a stop action available for a running Live Activity on iOS 16.x after a Health error', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    })
    Object.defineProperty(Platform, 'Version', {
      configurable: true,
      value: '16.6',
    })
    mockLive.isReading.mockReturnValue(true)
    mockState = {
      ...mockState,
      status: 'error',
      snapshot: null,
      error: 'Unable to load health data',
    }

    render(<HomeScreen />)

    expect(mockLive.addStopListener).toHaveBeenCalledTimes(1)
    const stopListener = mockLive.addStopListener.mock.results[0].value
    expect(stopListener.remove).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.press(
        screen.getByRole('button', { name: 'Stop reading timer' }),
      )
      await Promise.resolve()
    })
    expect(mockLive.stopReading).toHaveBeenCalledTimes(1)
    expect(stopListener.remove).not.toHaveBeenCalled()
  })

  it('reconciles a deferred stop after the selected date changes', async () => {
    let finishStop: (() => void) | undefined
    mockLive.isReading.mockReturnValue(true)
    mockLive.stopReading.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishStop = resolve
        }),
    )
    const { rerender } = render(<HomeScreen />)

    fireEvent.press(
      screen.getByRole('button', { name: 'Reading, stops the reading timer' }),
    )
    mockInitialParams = { date: '2026-09-11' }
    rerender(<HomeScreen />)

    expect(
      screen.getByRole('header', { name: 'Friday, September 11, 2026' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Reading, stops the reading timer' }),
    ).toBeTruthy()

    mockLive.isReading.mockReturnValue(false)
    await act(async () => {
      finishStop?.()
      await Promise.resolve()
    })

    expect(
      screen.queryByRole('button', {
        name: 'Reading, stops the reading timer',
      }),
    ).toBeNull()
    expect(
      screen.getByRole('link', {
        name: 'Reading, starts a reading timer and opens Apple Books',
      }),
    ).toBeTruthy()
  })

  it('re-enables the header refresh button when the hook reports a read failure', async () => {
    let finishRefresh: (() => void) | undefined
    mockRefresh.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishRefresh = resolve
        }),
    )
    const { rerender } = render(<HomeScreen />)
    fireEvent.press(
      screen.getByRole('button', { name: /^Refresh health data,/ }),
    )

    expect(mockRefresh).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('home-refresh')).toBeDisabled()
    expect(
      screen.getByTestId('home-refresh').props.accessibilityState.busy,
    ).toBe(true)

    mockState = {
      ...mockState,
      status: 'error',
      error: 'Unable to load health data',
    }
    await act(async () => {
      finishRefresh?.()
    })
    rerender(<HomeScreen />)

    expect(screen.getByTestId('home-refresh')).toBeEnabled()
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  it('keeps existing navigation destinations reachable', () => {
    render(<HomeScreen />)

    fireEvent.press(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.press(screen.getByRole('button', { name: 'Open coach' }))
    fireEvent.press(
      screen.getByRole('button', { name: 'Show dashboard page 2 of 2' }),
    )
    fireEvent.press(screen.getByRole('button', { name: 'See achievements' }))

    expect(mockPush.mock.calls).toEqual([
      ['/settings'],
      [{ pathname: '/coach', params: { date: '2026-09-12' } }],
      [{ pathname: '/achievements', params: { date: '2026-09-12' } }],
    ])
  })

  it('keeps the selected day after Gym details without synthesizing a returned reading', async () => {
    mockInitialParams = { date: '2026-09-11' }
    mockState = {
      ...mockState,
      snapshot: makeSnapshot({ bodyMassHistory: null }),
    }
    render(<HomeScreen />)
    act(focusHome)
    fireEvent.press(screen.getByRole('button', { name: /^Gym,/ }))
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/gym',
      params: { date: '2026-09-11' },
    })
    await act(async () => focusHome())
    expect(mockRefresh).not.toHaveBeenCalled()
    expect(
      jest.mocked(useHealthSnapshot).mock.lastCall?.[0]?.toDateString(),
    ).toBe(new Date(2026, 8, 11).toDateString())
    expect(
      screen.getByLabelText(/^Gym,.*Weight, no morning weigh-in/),
    ).toBeTruthy()
  })

  it('carries the selected day into steps, coach, and the full metric breakdown', () => {
    mockInitialParams = { date: '2026-09-11' }
    render(<HomeScreen />)

    fireEvent.press(screen.getByRole('button', { name: 'Steps 5,000' }))
    fireEvent.press(screen.getByRole('button', { name: 'Open coach' }))
    fireEvent.press(
      screen.getByRole('button', { name: 'Show dashboard page 2 of 2' }),
    )
    fireEvent.press(screen.getByRole('button', { name: 'See achievements' }))

    expect(mockPush.mock.calls).toEqual([
      [{ pathname: '/steps', params: { date: '2026-09-11' } }],
      [{ pathname: '/coach', params: { date: '2026-09-11' } }],
      [{ pathname: '/achievements', params: { date: '2026-09-11' } }],
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
      screen.getByRole('header', {
        name: 'Friday, September 11, 2026',
      }),
    ).toBeTruthy()
  })

  it('leaves immediate focus refreshes to the shared snapshot hook', () => {
    render(<HomeScreen />)
    act(focusHome)
    act(focusHome)

    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('keeps the fallback on the selected day after returning from Health access settings', async () => {
    mockInitialParams = { date: '2026-09-11' }
    mockState = { ...mockState, snapshot: null }
    const { rerender } = render(<HomeScreen />)
    act(focusHome)
    expect(mockRefresh).not.toHaveBeenCalled()

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
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy()
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
    expect(screen.getByLabelText(/^Gym,.*Cardio, Stairs 32 min/)).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /^Gym,/ }).props.accessibilityValue,
    ).toEqual({ text: 'Goal not met (33%)' })
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
      expectedTop: 32,
    },
    {
      platform: 'ios',
      top: 62,
      bottom: 34,
      expectedTop: 62,
    },
  ])(
    'accounts for $platform safe areas without relying on a vertical scroll view',
    ({ platform, top, bottom, expectedTop }) => {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: platform,
      })
      jest
        .mocked(useSafeAreaInsets)
        .mockReturnValue({ top, bottom, left: 0, right: 0 })
      render(<HomeScreen />)

      const style = StyleSheet.flatten(
        screen.getByTestId('home-screen').props.style,
      )
      expect(style.paddingTop).toBe(expectedTop)
      expect(
        StyleSheet.flatten(screen.getByTestId('home-content').props.style)
          .paddingTop,
      ).toBe(8)
      expect(
        StyleSheet.flatten(screen.getByTestId('home-footer').props.style)
          .paddingBottom,
      ).toBe(bottom)
    },
  )

  it.each(['light', 'dark'] as const)(
    'uses the %s home theme with horizontal-only paging',
    (theme) => {
      mockTheme = theme
      render(<HomeScreen />)

      const scroll = screen.getByTestId('home-screen')
      expect(StyleSheet.flatten(scroll.props.style).backgroundColor).toBe(
        Colors[theme].homeBackground,
      )
      expect(scroll.props.contentContainerStyle).toBeUndefined()
      expect(screen.getByTestId('goal-pages').props.horizontal).toBe(true)
      expect(screen.getByTestId('goal-pages').props.pagingEnabled).toBe(true)
      expect(screen.getByLabelText('Steps 5,000')).toBeTruthy()
    },
  )
})
