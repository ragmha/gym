import type { WorkoutSession, WorkoutTemplate } from '@/types/models'
import { render, screen } from '@testing-library/react-native'

jest.unmock('@/stores/ExerciseStore')
jest.unmock('@/stores/WorkoutSessionStore')

const WorkoutsScreen = jest.requireActual<
  typeof import('@/app/(tabs)/workouts')
>('@/app/(tabs)/workouts').default
const { useExerciseStoreBase } = jest.requireActual<
  typeof import('@/stores/ExerciseStore')
>('@/stores/ExerciseStore')
const { useWorkoutSessionStoreBase } = jest.requireActual<
  typeof import('@/stores/WorkoutSessionStore')
>('@/stores/WorkoutSessionStore')

jest.mock('@/components/CircularProgress', () => ({
  CircularProgress: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))

jest.mock('@/hooks/useThemeColor', () => ({
  useTheme: () => ({
    background: '#ffffff',
    text: '#000000',
    subtitleText: '#666666',
    accent: '#007aff',
    cardSurface: '#ffffff',
    success: '#008000',
    border: '#cccccc',
    selectedText: '#ffffff',
    surfaceElevated: '#eeeeee',
  }),
}))

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const View = require('react-native').View
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Text = require('react-native').Text
  const chain = {} as Record<'delay' | 'duration', jest.Mock>
  chain.delay = jest.fn(() => chain)
  chain.duration = jest.fn(() => chain)
  return {
    __esModule: true,
    default: { View, Text },
    FadeIn: chain,
    FadeInDown: chain,
  }
})

const TEMPLATES: Record<string, WorkoutTemplate> = {
  'template-1': {
    id: 'template-1',
    day: '1',
    week: '1',
    title: 'Push Day',
    videoURL: null,
    cardio: { morning: 10, evening: 0 },
    color: 'hsl(200, 50%, 87.5%)',
    exercises: [
      { id: 'bench', title: 'Bench Press', sets: 3, reps: 12, variation: null },
    ],
  },
  'template-2': {
    id: 'template-2',
    day: '2',
    week: '1',
    title: 'Pull Day',
    videoURL: null,
    cardio: { morning: 0, evening: 0 },
    color: 'hsl(100, 50%, 87.5%)',
    exercises: [
      { id: 'row', title: 'Row', sets: 2, reps: 10, variation: null },
    ],
  },
}

const SESSION: WorkoutSession = {
  id: 'session-1',
  templateId: 'template-1',
  startedAt: '2026-01-01T00:00:00.000Z',
  completedAt: '2026-01-01T01:00:00.000Z',
  status: 'complete',
  cardio: { morning: 10, evening: 0 },
  exerciseProgress: {
    bench: {
      detailId: 'bench',
      selectedSets: [true, true, false],
      weightPerSet: [10, 10, 10],
    },
  },
}

beforeEach(() => {
  useExerciseStoreBase.setState({
    exercises: TEMPLATES,
    error: null,
    loading: false,
    initialized: true,
  })
  useWorkoutSessionStoreBase.setState({ sessions: { [SESSION.id]: SESSION } })
})

describe('WorkoutsScreen session totals', () => {
  it('shows active/completed workout counts and set totals through selectors', () => {
    render(<WorkoutsScreen />)

    expect(screen.getByText('Active (1)')).toBeTruthy()
    expect(screen.getByText('Done (1)')).toBeTruthy()
    expect(screen.getByText('2/3')).toBeTruthy()
  })

  it('keeps a template active when it has a newer in-progress session', () => {
    useWorkoutSessionStoreBase.setState({
      sessions: {
        [SESSION.id]: SESSION,
        'session-2': {
          ...SESSION,
          id: 'session-2',
          startedAt: '2026-01-02T00:00:00.000Z',
          completedAt: null,
          status: 'in-progress',
          exerciseProgress: {
            bench: {
              detailId: 'bench',
              selectedSets: [false, false, false],
              weightPerSet: [0, 0, 0],
            },
          },
        },
      },
    })

    render(<WorkoutsScreen />)

    expect(screen.getByText('Active (2)')).toBeTruthy()
    expect(screen.getByText('Done (0)')).toBeTruthy()
  })
})
