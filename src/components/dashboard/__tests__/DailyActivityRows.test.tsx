import { render, screen } from '@testing-library/react-native'

import { DailyActivityRows } from '@/components/dashboard/DailyActivityRows'
import { makeSnapshot } from '@/components/dashboard/__fixtures__/healthSnapshot'
import type { HealthWorkout } from '@/lib/healthSnapshot/types'

jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } =
    jest.requireActual<typeof import('@/constants/Colors')>(
      '@/constants/Colors',
    )
  return { useTheme: () => Colors.light }
})

const walking: HealthWorkout = {
  activityName: 'Walking',
  durationMinutes: 30,
  calories: 150,
  distance: 2_000,
  startISO: '2026-09-12T08:00:00Z',
  endISO: '2026-09-12T08:30:00Z',
}

const cycling: HealthWorkout = {
  activityName: 'Cycling',
  durationMinutes: 45,
  calories: null,
  distance: null,
  startISO: '2026-09-12T10:00:00Z',
  endISO: '2026-09-12T10:45:00Z',
}

describe('DailyActivityRows', () => {
  it('renders sleep and actual workouts newest first without mutating the snapshot', () => {
    const snapshot = makeSnapshot({
      sleepHours: 7.5,
      workouts: [walking, cycling],
    })
    render(<DailyActivityRows snapshot={snapshot} />)

    expect(screen.getByLabelText('Sleep 7.5 hrs')).toBeTruthy()
    expect(screen.getByText('30 min')).toBeTruthy()
    expect(screen.getByText('45 min')).toBeTruthy()
    expect(screen.getByText('150 kcal')).toBeTruthy()
    expect(screen.queryByText('0 kcal')).toBeNull()
    expect(
      screen
        .getAllByLabelText(/^(Walking|Cycling),/)
        .map((row) => row.props.accessibilityLabel),
    ).toEqual([
      expect.stringMatching(/^Cycling, 45 min,/),
      expect.stringMatching(/^Walking, 30 min,/),
    ])
    expect(snapshot.workouts).toEqual([walking, cycling])
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('does not imply permission denial or zero sleep for unavailable data', () => {
    render(<DailyActivityRows snapshot={null} />)

    expect(screen.getByLabelText('Sleep unavailable')).toBeTruthy()
    expect(screen.getByText('No workouts available for this day')).toBeTruthy()
    expect(screen.queryByText('0.0 hrs')).toBeNull()
    expect(screen.queryByText(/denied/i)).toBeNull()
  })

  it('shows genuine zero values without suppressing them', () => {
    render(
      <DailyActivityRows
        snapshot={makeSnapshot({
          sleepHours: 0,
          workouts: [{ ...walking, durationMinutes: 0, calories: 0 }],
        })}
      />,
    )

    expect(screen.getByLabelText('Sleep 0.0 hrs')).toBeTruthy()
    expect(screen.getByText('0 min')).toBeTruthy()
    expect(screen.getByText('0 kcal')).toBeTruthy()
  })

  it('keeps every workout reachable instead of imposing a preview limit', () => {
    const workouts = Array.from({ length: 5 }, (_, index) => ({
      ...walking,
      activityName: `Workout ${index + 1}`,
    }))
    render(<DailyActivityRows snapshot={makeSnapshot({ workouts })} />)

    expect(screen.getAllByLabelText(/^Workout \d,/)).toHaveLength(5)
  })
})
