import { WorkoutCompleteModal } from '@/components/workout/WorkoutCompleteModal'
import { supabase } from '@/lib/supabase'
import type { WorkoutSession, WorkoutTemplate } from '@/types/models'
import { render, screen } from '@testing-library/react-native'

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native')
  const chain: {
    delay: (milliseconds: number) => object
    duration: (milliseconds: number) => object
  } = {
    delay: () => chain,
    duration: () => chain,
  }

  return {
    __esModule: true,
    default: { View },
    FadeIn: chain,
    FadeInUp: chain,
  }
})

jest.mock('@/hooks/useThemeColor', () => ({
  useTheme: () => ({
    text: '#0F172A',
    background: '#F8FAFC',
    cardBackground: '#FFFFFF',
    icon: '#64748B',
    selectedCircle: '#16A34A',
    accent: '#2563EB',
    success: '#16A34A',
    warning: '#D97706',
    border: '#E2E8F0',
    successInactive: 'rgba(22,163,74,0.14)',
    cardSurface: '#F1F5F9',
    subtitleText: '#475569',
  }),
  useThemeColor: jest.fn((_props, colorName: string) => {
    const colors: Record<string, string> = {
      text: '#0F172A',
      background: '#F8FAFC',
      cardBackground: '#FFFFFF',
      tint: '#2563EB',
      icon: '#64748B',
    }
    return colors[colorName] ?? '#CCCCCC'
  }),
}))

const TEMPLATE: WorkoutTemplate = {
  id: 'template-1',
  day: '1',
  week: '1',
  title: 'Push Day',
  videoURL: null,
  cardio: { morning: 10, evening: 0 },
  color: '#FFFFFF',
  exercises: [
    { id: 'bench', title: 'Bench Press', sets: 2, reps: 10, variation: null },
    { id: 'row', title: 'Row', sets: 2, reps: 8, variation: null },
  ],
}

const SESSION: WorkoutSession = {
  id: 'session-1',
  templateId: TEMPLATE.id,
  startedAt: '2026-06-12T10:00:00.000Z',
  completedAt: '2026-06-12T10:40:00.000Z',
  status: 'complete',
  cardio: { morning: 10, evening: 0 },
  cardioCompleted: { morning: true, evening: false },
  exerciseProgress: {
    bench: {
      detailId: 'bench',
      selectedSets: [true, true],
      weightPerSet: [30, 30],
    },
    row: {
      detailId: 'row',
      selectedSets: [true, false],
      weightPerSet: [20, 40],
    },
  },
}

function mockPriorAggregateQuery() {
  const limit = jest.fn(async () => ({
    data: [
      {
        completed_at: '2026-06-05T10:00:00.000Z',
        total_volume_kg: 400,
      },
    ],
    error: null,
  }))
  const order = jest.fn(() => ({ limit }))
  const lt = jest.fn(() => ({ order }))
  const eq = jest.fn(() => ({ lt, order }))
  const select = jest.fn(() => ({ eq }))
  jest.mocked(supabase).from.mockReturnValue({ select } as never)
}

describe('WorkoutCompleteModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPriorAggregateQuery()
  })

  it('renders computed workout efficiency stats for the completed session', async () => {
    render(
      <WorkoutCompleteModal
        visible
        onDismiss={jest.fn()}
        session={SESSION}
        template={TEMPLATE}
        cardioMinutes={10}
      />,
    )

    expect(screen.getByText('Workout efficiency')).toBeTruthy()
    expect(screen.getAllByText('3/4')).toHaveLength(2)
    expect(screen.getByText('40m')).toBeTruthy()
    expect(screen.getByText('19kg/min')).toBeTruthy()
    expect(await screen.findByText('↑ 90.0%')).toBeTruthy()
    expect(screen.getByText('760kg')).toBeTruthy()
  })

  it('renders the on-device coach narration', async () => {
    render(
      <WorkoutCompleteModal
        visible
        onDismiss={jest.fn()}
        session={SESSION}
        template={TEMPLATE}
      />,
    )

    expect(await screen.findByText('AI Coach · On-device')).toBeTruthy()
    expect(
      await screen.findByText('You completed 75% of Push Day and moved 760kg.'),
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Next: Volume is up from the prior session, so protect recovery before adding more load.',
      ),
    ).toBeTruthy()
  })
})
