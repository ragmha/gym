import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { useLocalSearchParams } from 'expo-router'

import GymScreen from '@/app/gym/lifting'
import { PROGRAMME } from '@/lib/gymProgramme'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import { useGymLogStore } from '@/stores/GymLogStore'

jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } =
    jest.requireActual<typeof import('@/constants/Colors')>(
      '@/constants/Colors',
    )
  return { useTheme: jest.fn(() => Colors.dark) }
})

beforeEach(() => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2026-10-17' })
  useGymLogStore.setState({ programmeStart: null, logs: {} })
})

afterEach(() => jest.useRealTimers())

describe('Lifting screen', () => {
  it('starts the programme, logs a set and finishes the workout', () => {
    render(<GymScreen />)

    fireEvent.press(screen.getByTestId('gym-start-programme'))
    const first = PROGRAMME[0].exercises[0]
    expect(screen.getByText(PROGRAMME[0].title)).toBeTruthy()
    expect(screen.queryByTestId('gym-finish')).toBeNull()

    fireEvent.changeText(screen.getByTestId(`gym-kg-${first.id}`), '42.5')
    fireEvent.press(screen.getByTestId(`gym-save-set-${first.id}`))
    expect(
      screen.getByLabelText(`Set 1: ${first.reps} reps × 42.5 kg`),
    ).toBeTruthy()
    expect(screen.getByText(/Set: 2 of 3/i)).toBeTruthy()
    expect(screen.getByTestId('gym-rest-timer')).toBeTruthy()

    fireEvent.press(screen.getByLabelText('1 rep max'))
    expect(screen.getByTestId('gym-one-rep-max')).toHaveTextContent(/63\.8 kg/)

    // The rating is a full-screen page after the final exercise has a set.
    expect(screen.queryByTestId('gym-finish')).toBeNull()
    const last = PROGRAMME[0].exercises.at(-1)!
    for (let i = 1; i < PROGRAMME[0].exercises.length; i++)
      fireEvent.press(screen.getByLabelText('Next exercise'))
    expect(screen.getByLabelText('Next exercise')).toBeDisabled()
    fireEvent.press(screen.getByTestId(`gym-save-set-${last.id}`))
    expect(screen.queryByTestId('gym-finish')).toBeNull()
    fireEvent.press(screen.getByLabelText('Next exercise'))
    expect(screen.queryByTestId(`gym-exercise-${last.id}`)).toBeNull()
    expect(screen.queryByTestId('gym-notes')).toBeNull()
    fireEvent.press(screen.getByTestId('gym-finish'))

    expect(screen.getByTestId('gym-finished')).toBeTruthy()
    expect(screen.queryByTestId(`gym-save-set-${first.id}`)).toBeNull()
    expect(screen.queryByTestId('gym-rest-timer')).toBeNull()
    expect(useGymLogStore.getState().logs['2026-10-17']).toMatchObject({
      day: '1',
      rating: 7,
    })
  })

  it('plans five set circles for To Failure exercises', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    const failure = PROGRAMME[0].exercises.findIndex(
      (e) => e.sets === 'To Failure',
    )
    for (let i = 0; i < failure; i++)
      fireEvent.press(screen.getByLabelText('Next exercise'))
    const { reps } = PROGRAMME[0].exercises[failure]
    expect(screen.getByLabelText('Log set 1')).toBeTruthy()
    expect(screen.getByLabelText(`Set 5: target ${reps} reps`)).toBeTruthy()
    expect(screen.queryByLabelText(/^(Log set|Set) 6/)).toBeNull()
  })

  it('undoes the last set and stops its rest timer', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    const first = PROGRAMME[0].exercises[0]
    fireEvent.press(screen.getByTestId(`gym-save-set-${first.id}`))
    expect(screen.getByTestId(`gym-set-${first.id}-1`)).toBeTruthy()

    fireEvent.press(screen.getByTestId(`gym-undo-set-${first.id}`))
    expect(screen.queryByTestId(`gym-set-${first.id}-1`)).toBeNull()
    expect(screen.queryByTestId('gym-rest-timer')).toBeNull()
    expect(
      useGymLogStore.getState().logs['2026-10-17']?.sets[first.id] ?? [],
    ).toHaveLength(0)
  })

  it('times adjustable rest between sets', () => {
    jest.useFakeTimers()
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    const first = PROGRAMME[0].exercises[0]
    expect(screen.queryByTestId('gym-rest-timer')).toBeNull()

    fireEvent.press(screen.getByTestId(`gym-save-set-${first.id}`))
    expect(screen.getByLabelText('Resting 0:00')).toBeTruthy()
    expect(screen.getByText('Rest 2:00')).toBeTruthy()

    act(() => jest.advanceTimersByTime(65_000))
    expect(screen.getByLabelText('Resting 1:05')).toBeTruthy()

    fireEvent.press(screen.getByLabelText('Add 15 seconds of rest'))
    expect(screen.getByText('Rest 2:15')).toBeTruthy()
    act(() => jest.advanceTimersByTime(75_000))
    expect(screen.getByText('Rest done')).toBeTruthy()

    // The adjustment carries over to the next set of the same exercise.
    fireEvent.press(screen.getByTestId(`gym-save-set-${first.id}`))
    expect(screen.getByLabelText('Resting 0:00')).toBeTruthy()
    expect(screen.getByText('Rest 2:15')).toBeTruthy()

    fireEvent.press(screen.getByLabelText('Dismiss rest timer'))
    expect(screen.queryByTestId('gym-rest-timer')).toBeNull()
  })

  it('moves to the next exercise once the planned sets are done', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    const [first, second] = PROGRAMME[0].exercises
    const planned = typeof first.sets === 'number' ? first.sets : 5
    for (let i = 0; i < planned; i++) {
      expect(screen.getByTestId(`gym-exercise-${first.id}`)).toBeTruthy()
      fireEvent.press(screen.getByTestId(`gym-save-set-${first.id}`))
    }
    expect(screen.getByTestId(`gym-exercise-${second.id}`)).toBeTruthy()
    expect(screen.getByTestId('gym-rest-timer')).toBeTruthy()

    // An extra "+" set stays on its exercise.
    fireEvent.press(screen.getByLabelText('Previous exercise'))
    fireEvent.press(screen.getByLabelText(`Log set ${planned + 1}`))
    expect(
      screen.getByTestId(`gym-set-${first.id}-${planned + 1}`),
    ).toBeTruthy()
  })

  it('opens the rating page after the final planned set', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    const { exercises } = PROGRAMME[0]
    const last = exercises.at(-1)!
    for (let i = 1; i < exercises.length; i++)
      fireEvent.press(screen.getByLabelText('Next exercise'))
    const planned = typeof last.sets === 'number' ? last.sets : 5
    for (let i = 0; i < planned; i++)
      fireEvent.press(screen.getByTestId(`gym-save-set-${last.id}`))
    expect(screen.getByTestId('gym-finish')).toBeTruthy()

    fireEvent.press(screen.getByLabelText('Previous exercise'))
    expect(screen.getByTestId(`gym-exercise-${last.id}`)).toBeTruthy()
  })

  it('opens a finished day on its summary', () => {
    useGymLogStore.setState({
      programmeStart: '2026-10-17',
      logs: {
        '2026-10-17': {
          day: '1',
          sets: {},
          rating: 8,
          finishedAt: new Date(2026, 9, 17, 9).toISOString(),
        },
      },
    })
    render(<GymScreen />)
    expect(screen.getByTestId('gym-finished')).toHaveTextContent(/rated 8\/10/)
  })

  it('steps rest from the shown target after clamping', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    const first = PROGRAMME[0].exercises[0]
    const reps = screen.getByTestId(`gym-reps-${first.id}`)
    fireEvent.changeText(reps, String(first.reps - 1))
    fireEvent.press(screen.getByTestId(`gym-save-set-${first.id}`))
    for (let i = 0; i < 12; i++)
      fireEvent.press(screen.getByLabelText('Remove 15 seconds of rest'))
    expect(screen.getByText('Rest 0:30')).toBeTruthy()

    // Hitting the target lowers the base below the floor; +15 still shows.
    fireEvent.changeText(reps, String(first.reps))
    fireEvent.press(screen.getByTestId(`gym-save-set-${first.id}`))
    expect(screen.getByText('Rest 0:30')).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Add 15 seconds of rest'))
    expect(screen.getByText('Rest 0:45')).toBeTruthy()
  })

  it('expands the exercise card to full screen', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    expect(screen.getByText(PROGRAMME[0].title)).toBeTruthy()
    expect(screen.getByText('Lifting')).toBeTruthy()

    fireEvent.press(screen.getByLabelText('Full screen'))
    expect(screen.queryByText(PROGRAMME[0].title)).toBeNull()
    expect(screen.queryByText('Lifting')).toBeNull()

    fireEvent.press(screen.getByLabelText('Exit full screen'))
    expect(screen.getByText(PROGRAMME[0].title)).toBeTruthy()
  })

  it('blocks saving an invalid weight', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    const first = PROGRAMME[0].exercises[0]
    fireEvent.changeText(screen.getByTestId(`gym-kg-${first.id}`), '0')
    expect(screen.getByTestId(`gym-save-set-${first.id}`)).toBeDisabled()
  })

  it('shows rest days without exercises', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-12' })
    render(<GymScreen />)
    expect(screen.getByText('Active rest day. Cardio only.')).toBeTruthy()
    expect(screen.queryByTestId('gym-finish')).toBeNull()
  })

  it('moves between exercises one at a time', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    const [first, second] = PROGRAMME[0].exercises
    expect(screen.getByTestId(`gym-exercise-${first.id}`)).toBeTruthy()
    expect(screen.getByLabelText('Previous exercise')).toBeDisabled()

    fireEvent.press(screen.getByLabelText('Next exercise'))
    expect(screen.getByTestId(`gym-exercise-${second.id}`)).toBeTruthy()
    expect(screen.queryByTestId(`gym-exercise-${first.id}`)).toBeNull()
    expect(screen.getByText(second.title)).toBeTruthy()
  })

  it('blocks saving invalid reps', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    const first = PROGRAMME[0].exercises[0]
    fireEvent.changeText(screen.getByTestId(`gym-reps-${first.id}`), '')
    expect(screen.getByTestId(`gym-save-set-${first.id}`)).toBeDisabled()
  })

  it('opens an exercise demo from the info button', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          name: 'cable reverse-grip pushdown',
          gifUrl: 'https://static.exercisedb.dev/media/VjYliFZ.gif',
          targetMuscles: ['triceps'],
          secondaryMuscles: ['forearms'],
          equipments: ['cable'],
          instructions: ['Step:1 Attach a straight bar.'],
        },
      }),
    } as Response)
    const day = PROGRAMME.findIndex((d) =>
      d.exercises.some(
        (e) => e.title === 'Reverse-Grip Cable Triceps Pushdown',
      ),
    )
    useGymLogStore.setState({
      programmeStart: localDateKey(new Date(2026, 9, 17 - day)),
    })
    render(<GymScreen />)
    const index = PROGRAMME[day].exercises.findIndex(
      (e) => e.title === 'Reverse-Grip Cable Triceps Pushdown',
    )
    for (let i = 0; i < index; i++)
      fireEvent.press(screen.getByLabelText('Next exercise'))

    fireEvent.press(screen.getByTestId('gym-exercise-info'))

    expect(await screen.findByTestId('gym-exercise-info-media')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://oss.exercisedb.dev/api/v1/exercises/VjYliFZ',
      expect.anything(),
    )
    expect(screen.getByText('Attach a straight bar.')).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Close'))
    expect(screen.queryByTestId('gym-exercise-info-sheet')).toBeNull()
    fetchMock.mockRestore()
  })
})
