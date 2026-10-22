import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { FlatList, StyleSheet } from 'react-native'
import { Rect } from 'react-native-svg'
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
  foodEmoji,
  foodSummary,
  heartRateZone,
  macroTargets,
  mealSlot,
  stairmasterHighlights,
  workoutKcal,
  zoneMinutes,
} from '@/components/gym/activities'
import { Colors } from '@/constants/Colors'
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
  useThemeStore.setState({
    gymTileOrder: [],
    foodGoalKcal: 2200,
    weightGoalKg: null,
  })
})

describe('Gym hub', () => {
  it('shows five activity tiles that open their own screens', () => {
    const push = jest.fn()
    jest.mocked(useRouter).mockReturnValue({ push } as never)
    render(<GymScreen />)

    expect(screen.getByLabelText('Stairmaster, 31/30 min')).toBeTruthy()
    expect(screen.getByLabelText('Cardio, no data')).toBeTruthy()
    expect(screen.getByLabelText('Lifting, Not started')).toBeTruthy()
    expect(screen.getByLabelText('Weight, 82.4 kg')).toBeTruthy()
    expect(screen.getByLabelText('Food, no data')).toBeTruthy()

    for (const id of ['stairmaster', 'cardio', 'lifting', 'weight', 'food']) {
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
      'food',
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
    expect(screen.getAllByLabelText('Zone 2, 108–125 BPM: 0:30')).toHaveLength(
      2,
    )
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
    expect(screen.getByLabelText('Zone 3, 132–150 BPM: 1:00')).toBeTruthy()
    expect(screen.getByLabelText('Zone 4, 151–169 BPM: 1:00')).toBeTruthy()
  })

  it('shows no main zone when no zone time accrues, for each same-start session', async () => {
    const error = jest.spyOn(console, 'error')
    jest.spyOn(healthSnapshot, 'getStairWorkouts').mockResolvedValue([])
    jest.mocked(useRouter).mockReturnValue({ setParams: jest.fn() } as never)
    const workout = stairs('2026-10-17', 30)
    const session = {
      workout,
      samples: [{ bpm: 150, startISO: workout.endISO }],
      maxHeartRate: 180,
    }
    jest
      .spyOn(healthSnapshot, 'getStairSessions')
      .mockResolvedValue([session, session])
    render(<StairmasterScreen />)
    expect(await screen.findAllByTestId('stair-session')).toHaveLength(2)
    expect(screen.getAllByLabelText('Main zone: --')).toHaveLength(2)
    expect(
      error.mock.calls.some((args) => String(args[0]).includes('same key')),
    ).toBe(false)
    error.mockRestore()
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
})

describe('Weight screen', () => {
  const weighIn = (day: string, kilograms: number, time = '07:00') => ({
    kilograms,
    startISO: `${day}T${time}:00`,
  })
  const history = [
    weighIn('2026-08-01', 86),
    weighIn('2026-10-10', 83.1),
    weighIn('2026-10-15', 82.9),
    weighIn('2026-10-16', 82.7),
    weighIn('2026-10-16', 80, '19:00'),
    weighIn('2026-10-17', 82.4),
  ]
  const layoutChart = () =>
    fireEvent(screen.getByTestId('weight-chart'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 280, height: 240 } },
    })

  beforeEach(() => {
    jest.mocked(useRouter).mockReturnValue({ push: jest.fn() } as never)
    jest.spyOn(healthSnapshot, 'getBodyMassHistory').mockResolvedValue(history)
    jest.spyOn(healthSnapshot, 'getHeightMeters').mockResolvedValue(null)
  })

  it('shows the latest morning weigh-in and links to add weight', async () => {
    const push = jest.fn()
    jest.mocked(useRouter).mockReturnValue({ push } as never)
    render(<WeightScreen />)
    expect(await screen.findByTestId('weight-chart')).toBeTruthy()
    expect(healthSnapshot.getBodyMassHistory).toHaveBeenCalledWith(
      expect.any(Date),
      182,
    )
    expect(
      screen.getByLabelText('Latest morning weigh-in: 82.4 kg'),
    ).toBeTruthy()
    expect(screen.getByTestId('weight-goal-status')).toHaveTextContent(
      'No goal set',
    )
    expect(screen.getByLabelText('7-day avg: 82.7')).toBeTruthy()
    fireEvent.press(screen.getByTestId('gym-add-weight'))
    expect(push).toHaveBeenCalledWith({
      pathname: '/add-weight',
      params: { date: '2026-10-17' },
    })
  })

  it('charts daily mornings for 2W and weekly averages for 3M', async () => {
    render(<WeightScreen />)
    await screen.findByTestId('weight-chart')
    expect(
      screen.getByLabelText(
        'Morning weight, past 2 weeks: 83.1 kg to 82.4 kg, lowest 82.4 kg, highest 83.1 kg',
      ),
    ).toBeTruthy()
    layoutChart()
    const fills = () =>
      screen.UNSAFE_getAllByType(Rect).map((rect) => rect.props.fill)
    // Beam, four mornings (the evening weigh-in is ignored), fade.
    expect(fills()).toHaveLength(6)
    expect(fills()[4]).toBe(Colors.dark.text)

    fireEvent.press(screen.getByRole('tab', { name: '3M' }))
    expect(
      screen.getByLabelText(/^Morning weight, weekly averages, past 3 months/),
    ).toBeTruthy()
    expect(fills()).toHaveLength(5)
  })

  it('says so when a range has no morning weigh-ins', async () => {
    jest
      .spyOn(healthSnapshot, 'getBodyMassHistory')
      .mockResolvedValue([weighIn('2026-08-01', 86)])
    render(<WeightScreen />)
    expect(
      await screen.findByText('No morning weigh-ins in this range'),
    ).toBeTruthy()
    fireEvent.press(screen.getByRole('tab', { name: '6M' }))
    expect(screen.getByTestId('weight-chart')).toBeTruthy()
  })

  it('steps a stored goal from the current weight and tracks progress', async () => {
    render(<WeightScreen />)
    await screen.findByTestId('weight-chart')
    expect(screen.getByLabelText('Start: 86.0, Aug 1')).toBeTruthy()

    fireEvent.press(screen.getByLabelText('Lower goal weight'))
    expect(useThemeStore.getState().weightGoalKg).toBe(81)
    expect(screen.getByTestId('weight-goal-status')).toHaveTextContent(
      '1.4 kg to goal',
    )
    expect(screen.getByLabelText('Goal: 81')).toBeTruthy()
    expect(screen.getByTestId('weight-goal-progress').props).toMatchObject({
      accessibilityValue: { now: 72 },
    })
    expect(screen.getByLabelText(/\. Goal 81 kg$/)).toBeTruthy()

    fireEvent.press(screen.getByLabelText('Raise goal weight'))
    fireEvent.press(screen.getByLabelText('Raise goal weight'))
    expect(useThemeStore.getState().weightGoalKg).toBe(83)
    expect(screen.getByTestId('weight-goal-status')).toHaveTextContent(
      'Goal reached',
    )
    expect(screen.getByTestId('weight-goal-progress').props).toMatchObject({
      accessibilityValue: { now: 100 },
    })
  })

  it('shows BMI from Apple Health height, or how to add it', async () => {
    jest.spyOn(healthSnapshot, 'getHeightMeters').mockResolvedValue(1.8)
    render(<WeightScreen />)
    expect(await screen.findByLabelText('BMI 25.4')).toBeTruthy()
    expect(
      screen.getByTestId('weight-bmi-marker', { includeHiddenElements: true }),
    ).toBeTruthy()
    expect(screen.getByText(/BMI doesn't reflect muscle mass/)).toBeTruthy()
  })

  it('treats a failed height read as missing', async () => {
    jest
      .spyOn(healthSnapshot, 'getHeightMeters')
      .mockRejectedValue(new Error('denied'))
    render(<WeightScreen />)
    await screen.findByTestId('weight-chart')
    expect(screen.getByLabelText('BMI unavailable')).toBeTruthy()
    expect(
      screen.queryByTestId('weight-bmi-marker', {
        includeHiddenElements: true,
      }),
    ).toBeNull()
    expect(
      screen.getByText(
        'Add your height in Apple Health, then review Health access in Settings.',
      ),
    ).toBeTruthy()
  })

  it('grows its text rows with Dynamic Type and keeps the goal chip on the plot', async () => {
    // React Native's Jest setup reports a font scale of 2.
    useThemeStore.setState({ weightGoalKg: 90 })
    jest.spyOn(healthSnapshot, 'getHeightMeters').mockResolvedValue(1.8)
    render(<WeightScreen />)
    await screen.findByLabelText('BMI 25.4')
    layoutChart()
    const style = (testID: string) =>
      StyleSheet.flatten(
        screen.getByTestId(testID, { includeHiddenElements: true }).props.style,
      )
    expect(style('weight-chart').height).toBe(260)
    expect(style('weight-goal-chip')).toMatchObject({ top: 0, height: 44 })
    expect(style('weight-bmi-ticks').height).toBe(36)
  })

  it('lists the latest mornings newest first with their changes', async () => {
    render(<WeightScreen />)
    await screen.findByTestId('weight-chart')
    expect(
      screen.getByLabelText(/October 17, 7:00\sAM, 82\.4 kg, down 0\.3 kg$/),
    ).toBeTruthy()
    expect(
      screen.getByLabelText(/October 10, 7:00\sAM, 83\.1 kg, down 2\.9 kg$/),
    ).toBeTruthy()
    expect(screen.getByLabelText(/August 1, 7:00\sAM, 86\.0 kg$/)).toBeTruthy()
  })

  it('offers a retry when the weight history cannot be read', async () => {
    jest
      .spyOn(healthSnapshot, 'getBodyMassHistory')
      .mockRejectedValueOnce(new Error('unavailable'))
    render(<WeightScreen />)
    expect(
      await screen.findByText('Unable to load weight history'),
    ).toBeTruthy()
    expect(
      screen.getByLabelText('Latest morning weigh-in: 82.4 kg'),
    ).toBeTruthy()
    // The 14-day snapshot can't stand in for the six-month start.
    expect(screen.getByLabelText(/^Start: --/)).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: /retry/i }))
    expect(await screen.findByTestId('weight-chart')).toBeTruthy()
  })

  it('only says there are no weigh-ins once the history is read', async () => {
    jest.mocked(useHealthSnapshot).mockReturnValue({
      snapshot: { ...mockToday, bodyMassHistory: null },
      isDemoMode: false,
    } as never)
    jest
      .spyOn(healthSnapshot, 'getBodyMassHistory')
      .mockRejectedValue(new Error('unavailable'))
    render(<WeightScreen />)
    expect(
      await screen.findByText('Unable to load weight history'),
    ).toBeTruthy()
    expect(
      screen.getByLabelText('Latest morning weigh-in unavailable'),
    ).toBeTruthy()
    expect(screen.queryByText(/^No morning weigh-ins? yet$/)).toBeNull()

    jest.spyOn(healthSnapshot, 'getBodyMassHistory').mockResolvedValue([])
    fireEvent.press(screen.getByRole('button', { name: /retry/i }))
    expect(await screen.findByText('No morning weigh-ins yet')).toBeTruthy()
    expect(screen.getByLabelText('No morning weigh-in yet')).toBeTruthy()
  })
})

describe('foodSummary', () => {
  const day = (
    dietaryCalories: number | null,
    workoutKcal: (number | null)[] = [],
  ) => ({
    ...makeSnapshot({ date: '2026-10-17' }),
    dietaryCalories,
    workouts: workoutKcal.map((calories) => ({
      ...stairs('2026-10-17', 30),
      calories,
    })),
  })

  it('shows no data rather than a full budget when nothing was logged', () => {
    expect(foodSummary(day(null, [300]), 2200)).toEqual({
      progress: null,
      done: false,
      caption: '--',
      headline: 'No meals logged',
    })
  })

  it('adds workout calories back to the goal and reports what is left or over', () => {
    expect(foodSummary(day(1450.4, [200.2, 112.2]), 2200)).toEqual({
      progress: 1450 / 2512,
      done: false,
      caption: '1450/2512 kcal',
      headline: '1062 kcal left',
    })
    expect(foodSummary(day(2400), 2200)).toEqual({
      progress: 1,
      done: false,
      caption: '2400/2200 kcal',
      headline: '200 kcal over',
    })
    expect(foodSummary(day(0), 2200).headline).toBe('2200 kcal left')
  })

  it('leaves the budget unknown while workout calories are', () => {
    expect(foodSummary(day(1450.4, [null]), 2200)).toEqual({
      progress: null,
      done: false,
      caption: '1450 kcal',
      headline: 'Workout calories unavailable',
    })
  })
})

describe('mealSlot', () => {
  it.each([
    [4, 'Breakfast'],
    [10, 'Breakfast'],
    [11, 'Lunch'],
    [14, 'Lunch'],
    [15, 'Snacks'],
    [17, 'Dinner'],
    [21, 'Dinner'],
    [22, 'Snacks'],
    [3, 'Snacks'],
  ])('groups %i:30 as %s', (hour, slot) => {
    expect(mealSlot(new Date(2026, 9, 17, hour, 30))).toBe(slot)
  })
})

describe('workoutKcal', () => {
  const burned = (...calories: (number | null)[]) => ({
    date: '2026-10-17',
    workouts: calories.map((kcal) => ({
      ...stairs('2026-10-17', 30),
      calories: kcal,
    })),
  })

  it('keeps unknown workout calories unknown instead of zero', () => {
    expect(workoutKcal(null)).toBeNull()
    expect(workoutKcal(burned(null, null))).toBeNull()
  })

  it('sums the known calories, and a day without workouts burned none', () => {
    expect(workoutKcal(burned())).toBe(0)
    expect(workoutKcal(burned(200.2, null, 112.2))).toBe(312)
  })
})

describe('macroTargets', () => {
  it('sets protein from body mass, fat from the goal and refuels workouts with carbs', () => {
    expect(macroTargets(2200, 312, 78)).toEqual({
      protein: 125,
      carbs: 339,
      fat: 73,
    })
    expect(macroTargets(2200, 0, 78).carbs).toBe(261)
  })

  it('leaves protein and carbs unknown without a weigh-in', () => {
    expect(macroTargets(2200, 312, null)).toEqual({
      protein: null,
      carbs: null,
      fat: 73,
    })
  })

  it('leaves carbs unknown while workout calories are', () => {
    expect(macroTargets(2200, null, 78)).toEqual({
      protein: 125,
      carbs: null,
      fat: 73,
    })
  })

  it('never sets a negative carb target', () => {
    expect(macroTargets(1200, 0, 200).carbs).toBe(0)
  })
})

describe('foodEmoji', () => {
  it.each([
    ['Oatmeal', '🥣'],
    ['Protein bar', '🍫'],
    ['Chicken salad', '🥗'],
    ['Salmon & rice', '🐟'],
    ['Chicken rice bowl', '🍗'],
    ['Iced tea', '🍵'],
    ['Steak frites', '🥩'],
    ['Goat cheese', '🍽️'],
    ['Cheeseburger', '🍔'],
    ['Milkshake', '🥤'],
    ['Chicken noodle soup', '🍲'],
    ['Cheesecake', '🍰'],
    ['Pancakes', '🥞'],
    [null, '🍽️'],
  ])('shows %s as %s', (name, emoji) => {
    expect(foodEmoji(name)).toBe(emoji)
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

  it('leaves paused time out of the zones', () => {
    expect(
      zoneMinutes(
        [
          { bpm: 100, startISO: '2026-10-17T06:00:00' },
          { bpm: 170, startISO: '2026-10-17T06:01:00' },
        ],
        '2026-10-17T06:02:00',
        180,
        [
          { startISO: '2026-10-17T06:00:45', endISO: '2026-10-17T06:01:15' },
          { startISO: '2026-10-17T06:01:30', endISO: '2026-10-17T06:05:00' },
        ],
      ),
    ).toEqual([0.75, 0, 0, 0, 0.25])
  })
})
