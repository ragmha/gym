import WorkoutDetail from '@/components/WorkoutDetail'
import { useWorkoutSessionStoreBase } from '@/stores/WorkoutSessionStore'
import type { WorkoutTemplate } from '@/types/models'
import { fireEvent, render, screen } from '@testing-library/react-native'

jest.mock('@/hooks/useThemeColor', () => ({
  useTheme: () => ({
    text: '#000000',
    subtitleText: '#666666',
    cardSurface: '#ffffff',
    success: '#008000',
    successInactive: '#e0f0e0',
    border: '#cccccc',
    accent: '#007aff',
  }),
}))

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const View = require('react-native').View
  const chain = {} as Record<'delay' | 'duration', jest.Mock>
  chain.delay = jest.fn(() => chain)
  chain.duration = jest.fn(() => chain)
  return {
    __esModule: true,
    default: { View },
    FadeIn: chain,
    useAnimatedStyle: jest.fn((factory) => factory()),
    useSharedValue: jest.fn((initialValue) => ({ value: initialValue })),
    withSpring: jest.fn((value) => value),
    withTiming: jest.fn((value) => value),
  }
})

const TEMPLATE: WorkoutTemplate = {
  id: 'a0000000-0000-4000-8000-000000000001',
  day: '1',
  week: '1',
  title: 'Push Day',
  videoURL: null,
  cardio: { morning: 0, evening: 0 },
  color: 'hsl(200, 50%, 87.5%)',
  exercises: [
    { id: 'bench', title: 'Bench Press', sets: 2, reps: 12, variation: null },
  ],
}

beforeEach(() => {
  useWorkoutSessionStoreBase.setState({ sessions: {} })
})

describe('WorkoutDetail in a WorkoutSession', () => {
  it('reads selected sets from the session store and updates the rendered count immediately', () => {
    const session = useWorkoutSessionStoreBase.getState().startSession(TEMPLATE)

    render(
      <WorkoutDetail
        item={TEMPLATE.exercises[0]}
        sessionId={session.id}
        index={0}
      />,
    )

    expect(screen.getByText('0/2')).toBeTruthy()

    fireEvent.press(screen.getByText('S1'))

    expect(screen.getByText('1/2')).toBeTruthy()
  })
})
