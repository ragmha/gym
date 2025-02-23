import {
  render,
  screen,
  fireEvent,
  renderHook,
} from '@testing-library/react-native'
import { WorkoutProgress } from '@/components/WorkoutProgress'
import { useExerciseStore } from '@/stores/ExerciseStore'
import { useRouter } from 'expo-router'

// Mock the stores and hooks
jest.mock('@/stores/ExerciseStore', () => ({}))
jest.mock('expo-router', () => ({}))
jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: () => '#000000',
}))

describe('WorkoutProgress', () => {
  const mockRouter = {
    push: jest.fn(),
  }

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('should use exercise store correctly', () => {
    // Test the hook in isolation
    const { result } = renderHook(() =>
      useExerciseStore((state) => ({
        completedCount: state.completedCount,
        exercises: state.exercises,
      })),
    )

    expect(result.current.completedCount()).toBe(2)
    expect(result.current.exercises.length).toBe(5)
  })

  it('should display workout progress information', () => {
    // Setup store with initial state
    renderHook(() =>
      useExerciseStore.setState({
        completedCount: () => 2,
        exercises: Array(5).fill({}),
      }),
    )

    render(<WorkoutProgress />)

    // Check for accessible elements
    const progressCard = screen.getByRole('button', {
      name: /workout progress/i,
    })
    expect(progressCard).toBeTruthy()

    // Check progress text
    expect(screen.getByText('Workout Progress')).toBeTruthy()
    expect(screen.getByText('3 Workouts left')).toBeTruthy()
    expect(screen.getByText('40%')).toBeTruthy()
  })

  it('should navigate to workouts screen when pressed', () => {
    // Test router hook in isolation
    const { result } = renderHook(() => useRouter())
    expect(result.current.push).toBeDefined()

    render(<WorkoutProgress />)

    const progressCard = screen.getByRole('button', {
      name: /workout progress/i,
    })
    fireEvent.press(progressCard)

    expect(mockRouter.push).toHaveBeenCalledWith('/workouts')
  })

  it('should calculate and display correct progress', () => {
    // Setup store with different progress using hook
    renderHook(() =>
      useExerciseStore.setState({
        completedCount: () => 4,
        exercises: Array(5).fill({}),
      }),
    )

    render(<WorkoutProgress />)

    expect(screen.getByText('1 Workouts left')).toBeTruthy()
    expect(screen.getByText('80%')).toBeTruthy()
  })
})
