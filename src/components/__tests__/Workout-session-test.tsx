import Workout from '@/components/Workout'
import { useWorkoutSessionStoreBase } from '@/stores/WorkoutSessionStore'
import type { WorkoutTemplate } from '@/types/models'
import { fireEvent, render, screen } from '@testing-library/react-native'

const mockPush = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('@/hooks/useThemeColor', () => ({
  useTheme: () => ({
    text: '#000000',
    subtitleText: '#666666',
    cardSurface: '#ffffff',
    success: '#008000',
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
  }
})

const TEMPLATE: WorkoutTemplate = {
  id: 'a0000000-0000-4000-8000-000000000001',
  day: '1',
  week: '1',
  title: 'Push Day',
  videoURL: null,
  cardio: { morning: 10, evening: 0 },
  color: 'hsl(200, 50%, 87.5%)',
  exercises: [
    { id: 'bench', title: 'Bench Press', sets: 2, reps: 12, variation: null },
  ],
}

beforeEach(() => {
  mockPush.mockClear()
  useWorkoutSessionStoreBase.setState({ sessions: {} })
})

describe('Workout card session routing', () => {
  it('creates a session when needed and routes by session id', () => {
    render(<Workout item={TEMPLATE} index={0} />)

    fireEvent.press(screen.getByText('Push Day'))

    const [session] = Object.values(
      useWorkoutSessionStoreBase.getState().sessions,
    )
    expect(session.templateId).toBe(TEMPLATE.id)
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/details/[id]',
      params: { id: session.id, title: TEMPLATE.title },
    })
  })
})
