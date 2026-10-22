import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native'
import { useRouter } from 'expo-router'
import type { ComponentProps } from 'react'
import { StyleSheet, useWindowDimensions } from 'react-native'

import { TodayPage } from '@/components/dashboard/TodayPage'
import { makeSnapshot } from '@/components/dashboard/__fixtures__/healthSnapshot'
import { TodayColors } from '@/constants/Colors'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useDayPlanner } from '@/hooks/useDayPlanner'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import { atTime, type PlannerDay, type Reminder } from '@/lib/planner'
import type { CommuteJourney } from '@/lib/transit'
import { useGymLogStore } from '@/stores/GymLogStore'
import { useSpeakingLogStore } from '@/stores/SpeakingLogStore'
import { useThemeStore } from '@/stores/ThemeStore'

jest.mock('@/hooks/useDayPlanner', () => ({ useDayPlanner: jest.fn() }))
jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}))
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(),
}))
jest.mock('@/hooks/useThemeColor', () => ({
  useTheme: () => jest.requireActual('@/constants/Colors').Colors.light,
}))
const date = new Date(2026, 9, 21, 18)
const push = jest.fn()
const deepWork = {
  session: null,
  island: false,
  start: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  end: jest.fn(),
}
const connection: ReturnType<typeof useDayPlanner> = {
  now: date,
  day: null,
  error: null,
  busy: false,
  available: false,
  connect: jest.fn(async () => {}),
  refresh: jest.fn(),
  transit: null,
  journeys: [],
  transitError: null,
  reminderError: null,
  pendingReminders: [],
  setReminderCompleted: jest.fn(async () => {}),
}
const connectedDay: PlannerDay = {
  calendarAccess: 'granted',
  remindersAccess: 'granted',
  events: [],
  reminders: [],
}
const task = (overrides: Partial<Reminder> = {}): Reminder => ({
  id: 'task',
  title: 'Urgent task',
  dueMs: null,
  hasDueTime: false,
  priority: 1,
  completed: false,
  ...overrides,
})
const journey: CommuteJourney = {
  direction: 'Home',
  leaveMs: atTime(date, '17:05'),
  arriveMs: atTime(date, '17:45'),
  fetchedMs: atTime(date, '17:00'),
  realtime: false,
}
const renderToday = (
  snapshot: DailyHealthSnapshot | null = makeSnapshot({ date: '2026-10-21' }),
  overrides: Partial<ComponentProps<typeof TodayPage>> = {},
) =>
  render(
    <TodayPage
      snapshot={snapshot}
      date={date}
      reading={null}
      deepWork={deepWork}
      active
      healthError={null}
      onRetryHealth={jest.fn()}
      {...overrides}
    />,
  )

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(useColorScheme).mockReturnValue('light')
  jest.mocked(useWindowDimensions).mockReturnValue({
    width: 402,
    height: 874,
    scale: 3,
    fontScale: 1,
  })
  jest.mocked(useRouter).mockReturnValue({ ...useRouter(), push })
  jest.mocked(useDayPlanner).mockReturnValue(connection)
  useThemeStore.setState({ commute: null })
  useGymLogStore.setState({ logs: {} })
  useSpeakingLogStore.setState({ sessions: [] })
})

it('keeps the priority card and open grouped agenda, with secondary readings disclosed', () => {
  renderToday()
  for (const name of [
    'Good evening',
    'Steps + Gym',
    'Your agenda',
    'Morning',
    'Afternoon',
    'Night',
  ])
    expect(screen.getByRole('header', { name })).toBeTruthy()
  expect(screen.queryByRole('header', { name: 'Anytime' })).toBeNull()
  expect(
    screen.getAllByText('Calendar & Reminders · iOS 17+ build required'),
  ).toHaveLength(1)
  expect(screen.queryByText('Calendar not connected')).toBeNull()
  expect(screen.queryByText('No planned items')).toBeNull()
  for (const period of ['Morning', 'Afternoon', 'Night']) {
    expect(
      within(screen.getByTestId(`agenda-${period}`)).getByText('--'),
    ).toBeTruthy()
    expect(
      StyleSheet.flatten(
        screen.getByRole('header', { name: period }).props.style,
      ).fontSize,
    ).toBe(24)
  }
  for (const name of ['Up next', 'Inbox', 'Day plan'])
    expect(screen.queryByRole('header', { name })).toBeNull()
  expect(screen.queryByText('Suggested')).toBeNull()
  expect(screen.queryByRole('checkbox')).toBeNull()
  expect(screen.queryByLabelText(/^Steps, /)).toBeNull()
  expect(screen.queryByText('No session logged')).toBeNull()
  const activity = screen.getByRole('button', { name: 'Activity' })
  expect(activity.props.accessibilityState.expanded).toBe(false)
  fireEvent.press(activity)
  expect(screen.getByLabelText(/^Steps, /)).toBeTruthy()
  expect(
    screen.getByRole('button', { name: 'Activity' }).props.accessibilityState
      .expanded,
  ).toBe(true)
  fireEvent.press(screen.getByRole('button', { name: 'All activities' }))
  expect(screen.getByText('Not measured')).toBeTruthy()
  expect(screen.getByText('No active timer')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'Fewer activities' }))
  expect(screen.queryByText('Not measured')).toBeNull()
  fireEvent.press(screen.getByRole('button', { name: 'Open Gym' }))
  expect(push).toHaveBeenCalledWith({
    pathname: '/gym',
    params: { date: '2026-10-21' },
  })
})

it('does not invent zeroes for unknown readings, but preserves observed zeroes', () => {
  renderToday(
    makeSnapshot({
      steps: 0,
      waterLiters: 0,
      calories: null,
      sleepHours: null,
    }),
  )
  fireEvent.press(screen.getByRole('button', { name: 'Activity' }))
  expect(screen.getByLabelText('Steps, 0')).toBeTruthy()
  expect(screen.getByLabelText('Water, 0.0 L')).toBeTruthy()
  expect(screen.getByLabelText('Active energy, --')).toBeTruthy()
  expect(screen.getByLabelText('Sleep, --')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'All activities' }))
  expect(screen.getByLabelText('Health workouts, --')).toBeTruthy()
})

it.each(['light', 'dark'] as const)(
  'preserves the selected card and bento colors in %s',
  (theme) => {
    jest.mocked(useColorScheme).mockReturnValue(theme)
    renderToday(makeSnapshot({ steps: 0, waterLiters: null }))
    expect(screen.getByText('0/2 met')).toBeTruthy()
    expect(screen.getByText('0%')).toBeTruthy()
    const dots = screen.getByLabelText(
      '0% daily priority progress, Steps and Gym',
    )
    expect(StyleSheet.flatten(dots.props.style)).toEqual({
      width: 96,
      height: 96,
    })
    fireEvent.press(screen.getByRole('button', { name: 'Activity' }))
    expect(
      StyleSheet.flatten(screen.getByLabelText('Steps, 0').props.style)
        .backgroundColor,
    ).toBe(TodayColors[theme].highlight)
    expect(
      StyleSheet.flatten(screen.getByLabelText('Water, --').props.style)
        .backgroundColor,
    ).toBe(TodayColors[theme].cardBackground)
  },
)

it('shows factual events once, read-only, and distinct proposals in real remaining gaps', () => {
  jest.mocked(useDayPlanner).mockReturnValue({
    ...connection,
    available: true,
    day: {
      ...connectedDay,
      events: [
        {
          id: 'dinner',
          title: 'Dinner',
          startMs: atTime(date, '18:00'),
          endMs: atTime(date, '19:00'),
          allDay: false,
        },
      ],
      reminders: [
        task(),
        task({
          id: 'date-only',
          title: 'Today task',
          dueMs: atTime(date, '00:00'),
          priority: 0,
        }),
      ],
    },
  })
  renderToday(makeSnapshot({ steps: 100 }))
  expect(screen.getAllByText('Dinner')).toHaveLength(1)
  expect(screen.getByText('1 urgent reminder')).toBeTruthy()
  expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  expect(
    screen.getByRole('checkbox', { name: 'Urgent task, High priority' }).props
      .accessibilityState.checked,
  ).toBe(false)
  expect(screen.getByText('Due today')).toBeTruthy()
  expect(
    screen.getByRole('checkbox', { name: 'Today task, Due today' }),
  ).toBeTruthy()
  const night = within(screen.getByTestId('agenda-Night'))
  const event = night.getByTestId(
    `timeline-event-dinner-${atTime(date, '18:00')}`,
  )
  expect(event.props.accessibilityRole).not.toBe('checkbox')
  const review = night.getByTestId('timeline-suggested-review')
  expect(review.props.accessibilityLabel).toContain('Suggested')
  expect(review.props.accessibilityLabel).toContain(
    new Date(2026, 9, 21, 19, 15).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  )
  expect(screen.getByText('Gym session')).toBeTruthy()
  expect(screen.getByText('Short walk')).toBeTruthy()
  expect(screen.queryByText('Focus block')).toBeNull()
  expect(connection.setReminderCompleted).not.toHaveBeenCalled()
  fireEvent.press(
    screen.getByRole('checkbox', { name: 'Urgent task, High priority' }),
  )
  expect(connection.setReminderCompleted).toHaveBeenCalledWith('task', true)
})

it('groups overdue, undated and all-day items Anytime without inventing times', () => {
  jest.mocked(useDayPlanner).mockReturnValue({
    ...connection,
    available: true,
    day: {
      ...connectedDay,
      events: [
        {
          id: 'away',
          title: 'Away',
          startMs: atTime(date, '00:00'),
          endMs: atTime(date, '23:59'),
          allDay: true,
        },
      ],
      reminders: [
        task(),
        task({
          id: 'old',
          title: 'Overdue task',
          dueMs: new Date(2026, 9, 20, 8).getTime(),
          hasDueTime: true,
        }),
      ],
    },
  })
  renderToday()
  const anytime = within(screen.getByTestId('agenda-Anytime'))
  expect(anytime.getByText('Away')).toBeTruthy()
  expect(anytime.getByText('Overdue task')).toBeTruthy()
  expect(
    anytime.getByRole('checkbox', { name: 'Urgent task, High priority' }),
  ).toBeTruthy()
  const due = new Date(2026, 9, 20, 8)
  const dueDate = due.toLocaleDateString([], { month: 'short', day: 'numeric' })
  const dueTime = due.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
  const overdue = anytime.getByRole('checkbox', {
    name: `Overdue task, Overdue · Due ${dueDate} · ${dueTime}`,
  })
  expect(overdue.props.accessibilityHint).toBe('Complete in Apple Reminders')
  expect(overdue.props.accessibilityState.checked).toBe(false)
  expect(screen.queryByText('Suggested')).toBeNull()
})

it('uses empty granted Calendar gaps for proposals, without inventing reminders or low steps', () => {
  jest.mocked(useDayPlanner).mockReturnValue({
    ...connection,
    available: true,
    day: connectedDay,
  })
  renderToday(makeSnapshot({ steps: null }))
  expect(screen.getByText('Calendar · 0 events')).toBeTruthy()
  expect(screen.getByText('Reminders · 0 open')).toBeTruthy()
  expect(screen.queryByRole('checkbox')).toBeNull()
  expect(screen.queryByText('Short walk')).toBeNull()
  expect(screen.getByText('Gym session')).toBeTruthy()
  expect(screen.getByText('Focus block')).toBeTruthy()
  expect(screen.queryByText(/urgent reminder/)).toBeNull()
  expect(screen.queryByText('Dinner')).toBeNull()
})

it('shows actual Calendar, work and both travel directions without duplicate timelines', () => {
  const outbound = {
    ...journey,
    direction: 'To work' as const,
    leaveMs: atTime(date, '08:15'),
    arriveMs: atTime(date, '09:00'),
    realtime: true,
  }
  jest.mocked(useDayPlanner).mockReturnValue({
    ...connection,
    available: true,
    day: {
      ...connectedDay,
      events: [
        {
          id: 'meeting',
          title: 'Meeting',
          startMs: atTime(date, '09:30'),
          endMs: atTime(date, '10:30'),
          allDay: false,
        },
      ],
    },
    now: new Date(2026, 9, 21, 10),
    journeys: [journey, outbound],
    transit: journey,
  })
  renderToday()
  const rows = within(screen.getByTestId('agenda-Morning')).getAllByTestId(
    /^timeline-/,
  )
  expect(rows.map((row) => row.props.testID)).toEqual([
    'timeline-commute-To work',
    'timeline-work',
    `timeline-event-meeting-${atTime(date, '09:30')}`,
  ])
  expect(screen.getAllByText('Meeting')).toHaveLength(1)
  expect(
    screen.getByTestId(`timeline-event-meeting-${atTime(date, '09:30')}`).props
      .accessibilityLabel,
  ).toContain('Now')
  expect(screen.queryByText('Commute time not included')).toBeNull()
  fireEvent.press(
    screen.getByRole('button', { name: /Metro commute, Leave .*Timetable/ }),
  )
  expect(screen.getByText(/No live confirmation/)).toBeTruthy()
  expect(screen.getByText(/walking included/)).toBeTruthy()
})

it('keeps pending checkboxes disabled, confirms completion and undo without changing priority progress', () => {
  const initial = {
    ...connection,
    available: true,
    day: { ...connectedDay, reminders: [task()] },
  }
  jest.mocked(useDayPlanner).mockReturnValue(initial)
  const view = renderToday(makeSnapshot({ steps: 0 }))
  expect(screen.getByText('0%')).toBeTruthy()
  jest
    .mocked(useDayPlanner)
    .mockReturnValue({ ...initial, pendingReminders: ['task'] })
  view.rerender(
    <TodayPage
      snapshot={makeSnapshot({ steps: 0 })}
      date={date}
      reading={null}
      deepWork={deepWork}
      active
      healthError={null}
      onRetryHealth={jest.fn()}
    />,
  )
  const pending = screen.getByRole('checkbox', {
    name: 'Urgent task, High priority',
  })
  expect(pending).toBeDisabled()
  expect(pending.props.accessibilityState.busy).toBe(true)
  expect(pending.props.accessibilityState.checked).toBe(false)
  fireEvent.press(pending)
  expect(connection.setReminderCompleted).not.toHaveBeenCalled()
  jest.mocked(useDayPlanner).mockReturnValue({
    ...initial,
    day: { ...connectedDay, reminders: [task({ completed: true })] },
  })
  view.rerender(
    <TodayPage
      snapshot={makeSnapshot({ steps: 0 })}
      date={date}
      reading={null}
      deepWork={deepWork}
      active
      healthError={null}
      onRetryHealth={jest.fn()}
    />,
  )
  expect(screen.queryByText('1 urgent reminder')).toBeNull()
  const completed = screen.getByRole('checkbox', { name: 'Urgent task' })
  expect(completed.props.accessibilityState.checked).toBe(true)
  expect(screen.getByText('0%')).toBeTruthy()
  expect(screen.getByText('0/2 met')).toBeTruthy()
  fireEvent.press(completed)
  expect(connection.setReminderCompleted).toHaveBeenCalledWith('task', false)
})

it('supports large text wrapping on agenda and secondary metrics', () => {
  jest.mocked(useWindowDimensions).mockReturnValue({
    width: 320,
    height: 874,
    scale: 3,
    fontScale: 3,
  })
  jest.mocked(useDayPlanner).mockReturnValue({
    ...connection,
    available: true,
    day: {
      ...connectedDay,
      reminders: [
        task({
          title:
            'A long reminder title which must wrap naturally instead of being truncated',
        }),
      ],
    },
  })
  renderToday(makeSnapshot({ steps: 0 }))
  const checkbox = screen.getByRole('checkbox')
  expect(
    StyleSheet.flatten(checkbox.props.style).minHeight,
  ).toBeGreaterThanOrEqual(48)
  expect(
    screen.getByText(/^A long reminder/).props.numberOfLines,
  ).toBeUndefined()
  const body = checkbox.children[1]
  expect(
    typeof body === 'object' && StyleSheet.flatten(body.props.style).minWidth,
  ).toBe(0)
  fireEvent.press(screen.getByRole('button', { name: 'Activity' }))
  expect(
    StyleSheet.flatten(screen.getByLabelText('Steps, 0').props.style).flexBasis,
  ).toBe('100%')
})

it('keeps failures and honest access states visible with explicit permission, refresh and recovery actions', () => {
  const retry = jest.fn()
  const stop = jest.fn()
  jest.mocked(useDayPlanner).mockReturnValue({
    ...connection,
    available: true,
    day: {
      ...connectedDay,
      calendarAccess: 'denied',
      remindersAccess: 'undetermined',
    },
    error: 'Could not read Calendar and Reminders.',
    reminderError: 'Could not confirm the reminder change.',
    journeys: [journey],
    transit: journey,
    transitError: 'To work: HSL is unavailable.',
  })
  renderToday(null, {
    healthError: 'Health unavailable.',
    onRetryHealth: retry,
    reading: {
      running: true,
      last: null,
      stop,
      start: jest.fn(),
    },
  })
  for (const value of [
    'Could not read Calendar and Reminders.',
    'Could not confirm the reminder change.',
    'To work: HSL is unavailable.',
    'Partial commute coverage',
  ])
    expect(screen.getByText(value)).toBeTruthy()
  expect(screen.getByText('Calendar · Access denied')).toBeTruthy()
  expect(screen.getByText('Reminders · Not connected')).toBeTruthy()
  expect(screen.queryByText('Suggested')).toBeNull()
  expect(connection.connect).not.toHaveBeenCalled()
  fireEvent.press(screen.getByRole('button', { name: 'Today options' }))
  fireEvent.press(
    screen.getByRole('button', { name: 'Review Calendar access' }),
  )
  fireEvent.press(
    screen.getByRole('button', { name: 'Connect Apple Reminders' }),
  )
  expect(jest.mocked(connection.connect).mock.calls).toEqual([
    ['Calendar'],
    ['Reminders'],
  ])
  fireEvent.press(
    screen.getByRole('button', { name: 'Refresh Today connections' }),
  )
  expect(connection.refresh).toHaveBeenCalledTimes(1)
  expect(screen.queryByText(/Only an explicit reminder/)).toBeNull()
  fireEvent.press(screen.getByRole('button', { name: 'About Today' }))
  expect(screen.getByText(/Only an explicit reminder/)).toBeTruthy()
  fireEvent.press(
    screen.getByRole('button', { name: 'Retry loading health data' }),
  )
  fireEvent.press(screen.getByRole('button', { name: 'Stop reading timer' }))
  expect(retry).toHaveBeenCalledTimes(1)
  expect(stop).toHaveBeenCalledTimes(1)
})
