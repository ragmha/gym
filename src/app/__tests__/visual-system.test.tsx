import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ScrollView, StyleSheet } from 'react-native'

import { makeSnapshot } from '@/components/dashboard/__fixtures__/healthSnapshot'
import { Colors, type ThemeName } from '@/constants/Colors'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import type { ThemePreference } from '@/stores/ThemeStore'

import CoachScreen from '../coach'
import AchievementsScreen from '../achievements'
import SettingsScreen from '../settings'
import StepsScreen from '../steps'

let mockTheme: ThemeName = 'light'
let mockState: ReturnType<typeof useHealthSnapshot>
const mockRefresh = jest.fn(async () => undefined)
const mockSetPreference = jest.fn()
const mockBack = jest.fn()

jest.mock('@/hooks/useHealthSnapshot', () => ({
  useHealthSnapshot: jest.fn(() => mockState),
}))
jest.mock('@/lib/healthSnapshot/HealthSnapshotSource', () => ({
  healthSnapshot: {
    getStepHistory: jest.fn(async () => []),
    getActivityHistory: jest.fn(async () => []),
    getWaterHistory: jest.fn(async () => []),
    getWorkoutHistory: jest.fn(async () => []),
    isAvailable: jest.fn(() => false),
  },
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
jest.mock('@/stores/ThemeStore', () => ({
  useThemeStore: (
    selector: (state: {
      preference: ThemePreference
      setPreference: typeof mockSetPreference
      tileOrder: string[]
      gymTileOrder: string[]
    }) => unknown,
  ) =>
    selector({
      preference: 'system',
      setPreference: mockSetPreference,
      tileOrder: [],
      gymTileOrder: [],
    }),
}))
jest.mock('@/lib/coach', () => ({
  activeCoachEngine: { chat: jest.fn() },
}))

const screens = [
  {
    name: 'Steps',
    Screen: StepsScreen,
    testID: 'steps-screen',
    surface: 'homeBackground',
  },
  {
    name: 'Achievements',
    Screen: AchievementsScreen,
    testID: 'achievements-screen',
    surface: 'background',
  },
  {
    name: 'Settings',
    Screen: SettingsScreen,
    testID: 'settings-screen',
    surface: 'background',
  },
  {
    name: 'Coach',
    Screen: CoachScreen,
    testID: 'coach-screen',
    surface: 'homeBackground',
  },
] as const

beforeEach(() => {
  jest.useFakeTimers()
  jest.clearAllMocks()
  jest
    .spyOn(healthSnapshot, 'getActivityHistory')
    .mockReturnValue(new Promise(() => {}))
  mockTheme = 'light'
  mockRefresh.mockResolvedValue(undefined)
  mockState = {
    snapshot: makeSnapshot(),
    status: 'ready',
    error: null,
    isDemoMode: false,
    authorizationStatus: 'idle',
    authorizationError: null,
    refresh: mockRefresh,
    requestAuthorization: jest.fn(async () => true),
  }
  jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2026-09-12' })
  jest.mocked(useRouter).mockReturnValue({ ...useRouter(), back: mockBack })
})

afterEach(() => {
  jest.clearAllTimers()
  jest.useRealTimers()
})

describe.each(['light', 'dark'] as const)('Whole-app %s appearance', (mode) => {
  it.each(screens)(
    'uses the shared surface and an accessible back control in $name',
    async ({ Screen, testID, surface, name }) => {
      mockTheme = mode
      const result = render(<Screen />)
      if (name === 'Achievements') {
        await screen.findByTestId('badge-most-steps')
      }
      expect(
        StyleSheet.flatten(screen.getByTestId(testID).props.style)
          .backgroundColor,
      ).toBe(Colors[mode][surface])
      const back = screen.getByRole('button', {
        name: /^(Go to Home|Go back|Back)$/,
      })
      expect(StyleSheet.flatten(back.props.style).width).toBeGreaterThanOrEqual(
        44,
      )
      expect(
        StyleSheet.flatten(back.props.style).height,
      ).toBeGreaterThanOrEqual(44)
      fireEvent.press(back)
      expect(mockBack).toHaveBeenCalledTimes(1)
      expect(result.UNSAFE_getAllByType(ScrollView).length).toBeGreaterThan(0)
    },
  )
})

it('goes to the dashboard when there is no screen to go back to', () => {
  const replace = jest.fn()
  jest.mocked(useRouter).mockReturnValue({
    ...useRouter(),
    back: mockBack,
    replace,
    canGoBack: () => false,
  })
  render(<StepsScreen />)
  fireEvent.press(screen.getByRole('button', { name: 'Go to Home' }))
  expect(replace).toHaveBeenCalledWith('/')
  expect(mockBack).not.toHaveBeenCalled()
})

describe('Restyled detail states', () => {
  it.each([{ name: 'steps', Screen: StepsScreen }])(
    'does not show missing measurements during loading in $name and retains error retry',
    async ({ Screen }) => {
      mockState = { ...mockState, status: 'loading', snapshot: null }
      const { rerender } = render(<Screen />)
      expect(screen.getByText('Loading health data...')).toBeTruthy()
      expect(screen.queryByLabelText('Steps unavailable')).toBeNull()
      mockState = { ...mockState, status: 'error', error: 'Health read failed' }
      rerender(<Screen />)
      expect(screen.getByRole('alert')).toHaveTextContent('Health read failed')
      await act(async () => {
        fireEvent.press(
          screen.getByRole('button', { name: 'Retry loading health data' }),
        )
      })
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    },
  )

  it.each([0, 19_999, 20_000, 25_000])(
    'uses only the fixed 20,000-step goal for progress, reading %s',
    (steps) => {
      mockState = { ...mockState, snapshot: makeSnapshot({ steps }) }
      render(<StepsScreen />)
      expect(
        screen.getByRole('progressbar').props.accessibilityValue,
      ).toMatchObject({
        min: 0,
        max: 20_000,
        now: Math.min(steps, 20_000),
      })
      expect(screen.queryByText('Daily goal met') !== null).toBe(
        steps >= 20_000,
      )
      expect(screen.getByLabelText('Walking distance unavailable')).toBeTruthy()
      expect(screen.getByLabelText('Active minutes unavailable')).toBeTruthy()
    },
  )

  it('does not draw a zero-progress indicator when step data is missing', () => {
    mockState = { ...mockState, snapshot: makeSnapshot({ steps: null }) }
    render(<StepsScreen />)
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.getByLabelText('Steps unavailable')).toBeTruthy()
  })

  it('keeps theme selection in native-sized grouped radio rows', () => {
    render(<SettingsScreen />)
    const option = screen.getByRole('radio', { name: 'Dark theme' })
    expect(
      StyleSheet.flatten(option.props.style).minHeight,
    ).toBeGreaterThanOrEqual(44)
    fireEvent.press(option)
    expect(mockSetPreference).toHaveBeenCalledWith('dark')
  })

  it('keeps the coach composer and suggestions accessible without shrinking targets', () => {
    render(<CoachScreen />)
    expect(screen.getByLabelText('Message your coach')).toBeTruthy()
    const suggestion = screen.getByRole('button', {
      name: 'Am I recovered enough to train?',
    })
    expect(
      StyleSheet.flatten(suggestion.props.style).minHeight,
    ).toBeGreaterThanOrEqual(44)
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
  })
})
