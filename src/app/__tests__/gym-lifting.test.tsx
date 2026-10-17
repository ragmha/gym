import { fireEvent, render, screen } from '@testing-library/react-native'
import { useLocalSearchParams } from 'expo-router'

import GymScreen from '@/app/gym/lifting'
import { PROGRAMME } from '@/lib/gymProgramme'
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
    expect(screen.getByTestId('gym-finish')).toBeDisabled()

    fireEvent.changeText(screen.getByTestId(`gym-kg-${first.id}`), '42.5')
    fireEvent.press(screen.getByTestId(`gym-save-set-${first.id}`))
    expect(screen.getByText(`${first.reps} × 42.5 kg`)).toBeTruthy()
    expect(screen.getByText(/Set: 2 of 3/i)).toBeTruthy()

    fireEvent.press(screen.getByLabelText('1 rep max'))
    expect(screen.getByTestId('gym-one-rep-max')).toHaveTextContent(/63\.8 kg/)

    fireEvent.changeText(screen.getByTestId('gym-notes'), 'Felt good')
    fireEvent.press(screen.getByTestId('gym-finish'))

    expect(screen.getByTestId('gym-finished')).toBeTruthy()
    expect(screen.queryByTestId(`gym-save-set-${first.id}`)).toBeNull()
    expect(useGymLogStore.getState().logs['2026-10-17']).toMatchObject({
      day: '1',
      rating: 7,
      notes: 'Felt good',
    })
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
})
