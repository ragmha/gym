import { WorkoutProgress } from '@/components/WorkoutProgress'
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native'

// Create mock functions for dependencies
const mockPush = jest.fn()

// Type definitions for colors
interface ThemeColors {
  cardBackground: string
  text: string
  selectedCircle: string
  [key: string]: string
}

// Define a timeout for CI environments
const CI_TIMEOUT = process.env.CI ? 10000 : 5000

// Mock external dependencies
jest.mock('@/stores/ExerciseStore', () => ({
  useExerciseStore: jest.fn().mockImplementation(() => ({
    completedCount: 2,
    exercises: Array(5).fill({}),
  })),
}))

jest.mock('expo-router', () => ({
  useRouter: jest.fn().mockImplementation(() => ({
    push: mockPush,
  })),
}))

jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: jest.fn().mockImplementation((_, colorName: string) => {
    // Simple mock that returns different colors based on the requested color name
    const colors: ThemeColors = {
      cardBackground: '#FFFFFF',
      text: '#000000',
      selectedCircle: '#007AFF',
    }
    return colors[colorName] || '#CCCCCC'
  }),
}))

// Get access to the mocked functions for testing
const mockedExerciseStore = jest.requireMock('@/stores/ExerciseStore')

describe('WorkoutProgress Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()

    // Reset the exercise store mock implementation to default values
    mockedExerciseStore.useExerciseStore.mockImplementation(() => ({
      completedCount: 2,
      exercises: Array(5).fill({}),
    }))
  })

  afterEach(() => {
    // Clean up after each test
    jest.restoreAllMocks()
  })

  test('renders with the correct title and workout count', async () => {
    render(<WorkoutProgress />)

    // Use waitFor to ensure the component has been fully rendered
    await waitFor(
      () => {
        expect(screen.getByText('Workout Progress')).toBeTruthy()
        expect(screen.getByText('3 Workouts left')).toBeTruthy()
      },
      { timeout: CI_TIMEOUT },
    )
  })

  test('calculates and displays the correct progress when exercises are partially completed', async () => {
    // Default mock has 2/5 completed exercises
    render(<WorkoutProgress />)

    // Check that the display shows 3 workouts left (5 total - 2 completed)
    await waitFor(
      () => {
        expect(screen.getByText('3 Workouts left')).toBeTruthy()
      },
      { timeout: CI_TIMEOUT },
    )
  })

  test('calculates and displays the correct progress when most exercises are completed', async () => {
    // Override the mock to return different values for this test
    mockedExerciseStore.useExerciseStore.mockImplementation(() => ({
      completedCount: 4,
      exercises: Array(5).fill({}),
    }))

    render(<WorkoutProgress />)

    // Check that the display shows 1 workout left (5 total - 4 completed)
    await waitFor(
      () => {
        expect(screen.getByText('1 Workouts left')).toBeTruthy()
      },
      { timeout: CI_TIMEOUT },
    )
  })

  test('handles empty exercise list gracefully', async () => {
    // Test edge case with no exercises
    mockedExerciseStore.useExerciseStore.mockImplementation(() => ({
      completedCount: 0,
      exercises: [],
    }))

    render(<WorkoutProgress />)

    // Should display 0 workouts left
    await waitFor(
      () => {
        expect(screen.getByText('0 Workouts left')).toBeTruthy()
      },
      { timeout: CI_TIMEOUT },
    )
  })

  test('navigates to workouts screen when pressed', async () => {
    render(<WorkoutProgress />)

    // Find the touchable component by its content
    const workoutProgressElement = await waitFor(
      () => screen.getByText('Workout Progress'),
      { timeout: CI_TIMEOUT },
    )

    // Fire a press event on the container
    // This simulates a user tap on the card
    fireEvent.press(workoutProgressElement)

    // Verify that the router's push method was called with the correct route
    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledTimes(1)
        expect(mockPush).toHaveBeenCalledWith('/workouts')
      },
      { timeout: CI_TIMEOUT },
    )
  })

  test('shows 5 workouts left with 0/5 completion', async () => {
    // Test with 0/5 completed
    mockedExerciseStore.useExerciseStore.mockImplementation(() => ({
      completedCount: 0,
      exercises: Array(5).fill({}),
    }))

    render(<WorkoutProgress />)
    await waitFor(
      () => {
        expect(screen.getByText('5 Workouts left')).toBeTruthy()
      },
      { timeout: CI_TIMEOUT },
    )
  })

  test('shows 4 workouts left with 1/5 completion', async () => {
    // Test with 1/5 completed
    mockedExerciseStore.useExerciseStore.mockImplementation(() => ({
      completedCount: 1,
      exercises: Array(5).fill({}),
    }))

    render(<WorkoutProgress />)
    await waitFor(
      () => {
        expect(screen.getByText('4 Workouts left')).toBeTruthy()
      },
      { timeout: CI_TIMEOUT },
    )
  })

  test('shows 1 workout left with 4/5 completion', async () => {
    // Test with 4/5 completed
    mockedExerciseStore.useExerciseStore.mockImplementation(() => ({
      completedCount: 4,
      exercises: Array(5).fill({}),
    }))

    render(<WorkoutProgress />)
    await waitFor(
      () => {
        expect(screen.getByText('1 Workouts left')).toBeTruthy()
      },
      { timeout: CI_TIMEOUT },
    )
  })

  test('shows 0 workouts left with 5/5 completion', async () => {
    // Test with all completed
    mockedExerciseStore.useExerciseStore.mockImplementation(() => ({
      completedCount: 5,
      exercises: Array(5).fill({}),
    }))

    render(<WorkoutProgress />)
    await waitFor(
      () => {
        expect(screen.getByText('0 Workouts left')).toBeTruthy()
      },
      { timeout: CI_TIMEOUT },
    )
  })
})
