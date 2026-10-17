import { fireEvent, render, screen } from '@testing-library/react-native'
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

describe('Lifting screen', () => {
  it('starts the programme, logs a set and finishes the workout', () => {
    render(<GymScreen />)

    fireEvent.press(screen.getByTestId('gym-start-programme'))
    const first = PROGRAMME[0].exercises[0]
    expect(screen.getByText(PROGRAMME[0].title)).toBeTruthy()
    expect(screen.queryByTestId('gym-finish')).toBeNull()

    fireEvent.changeText(screen.getByTestId(`gym-kg-${first.id}`), '42.5')
    fireEvent.press(screen.getByTestId(`gym-save-set-${first.id}`))
    expect(screen.getByText(`${first.reps} × 42.5 kg`)).toBeTruthy()
    expect(screen.getByText(/Set: 2 of 3/i)).toBeTruthy()

    fireEvent.press(screen.getByLabelText('1 rep max'))
    expect(screen.getByTestId('gym-one-rep-max')).toHaveTextContent(/63\.8 kg/)

    // The rating appears only once the day's final exercise has a set.
    expect(screen.queryByTestId('gym-finish')).toBeNull()
    const last = PROGRAMME[0].exercises.at(-1)!
    for (let i = 1; i < PROGRAMME[0].exercises.length; i++)
      fireEvent.press(screen.getByLabelText('Next exercise'))
    fireEvent.press(screen.getByTestId(`gym-save-set-${last.id}`))
    expect(screen.queryByTestId('gym-notes')).toBeNull()
    fireEvent.press(screen.getByTestId('gym-finish'))

    expect(screen.getByTestId('gym-finished')).toBeTruthy()
    expect(screen.queryByTestId(`gym-save-set-${first.id}`)).toBeNull()
    expect(useGymLogStore.getState().logs['2026-10-17']).toMatchObject({
      day: '1',
      rating: 7,
    })
  })

  it('shows five set rows for To Failure exercises', () => {
    useGymLogStore.setState({ programmeStart: '2026-10-17' })
    render(<GymScreen />)
    const failure = PROGRAMME[0].exercises.findIndex(
      (e) => e.sets === 'To Failure',
    )
    for (let i = 0; i < failure; i++)
      fireEvent.press(screen.getByLabelText('Next exercise'))
    expect(screen.getByText(/Set 05/)).toBeTruthy()
    expect(screen.queryByText(/Set 06/)).toBeNull()
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
