import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { RefreshControl } from 'react-native'

import AchievementsScreen from '@/app/achievements'
import type {
  DailyStepReading,
  DailyWaterReading,
  DailyWorkouts,
} from '@/lib/healthSnapshot/types'

const mockGetStepHistory = jest.fn<
  Promise<DailyStepReading[]>,
  [Date, number]
>()
const mockGetWaterHistory = jest.fn<
  Promise<DailyWaterReading[]>,
  [Date, number]
>()
const mockGetWorkoutHistory = jest.fn<
  Promise<DailyWorkouts[]>,
  [Date, number]
>()

jest.mock('@/lib/healthSnapshot/HealthSnapshotSource', () => ({
  healthSnapshot: {
    getStepHistory: (date: Date, days: number) =>
      mockGetStepHistory(date, days),
    getWaterHistory: (date: Date, days: number) =>
      mockGetWaterHistory(date, days),
    getWorkoutHistory: (date: Date, days: number) =>
      mockGetWorkoutHistory(date, days),
    isAvailable: () => true,
  },
}))

jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } = jest.requireActual('@/constants/Colors')
  return { useTheme: () => Colors.light }
})

const steps: DailyStepReading[] = [{ date: '2026-10-01', steps: 12_000 }]
const earned = (id: string) =>
  screen.getByTestId(`badge-${id}`).props.accessibilityLabel as string
const refresh = () =>
  act(async () => {
    await screen.UNSAFE_getByType(RefreshControl).props.onRefresh()
  })

beforeEach(() => {
  mockGetStepHistory.mockReset().mockResolvedValue(steps)
  mockGetWaterHistory
    .mockReset()
    .mockResolvedValue([{ date: '2026-10-01', liters: 2 }])
  mockGetWorkoutHistory.mockReset().mockResolvedValue([])
})

describe('AchievementsScreen', () => {
  it('keeps awards from sources that loaded when another source fails', async () => {
    mockGetWorkoutHistory.mockRejectedValue(new Error('denied'))
    render(<AchievementsScreen />)

    expect(await screen.findByTestId('badge-most-steps')).toBeTruthy()
    expect(screen.getByTestId('badge-most-water')).toBeTruthy()
    expect(screen.getByTestId('badge-heaviest-set')).toBeTruthy()
    expect(screen.queryByTestId('badge-longest-run')).toBeNull()
    expect(screen.queryByTestId('badge-workouts-1')).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent(
      "Couldn't read workouts history, so those awards are hidden.",
    )
  })

  it('ignores an older load that finishes after a newer refresh', async () => {
    let resolveFirst!: (value: DailyStepReading[]) => void
    mockGetStepHistory.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve
      }),
    )
    render(<AchievementsScreen />)

    await refresh()
    expect(earned('steps-10000')).toContain('earned')

    await act(async () => resolveFirst([]))
    expect(earned('steps-10000')).toContain('earned')
  })

  it('shows a retry warning instead of stale awards when a refresh fails', async () => {
    render(<AchievementsScreen />)
    expect(await screen.findByTestId('badge-most-steps')).toBeTruthy()

    mockGetStepHistory.mockRejectedValueOnce(new Error('denied'))
    await refresh()
    expect(screen.queryByTestId('badge-most-steps')).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent(
      "Couldn't read steps history, so those awards are hidden.",
    )

    await act(async () => {
      fireEvent.press(
        screen.getByRole('button', { name: 'Retry loading health data' }),
      )
    })
    expect(await screen.findByTestId('badge-most-steps')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
