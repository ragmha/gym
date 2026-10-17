import { fireEvent, render, screen } from '@testing-library/react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import GymScreen from '@/app/gym'
import CardioScreen from '@/app/gym/cardio'
import StairmasterScreen from '@/app/gym/stairmaster'
import WeightScreen from '@/app/gym/weight'
import { makeSnapshot } from '@/components/dashboard/__fixtures__/healthSnapshot'
import { currentStreak, streakStats } from '@/components/gym/ActivityDetail'
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import { useGymLogStore } from '@/stores/GymLogStore'

jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } =
    jest.requireActual<typeof import('@/constants/Colors')>(
      '@/constants/Colors',
    )
  return { useTheme: jest.fn(() => Colors.dark) }
})

const stairs = (date: string, minutes: number) => ({
  kind: 'stairClimber' as const,
  activityName: 'Stair Climber',
  averageHeartRate: null,
  calories: null,
  distance: null,
  durationMinutes: minutes,
  startISO: `${date}T06:00:00`,
  endISO: `${date}T06:45:00`,
})

const mockToday: DailyHealthSnapshot = {
  ...makeSnapshot({ date: '2026-10-17' }),
  workouts: [stairs('2026-10-17', 31.4)],
  bodyMassHistory: [{ kilograms: 82.4, startISO: '2026-10-17T07:00:00' }],
}

jest.mock('@/hooks/useHealthSnapshot', () => ({
  useHealthSnapshot: jest.fn(() => ({
    snapshot: mockToday,
    isDemoMode: false,
  })),
}))
jest.mock('@/hooks/useWorkoutHistory', () => ({
  useWorkoutHistory: jest.fn(() => null),
}))

beforeEach(() => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2026-10-17' })
  jest.mocked(useWorkoutHistory).mockReturnValue(null)
  useGymLogStore.setState({ programmeStart: null, logs: {} })
})

describe('Gym hub', () => {
  it('shows four activity tiles that open their own screens', () => {
    const push = jest.fn()
    jest.mocked(useRouter).mockReturnValue({ push } as never)
    render(<GymScreen />)

    expect(screen.getByLabelText('Stairmaster, 31/30 min')).toBeTruthy()
    expect(screen.getByLabelText('Cardio, no data')).toBeTruthy()
    expect(screen.getByLabelText('Lifting, Not started')).toBeTruthy()
    expect(screen.getByLabelText('Weight, 82.4 kg')).toBeTruthy()

    for (const id of ['stairmaster', 'cardio', 'lifting', 'weight']) {
      fireEvent.press(screen.getByTestId(`gym-tile-${id}`))
      expect(push).toHaveBeenLastCalledWith({
        pathname: `/gym/${id}`,
        params: { date: '2026-10-17' },
      })
    }
  })

  it('shows lifting set progress for the programme day', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    expect(screen.getByTestId('gym-tile-lifting')).toHaveTextContent(
      /0\/\d+ sets/,
    )
  })
})

describe('Gym detail screens', () => {
  it('shows stairmaster progress, streak and recent days', () => {
    jest.mocked(useWorkoutHistory).mockReturnValue(
      [11, 12, 13, 14, 15, 16, 17].map((d) => ({
        date: `2026-10-${d}`,
        workouts: d === 13 || d === 16 ? [] : [stairs(`2026-10-${d}`, 30)],
      })),
    )
    render(<StairmasterScreen />)
    expect(screen.getByText('Today complete')).toBeTruthy()
    expect(screen.getByLabelText('Streak: 1D')).toBeTruthy()
    expect(screen.getByLabelText('This week: 5/7')).toBeTruthy()
    expect(screen.getByTestId('recent-6-done')).toBeTruthy()
    expect(screen.getByTestId('recent-5-missed')).toBeTruthy()
  })

  it('shows the cardio plan once the programme has started', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<CardioScreen />)
    expect(screen.getByText('No session yet')).toBeTruthy()
    expect(screen.getByText(/Plan \d+ AM · \d+ PM/)).toBeTruthy()
    expect(screen.getByLabelText('Streak: --')).toBeTruthy()
  })

  it('shows the morning weigh-in and links to add weight', () => {
    const push = jest.fn()
    jest.mocked(useRouter).mockReturnValue({ push } as never)
    render(<WeightScreen />)
    expect(screen.getAllByText('82.4 kg').length).toBeGreaterThan(0)
    fireEvent.press(screen.getByTestId('gym-add-weight'))
    expect(push).toHaveBeenCalledWith({
      pathname: '/add-weight',
      params: { date: '2026-10-17' },
    })
  })
})

describe('currentStreak', () => {
  const days = (done: boolean[], end: number) =>
    done.map((d, i) => ({
      date: new Date(2026, 9, end - done.length + 1 + i, 12),
      done: d,
    }))

  it('keeps an unfinished today open but lets a missed past day break the streak', () => {
    const today = new Date(2026, 9, 17, 9)
    expect(currentStreak(days([true, true, false], 17), today)).toBe(2)
    expect(currentStreak(days([true, true, false], 16), today)).toBe(0)
  })

  it('shows a capped lookback as 30D+', () => {
    const history = Array.from({ length: 31 }, (_, i) => ({
      date: new Date(2026, 0, i + 1),
      done: true,
    }))
    expect(streakStats(history)[0].value).toBe('30D+')
  })
})
