import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native'

import { activeCoachEngine } from '@/lib/coach'
import type { CoachChatContext } from '@/lib/coach'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'

import CoachScreen from '../coach'

const mockSnapshot: DailyHealthSnapshot = {
  date: '2026-06-12',
  steps: 8400,
  calories: 520,
  sleepHours: 8,
  heartRate: 72,
  hrv: 50,
  restingHeartRate: 65,
  waterLiters: 2.1,
  flightsClimbed: 8,
  workouts: [],
}

let mockSnapshotState: DailyHealthSnapshot | null = mockSnapshot

jest.mock('@/hooks/useHealthSnapshot', () => ({
  useHealthSnapshot: () => ({
    snapshot: mockSnapshotState,
    status: mockSnapshotState ? 'ready' : 'loading',
    isDemoMode: false,
    error: null,
    refresh: jest.fn(),
    requestAuthorization: jest.fn(),
  }),
}))

jest.mock('@/hooks/useThemeColor', () => {
  const theme = {
    text: '#0F172A',
    background: '#F8FAFC',
    cardBackground: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    tint: '#007AFF',
    icon: '#64748B',
    tabIconDefault: '#64748B',
    tabIconSelected: '#007AFF',
    shadow: '#0F172A',
    selectedCircle: '#16A34A',
    accent: '#007AFF',
    info: '#0EA5E9',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    border: '#E2E8F0',
    separator: 'rgba(100,116,139,0.16)',
    disabled: '#94A3B8',
    selectedText: '#FFFFFF',
    checkboxBackground: '#FFFFFF',
    badgeBackground: 'rgba(15,23,42,0.06)',
    accentInactive: 'rgba(0,122,255,0.12)',
    infoInactive: 'rgba(14,165,233,0.14)',
    successInactive: 'rgba(22,163,74,0.14)',
    skeleton: '#FFFFFF',
    skeletonElement: '#E2E8F0',
    videoBackground: '#020617',
    thumbnailContent: '#CBD5E1',
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    tabBarFloating: '#FFFFFF',
    cardSurface: '#F1F5F9',
    subtitleText: '#475569',
    metricSteps: '#2563EB',
    metricCalories: '#F97316',
    metricSleep: '#8B5CF6',
    metricHydration: '#0EA5E9',
    metricHeart: '#EF4444',
    metricHrv: '#10B981',
    metricRestingHr: '#F59E0B',
    metricFlights: '#6366F1',
    metricNutrition: '#22c55e',
  }

  return {
    useTheme: () => theme,
    useThemeColor: jest.fn(
      (_props: unknown, colorName: keyof typeof theme) => theme[colorName],
    ),
  }
})

const streamedResponse =
  'Based on your question, I would keep this practical. Your recovery score is 85/100. Choose a load that keeps reps crisp. If pain or injury shows up, pause and speak with a professional.'

const originalRequestAnimationFrame = global.requestAnimationFrame

describe('CoachScreen', () => {
  beforeAll(() => {
    global.requestAnimationFrame = (callback) => {
      callback(0)
      return 0
    }
  })

  beforeEach(() => {
    mockSnapshotState = mockSnapshot
    jest
      .spyOn(activeCoachEngine, 'chat')
      .mockImplementation(async function* () {
        yield streamedResponse
      })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  afterAll(() => {
    global.requestAnimationFrame = originalRequestAnimationFrame
  })

  it('renders the empty state with suggestion chips', () => {
    render(<CoachScreen />)

    expect(screen.getByText('Ask your coach anything')).toBeTruthy()
    expect(screen.getByText('How was my week?')).toBeTruthy()
    expect(screen.getByText("Plan tomorrow's session")).toBeTruthy()
    expect(screen.getByText('Am I recovered enough to train?')).toBeTruthy()
  })

  it('streams a typed message to completion', async () => {
    render(<CoachScreen />)

    fireEvent.changeText(
      screen.getByPlaceholderText('Ask about training, recovery, or tomorrow…'),
      'What should I train today?',
    )
    fireEvent.press(screen.getByLabelText('Send message'))

    expect(screen.getByText('What should I train today?')).toBeTruthy()
    await waitFor(() => expect(screen.getByText(streamedResponse)).toBeTruthy())
    expect(screen.getByText('On-device AI')).toBeTruthy()
  })

  it('sends a suggestion chip', async () => {
    render(<CoachScreen />)

    fireEvent.press(screen.getByText('Am I recovered enough to train?'))

    expect(screen.getByText('Am I recovered enough to train?')).toBeTruthy()
    await waitFor(() => expect(screen.getByText(streamedResponse)).toBeTruthy())
  })

  it('uses the latest loaded snapshot when sending after health data arrives', async () => {
    mockSnapshotState = null
    const { rerender } = render(<CoachScreen />)

    mockSnapshotState = { ...mockSnapshot, steps: 9200, sleepHours: 7.5 }
    rerender(<CoachScreen />)

    fireEvent.press(screen.getByText('How was my week?'))

    await waitFor(() => expect(activeCoachEngine.chat).toHaveBeenCalled())
    const ctx = getLastChatContext()
    expect(ctx.snapshot).toEqual(mockSnapshotState)
    expect(ctx.recovery).not.toBeNull()
  })

  it('passes null recovery when sending before a health snapshot is available', async () => {
    mockSnapshotState = null
    render(<CoachScreen />)

    fireEvent.press(screen.getByText('How was my week?'))

    await waitFor(() => expect(activeCoachEngine.chat).toHaveBeenCalled())
    const ctx = getLastChatContext()
    expect(ctx.snapshot).toBeNull()
    expect(ctx.recovery).toBeNull()
  })
})

function getLastChatContext(): CoachChatContext {
  const chat = activeCoachEngine.chat as jest.MockedFunction<
    typeof activeCoachEngine.chat
  >
  const lastCall = chat.mock.calls[chat.mock.calls.length - 1]
  expect(lastCall).toBeDefined()
  return lastCall?.[1] as CoachChatContext
}
