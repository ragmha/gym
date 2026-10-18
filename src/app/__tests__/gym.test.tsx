import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { State } from 'react-native-gesture-handler'
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils'

import GymScreen from '@/app/gym'
import CardioScreen from '@/app/gym/cardio'
import StairmasterScreen from '@/app/gym/stairmaster'
import WeightScreen from '@/app/gym/weight'
import { makeSnapshot } from '@/components/dashboard/__fixtures__/healthSnapshot'
import { currentStreak, streakStats } from '@/components/gym/ActivityDetail'
import { heartRateZone, zoneMinutes } from '@/components/gym/activities'
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory'
import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import { useGymLogStore } from '@/stores/GymLogStore'
import { useThemeStore } from '@/stores/ThemeStore'

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
  useThemeStore.setState({ gymTileOrder: [] })
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

  it('rearranges tiles with a long-press drag, ignores cancelled drags and taps until Done', async () => {
    const push = jest.fn()
    jest.mocked(useRouter).mockReturnValue({ push } as never)
    render(<GymScreen />)
    fireEvent(screen.getByTestId('gym-grid'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 400 } },
    })
    await act(async () => {})
    const at = (x: number, y: number) => ({
      x,
      y,
      absoluteX: x,
      absoluteY: y,
    })

    act(() =>
      fireGestureHandler(getByGestureTestId('gym-reorder'), [
        { state: State.BEGAN, ...at(50, 50) },
        { state: State.ACTIVE, ...at(50, 50) },
        at(300, 350),
        { state: State.CANCELLED, ...at(300, 350) },
      ]),
    )
    expect(useThemeStore.getState().gymTileOrder).toEqual([])

    act(() =>
      fireGestureHandler(getByGestureTestId('gym-reorder'), [
        { state: State.BEGAN, ...at(50, 50) },
        { state: State.ACTIVE, ...at(50, 50) },
        at(300, 350),
        { state: State.END, ...at(300, 350) },
      ]),
    )

    expect(useThemeStore.getState().gymTileOrder).toEqual([
      'cardio',
      'lifting',
      'weight',
      'stairmaster',
    ])
    fireEvent.press(screen.getByTestId('gym-tile-cardio'))
    expect(push).not.toHaveBeenCalled()

    fireEvent.press(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull()
    fireEvent.press(screen.getByTestId('gym-tile-cardio'))
    expect(push).toHaveBeenCalledWith({
      pathname: '/gym/cardio',
      params: { date: '2026-10-17' },
    })
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
  it('shows stairmaster progress, streak and a calendar of sessions', async () => {
    jest.mocked(useWorkoutHistory).mockReturnValue(
      [11, 12, 13, 14, 15, 16, 17].map((d) => ({
        date: `2026-10-${d}`,
        workouts: d === 13 || d === 16 ? [] : [stairs(`2026-10-${d}`, 30)],
      })),
    )
    const setParams = jest.fn()
    jest.mocked(useRouter).mockReturnValue({ setParams } as never)
    jest.spyOn(healthSnapshot, 'getStairHeartRate').mockResolvedValue({
      workout: { ...stairs('2026-10-17', 45), averageHeartRate: 150 },
      samples: [
        { bpm: 120, startISO: '2026-10-17T06:00:00' },
        { bpm: 170, startISO: '2026-10-17T06:00:30' },
      ],
      maxHeartRate: 180,
    })
    render(<StairmasterScreen />)
    expect(screen.getByText('Today complete')).toBeTruthy()
    expect(screen.getByLabelText('Streak: 1D')).toBeTruthy()
    expect(screen.getByLabelText('This week: 5/7')).toBeTruthy()

    expect(
      screen.getByLabelText('October 15, 30/30 min').props.accessibilityState,
    ).toMatchObject({ selected: false })
    expect(screen.getByLabelText('October 16, no session')).toBeTruthy()
    fireEvent.press(screen.getByTestId('stair-day-2026-10-15'))
    expect(setParams).toHaveBeenCalledWith({ date: '2026-10-15' })

    expect(await screen.findByTestId('stair-session')).toBeTruthy()
    expect(screen.getByLabelText('Avg BPM: 150')).toBeTruthy()
    expect(screen.getByLabelText('Max BPM: 170')).toBeTruthy()
    expect(screen.getByLabelText('Main zone: Z5')).toBeTruthy()
    expect(screen.getByLabelText('Zone 2: 0:30')).toBeTruthy()
    expect(screen.getByTestId('stair-hr-chart')).toBeTruthy()
  })

  it('shows -- instead of zero zones when a session has no heart-rate samples', async () => {
    jest.mocked(useWorkoutHistory).mockReturnValue([])
    jest.mocked(useRouter).mockReturnValue({ setParams: jest.fn() } as never)
    jest.spyOn(healthSnapshot, 'getStairHeartRate').mockResolvedValue({
      workout: stairs('2026-10-17', 30),
      samples: [],
      maxHeartRate: 180,
    })
    render(<StairmasterScreen />)
    expect(
      await screen.findByText('No heart-rate samples for this session.'),
    ).toBeTruthy()
    expect(screen.getByLabelText('Main zone: --')).toBeTruthy()
    expect(screen.queryByLabelText(/^Zone \d/)).toBeNull()
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

describe('heart-rate zones', () => {
  it('splits session time across zones of max heart rate, capping sensor gaps at a minute', () => {
    expect([100, 108, 126, 144, 162].map((b) => heartRateZone(b, 180))).toEqual(
      [1, 2, 3, 4, 5],
    )
    expect(
      zoneMinutes(
        [
          { bpm: 100, startISO: '2026-10-17T06:00:00' },
          { bpm: 130, startISO: '2026-10-17T06:00:30' },
          { bpm: 170, startISO: '2026-10-17T06:10:00' },
        ],
        '2026-10-17T06:10:30',
        180,
      ),
    ).toEqual([0.5, 0, 1, 0, 0.5])
  })
})
