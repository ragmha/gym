import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { FlatList } from 'react-native'
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
import { StairHighlights } from '@/components/gym/StairmasterCalendar'
import {
  heartRateZone,
  stairmasterHighlights,
  zoneMinutes,
} from '@/components/gym/activities'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory'
import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import { localDateKey, localDaysEnding } from '@/lib/healthSnapshot/dateKey'
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
  jest.mocked(useHealthSnapshot).mockReturnValue({
    snapshot: mockToday,
    isDemoMode: false,
  } as never)
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
  // The calendar runs from the first session to the real current month.
  // Only the clock is frozen: fake timers would let waits render every month.
  beforeEach(() => {
    jest.useFakeTimers({
      doNotFake: [
        'hrtime',
        'nextTick',
        'performance',
        'queueMicrotask',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'requestIdleCallback',
        'cancelIdleCallback',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
      ],
      now: new Date(2026, 9, 17, 12),
    })
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('shows stairmaster progress, streak and a calendar of sessions', async () => {
    jest
      .spyOn(healthSnapshot, 'getStairWorkouts')
      .mockResolvedValue([
        stairs('2024-03-02', 20),
        ...[11, 12, 14, 15, 17].map((d) => stairs(`2026-10-${d}`, 30)),
      ])
    const setParams = jest.fn()
    jest.mocked(useRouter).mockReturnValue({ setParams } as never)
    const session = (start: string, bpm: number) => ({
      workout: {
        ...stairs('2026-10-17', 45),
        startISO: `2026-10-17T${start}`,
        averageHeartRate: 150,
      },
      samples: [
        { bpm: 120, startISO: `2026-10-17T${start}` },
        { bpm, startISO: `2026-10-17T${start.slice(0, 3)}00:30` },
      ],
      maxHeartRate: 180,
    })
    jest
      .spyOn(healthSnapshot, 'getStairSessions')
      .mockResolvedValue([session('06:00:00', 170), session('18:00:00', 130)])
    render(<StairmasterScreen />)
    expect(screen.getByText('Today complete')).toBeTruthy()
    expect(await screen.findByLabelText('Streak: 1D')).toBeTruthy()
    expect(screen.getByLabelText('This week: 5/7')).toBeTruthy()
    expect(screen.getByLabelText(/^Longest streak: 2 days/)).toBeTruthy()
    expect(screen.getByLabelText(/^Best month: Oct 2026/)).toBeTruthy()
    expect(screen.getByLabelText(/^Total sessions: 6\. 2h 50m/)).toBeTruthy()
    expect(screen.getByTestId('stair-monthly-chart')).toBeTruthy()
    expect(screen.getByTestId('stair-start-chart')).toBeTruthy()
    expect(
      screen.getByText('Apple Health · All-time through today'),
    ).toBeTruthy()

    // History reaches back to the first session, not a fixed window.
    // March 2024 through October 2026.
    expect(screen.UNSAFE_getByType(FlatList).props.data).toHaveLength(32)
    expect(
      screen.getByLabelText('October 15, 30/30 min').props.accessibilityState,
    ).toMatchObject({ selected: false })
    expect(screen.getByLabelText('October 16, no session')).toBeTruthy()
    fireEvent.press(screen.getByTestId('stair-day-2026-10-15'))
    expect(setParams).toHaveBeenCalledWith({ date: '2026-10-15' })

    expect(await screen.findAllByTestId('stair-session')).toHaveLength(2)
    expect(screen.getByText('Session 1 of 2')).toBeTruthy()
    expect(screen.getByText('Session 2 of 2')).toBeTruthy()
    expect(screen.getAllByLabelText('Avg BPM: 150')).toHaveLength(2)
    expect(screen.getByLabelText('Max BPM: 170')).toBeTruthy()
    expect(screen.getByLabelText('Max BPM: 130')).toBeTruthy()
    expect(screen.getByLabelText('Main zone: Z5')).toBeTruthy()
    expect(screen.getAllByLabelText('Zone 2: 0:30')).toHaveLength(2)
    expect(screen.getAllByTestId('stair-hr-chart')).toHaveLength(2)

    jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2024-03-02' })
    screen.rerender(<StairmasterScreen />)
    expect(screen.getByLabelText(/^Longest streak: 2 days/)).toBeTruthy()
    expect(screen.getByLabelText(/^Total sessions: 6\./)).toBeTruthy()
  })

  it('rereads history on a same-day reload, not when picking a day, and keeps the calendar meanwhile', async () => {
    const readAll = jest
      .spyOn(healthSnapshot, 'getStairWorkouts')
      .mockClear()
      .mockResolvedValue([stairs('2026-10-15', 30)])
    jest.spyOn(healthSnapshot, 'getStairSessions').mockResolvedValue([])
    jest.mocked(useRouter).mockReturnValue({ setParams: jest.fn() } as never)
    render(<StairmasterScreen />)
    expect(await screen.findByLabelText('October 15, 30/30 min')).toBeTruthy()

    // Picking a day blanks the snapshot, then loads that day's.
    jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2026-10-15' })
    jest.mocked(useHealthSnapshot).mockReturnValue({
      snapshot: null,
      isDemoMode: false,
    } as never)
    screen.rerender(<StairmasterScreen />)
    jest.mocked(useHealthSnapshot).mockReturnValue({
      snapshot: { ...mockToday, date: '2026-10-15' },
      isDemoMode: false,
    } as never)
    screen.rerender(<StairmasterScreen />)
    expect(await screen.findByText('No stair session this day')).toBeTruthy()
    expect(readAll).toHaveBeenCalledTimes(1)

    // Focus, foreground and new workouts reload the same day's snapshot.
    jest.mocked(useHealthSnapshot).mockReturnValue({
      snapshot: { ...mockToday },
      isDemoMode: false,
    } as never)
    screen.rerender(<StairmasterScreen />)
    expect(screen.getByLabelText('October 15, 30/30 min')).toBeTruthy()
    await act(async () => {})
    expect(readAll).toHaveBeenCalledTimes(2)
    expect(screen.getByLabelText('October 15, 30/30 min')).toBeTruthy()
  })

  it('hides the calendar while history is unread but still shows the day', async () => {
    jest
      .spyOn(healthSnapshot, 'getStairWorkouts')
      .mockRejectedValue(new Error('denied'))
    jest.spyOn(healthSnapshot, 'getStairSessions').mockResolvedValue([])
    jest.mocked(useRouter).mockReturnValue({ setParams: jest.fn() } as never)
    render(<StairmasterScreen />)
    expect(screen.queryByTestId('stair-calendar')).toBeNull()
    expect(await screen.findByText(/Could not load your history/)).toBeTruthy()
    expect(await screen.findByText('No stair session this day')).toBeTruthy()
    expect(screen.queryByTestId('stair-calendar')).toBeNull()
  })

  it('labels zone ranges with the whole BPMs each zone counts', async () => {
    jest.spyOn(healthSnapshot, 'getStairWorkouts').mockResolvedValue([])
    jest.mocked(useRouter).mockReturnValue({ setParams: jest.fn() } as never)
    jest.spyOn(healthSnapshot, 'getStairSessions').mockResolvedValue([
      {
        workout: stairs('2026-10-17', 45),
        samples: [
          { bpm: 150, startISO: '2026-10-17T06:00:00' },
          { bpm: 169, startISO: '2026-10-17T06:10:00' },
        ],
        maxHeartRate: 188,
      },
    ])
    render(<StairmasterScreen />)
    expect(await screen.findByText('151–169')).toBeTruthy()
    expect(screen.getByText('<113')).toBeTruthy()
    expect(screen.getByText('113–131')).toBeTruthy()
    expect(screen.getByText('132–150')).toBeTruthy()
    expect(screen.getByText('170+')).toBeTruthy()
    // 150 BPM counts in Z3 and 169 BPM in Z4, matching the labels.
    expect(screen.getByLabelText('Zone 3: 1:00')).toBeTruthy()
    expect(screen.getByLabelText('Zone 4: 1:00')).toBeTruthy()
  })

  it('shows -- instead of zero zones when a session has no heart-rate samples', async () => {
    jest.spyOn(healthSnapshot, 'getStairWorkouts').mockResolvedValue([])
    jest.mocked(useRouter).mockReturnValue({ setParams: jest.fn() } as never)
    jest.spyOn(healthSnapshot, 'getStairSessions').mockResolvedValue([
      {
        workout: stairs('2026-10-17', 30),
        samples: [],
        maxHeartRate: 180,
      },
    ])
    render(<StairmasterScreen />)
    expect(
      await screen.findByText('No heart-rate samples for this session.'),
    ).toBeTruthy()
    expect(screen.getByLabelText('Main zone: --')).toBeTruthy()
    expect(screen.queryByLabelText(/^Zone \d/)).toBeNull()
    expect(screen.queryByText(/^Session \d/)).toBeNull()
  })

  it('says so when the day has no stair session', async () => {
    jest.spyOn(healthSnapshot, 'getStairWorkouts').mockResolvedValue([])
    jest.mocked(useRouter).mockReturnValue({ setParams: jest.fn() } as never)
    jest.spyOn(healthSnapshot, 'getStairSessions').mockResolvedValue([])
    render(<StairmasterScreen />)
    expect(await screen.findByText('No stair session this day')).toBeTruthy()
    expect(screen.getByText('October 2026')).toBeTruthy()
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

describe('Stairmaster highlights', () => {
  it('counts a 100-day record, not sessions, and never combines short sessions', () => {
    const run = localDaysEnding(new Date(2025, 11, 31, 12), 100).map((date) => {
      const key = localDateKey(date)
      return {
        ...stairs(key, 30),
        startISO: `${key}T06:35:00`,
        endISO: `${key}T07:05:00`,
      }
    })
    const workouts = [
      ...run,
      stairs('2025-12-31', 30),
      stairs('2026-01-01', 15),
      {
        ...stairs('2026-01-01', 15),
        startISO: '2026-01-01T18:00:00',
        endISO: '2026-01-01T18:15:00',
      },
      stairs('2026-01-02', 30),
      stairs('2026-01-03', 30),
      stairs('2026-01-04', 0),
      stairs('2026-01-05', 30),
      { ...stairs('2026-01-01', 60), kind: 'running' as const },
    ].reverse()
    const highlights = stairmasterHighlights(workouts, new Date(2026, 0, 4, 12))
    expect(highlights).toMatchObject({
      bestStreak: { days: 100, start: '2025-09-23', end: '2025-12-31' },
      bestMonth: { month: '2025-12', days: 31 },
      usualStart: { minute: 390, sessions: 100, tied: false },
      sessions: 105,
      totalMinutes: 3120,
    })
    expect(highlights.monthlyGoalDays).toHaveLength(12)
    expect(highlights.monthlyGoalDays[0]).toEqual({ month: '2025-02', days: 0 })
    expect(highlights.monthlyGoalDays[10]).toEqual({
      month: '2025-12',
      days: 31,
    })
    expect(highlights.monthlyGoalDays[11]).toEqual({
      month: '2026-01',
      days: 2,
    })
    expect(highlights.startCounts).toHaveLength(48)
    expect(highlights.startCounts[13]).toBe(100)
    expect(highlights.startCounts.reduce((sum, count) => sum + count, 0)).toBe(
      105,
    )
  })

  it('handles leap days and year boundaries, preferring recent tied records', () => {
    const dates = [
      '2024-02-28',
      '2024-02-29',
      '2024-03-01',
      '2024-12-30',
      '2024-12-31',
      '2025-01-01',
    ]
    const workouts = dates.map((day, i) => ({
      ...stairs(day, 30),
      startISO: `${day}T${i < 3 ? '06:30' : '18:30'}:00`,
      endISO: `${day}T${i < 3 ? '07:00' : '19:00'}:00`,
    }))
    expect(stairmasterHighlights(workouts, new Date(2025, 0, 2))).toMatchObject(
      {
        bestStreak: { days: 3, start: '2024-12-30', end: '2025-01-01' },
        bestMonth: { month: '2024-12', days: 2 },
        usualStart: { minute: 390, sessions: 3, tied: true },
      },
    )
    expect(stairmasterHighlights([stairs('2025-01-01', 29.99)])).toMatchObject({
      bestStreak: null,
      bestMonth: null,
      usualStart: null,
      sessions: 1,
    })
  })

  it('distinguishes loading, unreadable, empty, and demo history without invented records', () => {
    const { rerender } = render(
      <StairHighlights workouts={undefined} demo={false} />,
    )
    expect(screen.getByText('Loading your history…')).toBeTruthy()
    expect(screen.queryByLabelText(/^Total sessions:/)).toBeNull()
    rerender(<StairHighlights workouts="error" demo={false} />)
    expect(screen.getByText(/Could not load your history/)).toBeTruthy()
    expect(screen.queryByLabelText(/^Longest streak:/)).toBeNull()
    rerender(<StairHighlights workouts={[]} demo={false} />)
    expect(screen.getByText(/No Stairmaster history available/)).toBeTruthy()
    rerender(<StairHighlights workouts={[stairs('2025-01-01', 15)]} demo />)
    expect(screen.getByText('Demo data · All-time through today')).toBeTruthy()
    expect(screen.getByLabelText(/^Longest streak: --/)).toBeTruthy()
    expect(screen.getByLabelText(/^Usual start: --/)).toBeTruthy()
    expect(screen.getByLabelText(/^Total sessions: 1\. 0h 15m/)).toBeTruthy()
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
