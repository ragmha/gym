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

beforeEach(() => {
  useGymLogStore.setState({ programmeStart: '2026-10-17', logs: {} })
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

it.each([1, 6, 54])(
  'opens day %i from the grid and returns to the overview',
  (number) => {
    useGymLogStore.setState({ programmeStart: '2026-08-27' })
    const router = renderLifting()
    fireEvent.press(screen.getByTestId(`gym-programme-day-${number}`))
    const day = PROGRAMME[number - 1]
    expect(router.getPathname()).toBe('/gym/lifting/workout')
    expect(
      screen.getByText(
        `Week ${day.week} · Day ${String(number).padStart(2, '0')}`,
      ),
    ).toBeTruthy()
    expect(screen.getByText(day.title)).toBeTruthy()
    if (day.exercises.length === 0) {
      expect(screen.getByText('Active rest day. Cardio only.')).toBeTruthy()
    } else {
      expect(
        screen.getByLabelText(`${day.exercises[0].title} reps`),
      ).toBeTruthy()
    }

    fireEvent.press(screen.getByLabelText('Back to programme overview'))
    expect(router.getPathname()).toBe('/gym/lifting')
    expect(
      screen.getByLabelText(`Day 54: ${PROGRAMME[53].title}, selected day`),
    ).toBeTruthy()
    expect(useGymLogStore.getState().logs).toEqual({})
  },
)

it('keeps days after the selected date unavailable', () => {
  const router = renderLifting()
  expect(screen.getByTestId('gym-programme-day-3')).toBeEnabled()
  for (const number of [4, 54]) {
    const card = screen.getByTestId(`gym-programme-day-${number}`)
    expect(card).toBeDisabled()
    expect(card.props.accessibilityHint).toMatch(/^Available on /)
    fireEvent.press(card)
    expect(router.getPathname()).toBe('/gym/lifting')
  }
  expect(useGymLogStore.getState().logs).toEqual({})
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

it('keeps the selected date available when repeating a completed day', () => {
  const store = useGymLogStore.getState()
  store.logSet('2026-10-02', '2', 'exercise-1', { reps: 15, kilograms: null })
  store.finishWorkout('2026-10-02', {
    rating: 8,
    finishedAt: new Date(2026, 9, 2, 9),
  })
  store.startProgramme('2026-10-18')
  renderLifting()
  expect(
    screen.getByLabelText(
      `Day 2: ${PROGRAMME[1].title}, completed, selected day`,
    ),
  ).toBeTruthy()
  fireEvent.press(screen.getByTestId('gym-programme-day-2'))
  expect(screen.queryByTestId('gym-finished')).toBeNull()
  fireEvent.press(screen.getByTestId('gym-save-set-exercise-1'))
  expect(useGymLogStore.getState().logs['2026-10-19'].day).toBe('2')
  expect(useGymLogStore.getState().logs['2026-10-02'].finishedAt).not.toBeNull()
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
