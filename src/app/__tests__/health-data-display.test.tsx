import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'

import HomeScreen from '../index'
import StepsScreen from '../steps'

const missingSnapshot: DailyHealthSnapshot = {
  date: '2026-09-12',
  steps: null,
  calories: null,
  sleepHours: null,
  heartRate: null,
  hrv: null,
  restingHeartRate: null,
  waterLiters: null,
  flightsClimbed: null,
  bodyMassKg: null,
  bodyMassHistory: null,
  dietaryCalories: null,
  workouts: [],
}

const completeSnapshot: DailyHealthSnapshot = {
  ...missingSnapshot,
  steps: 8_000,
  calories: 450,
  sleepHours: 8,
  heartRate: 70,
  hrv: 50,
  restingHeartRate: 65,
  waterLiters: 2,
  flightsClimbed: 6,
  bodyMassKg: 78.4,
  bodyMassHistory: [
    { kilograms: 78.4, startISO: new Date(2026, 8, 12, 7).toISOString() },
  ],
  dietaryCalories: 2_100,
}

let mockSnapshot: DailyHealthSnapshot | null = null

jest.mock('@/hooks/useHealthSnapshot', () => ({
  useHealthSnapshot: jest.fn(() => ({
    snapshot: mockSnapshot,
    refresh: jest.fn(),
  })),
}))

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual<typeof import('react-native-safe-area-context')>(
    'react-native-safe-area-context',
  ),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

jest.mock('@/components/dashboard/CalendarStrip', () => ({
  CalendarStrip: () => null,
}))

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
  },
}))

jest.mock('@/hooks/useThemeColor', () => {
  const theme: Record<string, string> = {
    background: '#FFFFFF',
    cardBackground: '#FFFFFF',
    text: '#111111',
    subtitleText: '#666666',
    icon: '#666666',
    accent: '#007AFF',
    disabled: '#888888',
    success: '#00AA00',
    danger: '#AA0000',
    warning: '#AAAA00',
    border: '#EEEEEE',
  }
  return {
    useTheme: () => theme,
    useThemeColor: (_props: unknown, name: string) => theme[name] ?? '#666666',
  }
})

beforeEach(() => {
  mockSnapshot = null
  jest.clearAllMocks()
  jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2026-09-12' })
})

describe('HomeScreen health data', () => {
  it.each([null, missingSnapshot])(
    'keeps missing steps honest without filling home with empty metrics: %j',
    (snapshot) => {
      mockSnapshot = snapshot
      const { getByLabelText, queryByText, queryByLabelText } = render(
        <HomeScreen />,
      )

      expect(queryByLabelText('Recovery unavailable')).toBeNull()
      expect(queryByLabelText('Active calories unavailable')).toBeNull()
      expect(getByLabelText('Steps unavailable')).toBeTruthy()
      expect(getByLabelText(/^Gym,.*Weight, no morning weigh-in/)).toBeTruthy()
      expect(queryByText('30%')).toBeNull()
    },
  )

  it('preserves partial measurements without inventing recovery', () => {
    mockSnapshot = { ...completeSnapshot, restingHeartRate: null }
    const { getByLabelText, queryByText } = render(<HomeScreen />)

    expect(queryByText(/Recovery/i)).toBeNull()
    expect(getByLabelText('Steps 8,000')).toBeTruthy()
    expect(getByLabelText(/^Gym,.*Weight, 78\.4 kg weigh-in/)).toBeTruthy()
  })

  it('updates priority readings without introducing secondary metrics', () => {
    const { getByLabelText, queryByText, rerender } = render(<HomeScreen />)
    expect(getByLabelText('Steps unavailable')).toBeTruthy()
    expect(queryByText('Sleep')).toBeNull()

    mockSnapshot = completeSnapshot
    rerender(<HomeScreen />)
    expect(getByLabelText('Steps 8,000')).toBeTruthy()
    expect(getByLabelText('Water 2.0 liters recorded')).toBeTruthy()
    expect(queryByText('Sleep')).toBeNull()

    mockSnapshot = null
    rerender(<HomeScreen />)
    expect(getByLabelText('Steps unavailable')).toBeTruthy()
    expect(queryByText('Sleep')).toBeNull()
  })

  it('displays measured zeroes without promoting a recovery assessment', () => {
    mockSnapshot = {
      ...completeSnapshot,
      hrv: 0,
      restingHeartRate: 100,
      sleepHours: 0,
      steps: 0,
    }
    const { getByLabelText, queryByText } = render(<HomeScreen />)

    expect(getByLabelText('Steps 0')).toBeTruthy()
    expect(queryByText('0%')).toBeNull()
    expect(queryByText('Sleep')).toBeNull()
    expect(queryByText(/Recovery/i)).toBeNull()
  })

  describe('Selected-day health routes', () => {
    it.each([{ name: 'steps', Screen: StepsScreen }])(
      'reads $name for the requested local date instead of today',
      async ({ name, Screen }) => {
        jest
          .mocked(useLocalSearchParams)
          .mockReturnValue({ date: '2026-09-11' })
        mockSnapshot = completeSnapshot
        const { rerender } = render(<Screen />)

        expect(
          jest.mocked(useHealthSnapshot).mock.lastCall?.[0]?.toDateString(),
        ).toBe(new Date(2026, 8, 11).toDateString())
        if (name === 'steps') {
          await waitFor(() =>
            expect(screen.getByTestId('steps-week-chart')).toBeTruthy(),
          )
        }

        jest
          .mocked(useLocalSearchParams)
          .mockReturnValue({ date: '2026-09-10' })
        rerender(<Screen />)
        expect(
          jest.mocked(useHealthSnapshot).mock.lastCall?.[0]?.getDate(),
        ).toBe(10)
        if (name === 'steps') {
          await waitFor(() =>
            expect(screen.getByTestId('steps-week-chart')).toBeTruthy(),
          )
        }
      },
    )

    it('shows the selected-day activity and navigates dates without changing data sources', async () => {
      const replace = jest.fn()
      jest.mocked(useRouter).mockReturnValue({ ...useRouter(), replace })
      jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2026-09-12' })
      mockSnapshot = completeSnapshot
      const historyRead = jest
        .spyOn(healthSnapshot, 'getActivityHistory')
        .mockResolvedValue([
          {
            date: '2026-09-06',
            steps: 4_000,
            calories: 200,
            walkingDistanceKm: 2,
            activeMinutes: 20,
          },
          {
            date: '2026-09-07',
            steps: 5_000,
            calories: 220,
            walkingDistanceKm: 3,
            activeMinutes: 25,
          },
          {
            date: '2026-09-08',
            steps: 6_000,
            calories: 240,
            walkingDistanceKm: 4,
            activeMinutes: 30,
          },
          {
            date: '2026-09-09',
            steps: 7_000,
            calories: 260,
            walkingDistanceKm: 4.5,
            activeMinutes: 35,
          },
          {
            date: '2026-09-10',
            steps: 8_000,
            calories: 280,
            walkingDistanceKm: 5,
            activeMinutes: 40,
          },
          {
            date: '2026-09-11',
            steps: 9_000,
            calories: 300,
            walkingDistanceKm: 5.5,
            activeMinutes: 45,
          },
          {
            date: '2026-09-12',
            steps: 10_000,
            calories: 320,
            walkingDistanceKm: 6,
            activeMinutes: 50,
          },
        ])

      try {
        const { getByLabelText, getByRole, getByText } = render(<StepsScreen />)

        expect(getByText('Week analytics')).toBeTruthy()
        expect(getByRole('button', { name: 'Next day' })).toBeTruthy()
        await waitFor(() =>
          expect(getByLabelText('Active minutes 50 Min')).toBeTruthy(),
        )
        expect(getByLabelText('Walking distance 6 Km')).toBeTruthy()
        expect(historyRead).toHaveBeenCalledWith(new Date(2026, 8, 12, 12), 7)

        fireEvent.press(getByRole('button', { name: 'Previous day' }))
        expect(replace).toHaveBeenCalledWith({
          pathname: '/steps',
          params: { date: '2026-09-11' },
        })
      } finally {
        historyRead.mockRestore()
      }
    })

    it.each([
      { date: 'invalid' },
      { date: '2026-02-31' },
      { date: '' },
      { date: ['2026-09-11', '2026-09-12'] },
    ])(
      'rejects an invalid or ambiguous date without silently showing today: $date',
      ({ date }) => {
        jest.mocked(useLocalSearchParams).mockReturnValue({ date })
        const { getByRole, getByText } = render(<StepsScreen />)

        expect(getByRole('alert')).toBeTruthy()
        expect(getByText('Open Insights')).toBeTruthy()
        expect(useHealthSnapshot).not.toHaveBeenCalled()
      },
    )
  })
})

describe('StepsScreen health data', () => {
  it.each([null, missingSnapshot])(
    'shows unavailable steps and calories without inventing zeros: %j',
    async (snapshot) => {
      mockSnapshot = snapshot
      const { getByLabelText, getByTestId } = render(<StepsScreen />)

      expect(getByLabelText('Steps unavailable')).toBeTruthy()
      expect(getByLabelText('Calories unavailable')).toBeTruthy()
      expect(getByLabelText('Walking distance unavailable')).toBeTruthy()
      expect(getByLabelText('Active minutes unavailable')).toBeTruthy()
      await waitFor(() => expect(getByTestId('steps-week-chart')).toBeTruthy())
    },
  )

  it('does not infer missing calories, distance, or active minutes from steps', async () => {
    mockSnapshot = { ...completeSnapshot, calories: null }
    const { getByLabelText, getByText, getByTestId } = render(<StepsScreen />)

    expect(getByText('8,000')).toBeTruthy()
    expect(getByLabelText('Calories unavailable')).toBeTruthy()
    expect(getByLabelText('Walking distance unavailable')).toBeTruthy()
    expect(getByLabelText('Active minutes unavailable')).toBeTruthy()
    await waitFor(() => expect(getByTestId('steps-week-chart')).toBeTruthy())
  })

  it('displays measured zero steps and calories', async () => {
    mockSnapshot = { ...missingSnapshot, steps: 0, calories: 0 }
    const { getByLabelText, queryByLabelText, getByTestId } = render(
      <StepsScreen />,
    )

    expect(getByLabelText('0 steps')).toBeTruthy()
    expect(getByLabelText('0 kcal')).toBeTruthy()
    expect(queryByLabelText('Steps unavailable')).toBeNull()
    expect(queryByLabelText('Calories unavailable')).toBeNull()
    await waitFor(() => expect(getByTestId('steps-week-chart')).toBeTruthy())
  })
})
