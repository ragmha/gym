import { fireEvent, screen, within } from '@testing-library/react-native'
import { Stack } from 'expo-router'
import { act, renderRouter } from 'expo-router/testing-library'
import { Text } from 'react-native'

import GymLayout, { unstable_settings as gymSettings } from '@/app/gym/_layout'
import LiftingOverview from '@/app/gym/lifting'
import LiftingLayout, {
  unstable_settings as liftingSettings,
} from '@/app/gym/lifting/_layout'
import FiveByFive from '@/app/gym/lifting/five-by-five'
import LiftingWorkout from '@/app/gym/lifting/workout'
import { PROGRAMME } from '@/lib/gymProgramme'
import { useGymLogStore } from '@/stores/GymLogStore'

jest.unmock('expo-router')

// Expo Router's test helper replaces the shared Reanimated mock with this one.
jest.mock('react-native-reanimated/mock', () => ({
  default: {},
  useReducedMotion: () => false,
}))

jest.mock('@wwdrew/expo-spotify-sdk', () => ({
  AppRemote: { connect: jest.fn(() => Promise.resolve()) },
  Auth: {
    isAvailable: jest.fn(() => true),
    cancelPending: jest.fn(() => Promise.resolve()),
    authenticate: jest.fn(() => Promise.resolve({ accessToken: 'token' })),
  },
  Content: {
    getRecommendedContentItems: jest.fn(() => Promise.resolve([])),
    getChildren: jest.fn(() => Promise.resolve([])),
  },
  Images: { load: jest.fn() },
  Player: {
    play: jest.fn(() => Promise.resolve()),
    pause: jest.fn(() => Promise.resolve()),
    resume: jest.fn(() => Promise.resolve()),
    skipNext: jest.fn(() => Promise.resolve()),
    skipPrevious: jest.fn(() => Promise.resolve()),
  },
  SpotifyURI: { unsafe: jest.fn((uri: string) => uri) },
  useConnectionState: jest.fn(() => 'disconnected'),
  usePlayerState: jest.fn(() => null),
  useSession: jest.fn(() => null),
}))

jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } =
    jest.requireActual<typeof import('@/constants/Colors')>(
      '@/constants/Colors',
    )
  return { useTheme: () => Colors.dark }
})

function renderLifting(initialUrl = '/gym/lifting?date=2026-10-19') {
  return renderRouter(
    {
      _layout: () => <Stack screenOptions={{ headerShown: false }} />,
      index: () => <Text>Home</Text>,
      'gym/_layout': { default: GymLayout, unstable_settings: gymSettings },
      'gym/index': () => <Text>Gym</Text>,
      'gym/lifting/_layout': {
        default: LiftingLayout,
        unstable_settings: liftingSettings,
      },
      'gym/lifting/index': LiftingOverview,
      'gym/lifting/workout': LiftingWorkout,
      'gym/lifting/five-by-five': FiveByFive,
    },
    { initialUrl },
  )
}

function finishDays(...days: number[]) {
  days.forEach((day, i) => {
    const store = useGymLogStore.getState()
    const dateKey = `2026-10-${String(10 + i).padStart(2, '0')}`
    store.logSet(dateKey, String(day), 'exercise-1', {
      reps: 10,
      kilograms: null,
    })
    store.finishWorkout(dateKey, {
      rating: 7,
      finishedAt: new Date(2026, 9, 10 + i, 9),
    })
  })
}

beforeEach(() => {
  useGymLogStore.setState({
    programmeStart: '2026-10-17',
    logs: {},
    completedRestDays: [],
  })
})

it('starts on the overview and requires an explicit programme start', () => {
  useGymLogStore.setState({ programmeStart: null })
  const router = renderLifting()
  const overview = within(screen.getByTestId('gym-programme-overview'))
  expect(overview.getAllByTestId(/^gym-programme-day-/)).toHaveLength(54)
  for (const day of PROGRAMME) {
    expect(overview.getByText(`Week ${day.week}`)).toBeTruthy()
    expect(overview.getByTestId(`gym-programme-day-${day.day}`)).toBeDisabled()
  }
  expect(overview.queryByText('Completed')).toBeNull()
  expect(screen.queryByTestId('gym-lifting-screen')).toBeNull()
  fireEvent.press(overview.getByTestId('gym-programme-day-1'))
  expect(router.getPathname()).toBe('/gym/lifting')
  expect(useGymLogStore.getState()).toMatchObject({
    programmeStart: null,
    logs: {},
  })

  fireEvent.press(screen.getByTestId('gym-start-programme'))
  expect(router.getPathname()).toBe('/gym/lifting')
  expect(screen.getByTestId('gym-programme-day-1')).toBeEnabled()
  expect(useGymLogStore.getState().programmeStart).toBe('2026-10-19')
  fireEvent.press(screen.getByTestId('gym-programme-day-1'))
  expect(router.getPathname()).toBe('/gym/lifting/workout')
  expect(screen.getByText(PROGRAMME[0].title)).toBeTruthy()
  expect(useGymLogStore.getState().logs).toEqual({})
})

it('opens the next day on the viewed date and returns to the overview', () => {
  const router = renderLifting()
  const day = PROGRAMME[0]
  fireEvent.press(screen.getByTestId('gym-programme-day-1'))
  expect(router.getPathname()).toBe('/gym/lifting/workout')
  expect(screen.getByText(`Week ${day.week} · Day 01`)).toBeTruthy()
  expect(screen.getByText(day.title)).toBeTruthy()
  expect(screen.getByLabelText(`${day.exercises[0].title} reps`)).toBeTruthy()

  fireEvent.press(screen.getByLabelText('Back to programme overview'))
  expect(router.getPathname()).toBe('/gym/lifting')
  expect(screen.getByLabelText(`Day 1: ${day.title}, next day`)).toBeTruthy()
  expect(useGymLogStore.getState().logs).toEqual({})
})

it('keeps days after the next day locked', () => {
  const router = renderLifting()
  expect(screen.getByTestId('gym-programme-day-1')).toBeEnabled()
  for (const number of [2, 54]) {
    const card = screen.getByTestId(`gym-programme-day-${number}`)
    expect(card).toBeDisabled()
    expect(card.props.accessibilityHint).toBe(
      'Finish the earlier days to unlock this one',
    )
    fireEvent.press(card)
    expect(router.getPathname()).toBe('/gym/lifting')
  }
  expect(useGymLogStore.getState().logs).toEqual({})
})

it('completes active rest days to unlock the next workout', () => {
  finishDays(1, 2, 3, 4, 5)
  const router = renderLifting()
  expect(screen.getByLabelText('Day 6: Active Rest Day, next day')).toBeTruthy()
  expect(screen.getByTestId('gym-programme-day-7')).toBeDisabled()
  expect(screen.getByTestId('gym-programme-day-8')).toBeDisabled()

  fireEvent.press(screen.getByTestId('gym-programme-day-6'))
  expect(router.getPathname()).toBe('/gym/lifting')
  expect(
    screen.getByLabelText('Day 6: Active Rest Day, completed'),
  ).toBeTruthy()
  expect(screen.getByLabelText('Day 7: Active Rest Day, next day')).toBeTruthy()

  fireEvent.press(screen.getByTestId('gym-programme-day-7'))
  expect(useGymLogStore.getState().completedRestDays).toEqual(['6', '7'])
  expect(
    screen.getByLabelText(`Day 8: ${PROGRAMME[7].title}, next day`),
  ).toBeTruthy()

  fireEvent.press(screen.getByTestId('gym-programme-day-8'))
  expect(router.getPathname()).toBe('/gym/lifting/workout')
  expect(screen.getByText('Week 2 · Day 08')).toBeTruthy()
  expect(
    screen.getByLabelText(`${PROGRAMME[7].exercises[0].title} reps`),
  ).toBeTruthy()
  expect(Object.keys(useGymLogStore.getState().logs)).toHaveLength(5)
})

it('reopens a completed saved day and keeps its badge when returning', () => {
  const store = useGymLogStore.getState()
  store.logSet('2026-10-18', '2', 'exercise-1', { reps: 15, kilograms: null })
  store.finishWorkout('2026-10-18', {
    rating: 8,
    finishedAt: new Date(2026, 9, 18, 9),
  })
  store.logSet('2026-10-17', '1', 'exercise-1', { reps: 15, kilograms: null })
  const savedLogs = useGymLogStore.getState().logs
  const router = renderLifting()
  expect(screen.getByTestId('gym-programme-day-2')).toHaveTextContent(
    /Completed/,
  )
  expect(screen.getAllByText('Completed')).toHaveLength(1)

  fireEvent.press(screen.getByTestId('gym-programme-day-2'))
  expect(router.getPathname()).toBe('/gym/lifting/workout')
  expect(screen.getByTestId('gym-finished')).toHaveTextContent(/rated 8\/10/)
  fireEvent.press(screen.getByLabelText('Back to programme overview'))
  expect(router.getPathname()).toBe('/gym/lifting')
  expect(screen.getByTestId('gym-programme-day-2')).toHaveTextContent(
    /Completed/,
  )
  expect(useGymLogStore.getState().logs).toEqual(savedLogs)
})

it('opens a saved workout from any viewed date', () => {
  finishDays(1, 2)
  const router = renderLifting('/gym/lifting?date=2026-10-01')
  fireEvent.press(screen.getByTestId('gym-programme-day-2'))
  expect(router.getPathname()).toBe('/gym/lifting/workout')
  expect(screen.getByTestId('gym-finished')).toHaveTextContent(/rated 7\/10/)
})

it('still opens a saved workout before the programme is started', () => {
  finishDays(1, 2)
  useGymLogStore.setState({ programmeStart: null })
  const router = renderLifting()
  expect(screen.getByTestId('gym-programme-day-3')).toBeDisabled()
  fireEvent.press(screen.getByTestId('gym-programme-day-2'))
  expect(router.getPathname()).toBe('/gym/lifting/workout')
  expect(screen.getByTestId('gym-finished')).toHaveTextContent(/rated 7\/10/)
})

it('opens the picked day on a date outside the programme schedule', () => {
  renderLifting('/gym/lifting/workout?date=2026-10-01&day=8')
  expect(screen.getByText(PROGRAMME[7].title)).toBeTruthy()
  expect(screen.queryByText('Before your programme starts.')).toBeNull()
})

it('keeps a day closed when another workout is saved on the viewed date', () => {
  useGymLogStore
    .getState()
    .logSet('2026-10-19', '3', 'exercise-1', { reps: 12, kilograms: null })
  const router = renderLifting()
  const card = screen.getByTestId('gym-programme-day-1')
  expect(card).toBeDisabled()
  expect(card.props.accessibilityHint).toBe(
    'Another workout is saved on this date',
  )
  fireEvent.press(card)
  expect(router.getPathname()).toBe('/gym/lifting')
  expect(screen.getByTestId('gym-programme-day-3')).toBeEnabled()
})

it('ignores a picked day until the programme is started', () => {
  useGymLogStore.setState({ programmeStart: null })
  renderLifting('/gym/lifting/workout?date=2026-10-19&day=8')
  expect(
    screen.getByText(
      'Start the programme from the overview to open a workout.',
    ),
  ).toBeTruthy()
})

it('reflects a newly finished workout on the overview', () => {
  const store = useGymLogStore.getState()
  store.logSet('2026-10-19', '3', 'exercise-1', { reps: 12, kilograms: null })
  renderLifting()
  expect(screen.queryByText('Completed')).toBeNull()
  fireEvent.press(screen.getByTestId('gym-programme-day-3'))
  act(() => {
    store.finishWorkout('2026-10-19', {
      rating: 7,
      finishedAt: new Date(2026, 9, 19, 9),
    })
  })
  fireEvent.press(screen.getByLabelText('Back to programme overview'))
  expect(screen.getByTestId('gym-programme-day-3')).toHaveTextContent(
    /Completed/,
  )
})

it('returns direct workout links to the overview', () => {
  const router = renderLifting('/gym/lifting/workout?date=2026-10-18')
  expect(screen.getByText(PROGRAMME[1].title)).toBeTruthy()
  fireEvent.press(screen.getByLabelText('Back to programme overview'))
  expect(router.getPathname()).toBe('/gym/lifting')
  expect(screen.getByTestId('gym-programme-overview')).toBeTruthy()
})

it('opens the 5×5 short day from the overview and returns', () => {
  const router = renderLifting()
  fireEvent.press(screen.getByTestId('gym-short-day'))
  expect(router.getPathname()).toBe('/gym/lifting/five-by-five')
  expect(screen.getByText('StrongLifts 5×5')).toBeTruthy()
  expect(screen.getByText('Workout A')).toBeTruthy()

  fireEvent.press(screen.getByLabelText('Back to programme overview'))
  expect(router.getPathname()).toBe('/gym/lifting')
  expect(useGymLogStore.getState().logs).toEqual({})
})

it('hides the short day once a programme workout is logged', () => {
  useGymLogStore
    .getState()
    .logSet('2026-10-19', '3', 'exercise-1', { reps: 12, kilograms: null })
  renderLifting()
  expect(screen.queryByTestId('gym-short-day')).toBeNull()
})
