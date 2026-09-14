import { fireEvent, render } from '@testing-library/react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { useDailyCoachInsight } from '@/hooks/useDailyCoachInsight'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'

import FitnessMetricsScreen from '../fitness-metrics'
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

jest.mock('@/hooks/useDailyCoachInsight', () => ({
  useDailyCoachInsight: jest.fn(() => ({ insight: null, status: 'idle' })),
}))

jest.mock('@/components/charts/ActivityHeatmap', () => ({
  ActivityHeatmap: () => null,
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
  jest.mocked(useLocalSearchParams).mockReturnValue({})
})

describe('HomeScreen health data', () => {
  it.each([null, missingSnapshot])(
    'keeps missing steps honest without filling home with empty metrics: %j',
    (snapshot) => {
      mockSnapshot = snapshot
      const { getByLabelText, getByText, queryByText, queryByLabelText } =
        render(<HomeScreen />)

      expect(queryByLabelText('Recovery unavailable')).toBeNull()
      expect(queryByLabelText('Active calories unavailable')).toBeNull()
      expect(getByLabelText('Steps unavailable')).toBeTruthy()
      fireEvent.press(getByLabelText('More health data'))
      expect(getByText('No weigh-in available')).toBeTruthy()
      expect(queryByText('30%')).toBeNull()
    },
  )

  it('preserves partial measurements without inventing recovery', () => {
    mockSnapshot = { ...completeSnapshot, restingHeartRate: null }
    const { getByLabelText, getByText, queryByText } = render(<HomeScreen />)

    expect(queryByText(/Recovery/i)).toBeNull()
    expect(getByLabelText('Steps 8,000')).toBeTruthy()
    fireEvent.press(getByLabelText('More health data'))
    expect(getByText('78.4')).toBeTruthy()
  })

  it('adds and removes secondary readings as data becomes available or disappears', () => {
    const { getByLabelText, getByText, queryByText, rerender } = render(
      <HomeScreen />,
    )
    expect(getByLabelText('Steps unavailable')).toBeTruthy()
    expect(queryByText('Sleep')).toBeNull()

    mockSnapshot = completeSnapshot
    rerender(<HomeScreen />)
    expect(getByLabelText('Steps 8,000')).toBeTruthy()
    expect(getByText('Sleep')).toBeTruthy()

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
    expect(getByLabelText('Sleep 0.0 hrs')).toBeTruthy()
    expect(queryByText('0%')).toBeNull()
  })

  describe('Selected-day health routes', () => {
    it.each([
      { name: 'steps', Screen: StepsScreen },
      { name: 'all metrics', Screen: FitnessMetricsScreen },
    ])(
      'reads $name for the requested local date instead of today',
      ({ Screen }) => {
        jest
          .mocked(useLocalSearchParams)
          .mockReturnValue({ date: '2026-09-11' })
        mockSnapshot = completeSnapshot
        const { rerender } = render(<Screen />)

        expect(
          jest.mocked(useHealthSnapshot).mock.lastCall?.[0]?.toDateString(),
        ).toBe(new Date(2026, 8, 11).toDateString())

        jest
          .mocked(useLocalSearchParams)
          .mockReturnValue({ date: '2026-09-10' })
        rerender(<Screen />)
        expect(
          jest.mocked(useHealthSnapshot).mock.lastCall?.[0]?.getDate(),
        ).toBe(10)
      },
    )

    it('passes the same date from all metrics to step details', () => {
      const push = jest.fn()
      jest.mocked(useRouter).mockReturnValue({ ...useRouter(), push })
      jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2026-09-11' })
      const { getByText } = render(<FitnessMetricsScreen />)

      fireEvent.press(getByText('Steps'))

      expect(push).toHaveBeenCalledWith({
        pathname: '/steps',
        params: { date: '2026-09-11' },
      })
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
        const { getByRole, getByText } = render(<FitnessMetricsScreen />)

        expect(getByRole('alert')).toBeTruthy()
        expect(getByText('Back to home')).toBeTruthy()
        expect(useHealthSnapshot).not.toHaveBeenCalled()
      },
    )
  })
})

describe('FitnessMetricsScreen health data', () => {
  it.each([null, missingSnapshot])(
    'does not send a fabricated recovery assessment to the coach: %j',
    (snapshot) => {
      mockSnapshot = snapshot
      const { getByText, queryByText } = render(<FitnessMetricsScreen />)

      expect(getByText('Not enough recovery data')).toBeTruthy()
      expect(getByText('-- %')).toBeTruthy()
      expect(queryByText('Under-recovered')).toBeNull()
      expect(useDailyCoachInsight).toHaveBeenLastCalledWith({
        snapshot,
        recovery: null,
      })
    },
  )

  it.each(['hrv', 'restingHeartRate', 'sleepHours'] as const)(
    'keeps recovery unavailable when %s is missing',
    (missingMetric) => {
      mockSnapshot = { ...completeSnapshot, [missingMetric]: null }
      const { getByText } = render(<FitnessMetricsScreen />)

      expect(getByText('-- %')).toBeTruthy()
      expect(getByText('8,000')).toBeTruthy()
      expect(useDailyCoachInsight).toHaveBeenLastCalledWith({
        snapshot: mockSnapshot,
        recovery: null,
      })
    },
  )

  it('shows real zeros while keeping unavailable recovery neutral', () => {
    mockSnapshot = {
      ...missingSnapshot,
      steps: 0,
      calories: 0,
      sleepHours: 0,
      waterLiters: 0,
    }
    const { getByText } = render(<FitnessMetricsScreen />)

    expect(getByText('0')).toBeTruthy()
    expect(getByText('0 kcal')).toBeTruthy()
    expect(getByText('0.0 hrs')).toBeTruthy()
    expect(getByText('0.0 L')).toBeTruthy()
    expect(getByText('-- %')).toBeTruthy()
  })

  it('forwards the unchanged complete-input recovery score', () => {
    mockSnapshot = completeSnapshot
    const { getByText } = render(<FitnessMetricsScreen />)

    expect(getByText('85 %')).toBeTruthy()
    expect(useDailyCoachInsight).toHaveBeenLastCalledWith({
      snapshot: completeSnapshot,
      recovery: expect.objectContaining({ score: 85, tone: 'primed' }),
    })
  })
})

describe('StepsScreen health data', () => {
  it.each([null, missingSnapshot])(
    'shows unavailable steps and calories without inventing zeros: %j',
    (snapshot) => {
      mockSnapshot = snapshot
      const { getByLabelText } = render(<StepsScreen />)

      expect(getByLabelText('Steps unavailable')).toBeTruthy()
      expect(getByLabelText('Calories unavailable')).toBeTruthy()
      expect(getByLabelText('Walking distance unavailable')).toBeTruthy()
      expect(getByLabelText('Active minutes unavailable')).toBeTruthy()
    },
  )

  it('does not infer missing calories, distance, or active minutes from steps', () => {
    mockSnapshot = { ...completeSnapshot, calories: null }
    const { getByLabelText, getByText } = render(<StepsScreen />)

    expect(getByText('8,000')).toBeTruthy()
    expect(getByLabelText('Calories unavailable')).toBeTruthy()
    expect(getByLabelText('Walking distance unavailable')).toBeTruthy()
    expect(getByLabelText('Active minutes unavailable')).toBeTruthy()
  })

  it('displays measured zero steps and calories', () => {
    mockSnapshot = { ...missingSnapshot, steps: 0, calories: 0 }
    const { getByLabelText, queryByLabelText } = render(<StepsScreen />)

    expect(getByLabelText('0 steps')).toBeTruthy()
    expect(getByLabelText('0 kcal')).toBeTruthy()
    expect(queryByLabelText('Steps unavailable')).toBeNull()
    expect(queryByLabelText('Calories unavailable')).toBeNull()
  })
})
