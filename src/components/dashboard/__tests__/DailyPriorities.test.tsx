import { render, screen } from '@testing-library/react-native'

import { DailyPriorities } from '@/components/dashboard/DailyPriorities'
import { WeightCard } from '@/components/dashboard/WeightCard'
import { makeSnapshot } from '@/components/dashboard/__fixtures__/healthSnapshot'
import type { HealthWorkout } from '@/lib/healthSnapshot/types'

jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } =
    jest.requireActual<typeof import('@/constants/Colors')>(
      '@/constants/Colors',
    )
  return { useTheme: () => Colors.light }
})

const workout = (
  kind: HealthWorkout['kind'],
  durationMinutes: number,
): HealthWorkout => ({
  kind,
  activityName: kind,
  durationMinutes,
  averageHeartRate: null,
  calories: null,
  distance: null,
  startISO: new Date(2026, 8, 12, 8).toISOString(),
  endISO: new Date(2026, 8, 12, 9).toISOString(),
})

describe('DailyPriorities', () => {
  it.each([29 + 59 / 60, 30, 45])(
    'requires 30 actual running minutes for completion, duration %s',
    (minutes) => {
      render(
        <DailyPriorities
          snapshot={makeSnapshot({ workouts: [workout('running', minutes)] })}
        />,
      )
      expect(screen.queryByText('Goal met') !== null).toBe(minutes >= 30)
      expect(
        screen.getByText(`Run: ${Math.floor(minutes)} min synced`),
      ).toBeTruthy()
    },
  )

  it('syncs stairs but never infers Zone 2 time from duration or average heart rate', () => {
    render(
      <DailyPriorities
        snapshot={makeSnapshot({
          workouts: [{ ...workout('stairClimber', 45), averageHeartRate: 150 }],
        })}
      />,
    )
    expect(
      screen.getByText('StairMaster: 45 min synced / 150 bpm avg'),
    ).toBeTruthy()
    expect(screen.getByText(/Zone 2\+ time unavailable/)).toBeTruthy()
    expect(screen.queryByText('Goal met')).toBeNull()
  })

  it('does not merge a short run with stairs or confuse strength with cardio', () => {
    render(
      <DailyPriorities
        snapshot={makeSnapshot({
          workouts: [
            workout('running', 15),
            workout('stairClimber', 15),
            workout('strength', 60),
          ],
        })}
      />,
    )
    expect(screen.queryByText('Goal met')).toBeNull()
    expect(screen.getByText('60 min lifting synced')).toBeTruthy()
    expect(screen.getByText(/Program not configured/)).toBeTruthy()
    expect(screen.queryByText(/Week \d|Push day|Pull day|Legs day/)).toBeNull()
  })

  it.each([null, 0, 1.5])(
    'shows water reading %s without claiming adequate hydration',
    (waterLiters) => {
      render(<DailyPriorities snapshot={makeSnapshot({ waterLiters })} />)
      expect(
        screen.getByLabelText(
          waterLiters === null
            ? 'Water unavailable'
            : `Water ${waterLiters.toFixed(1)} liters recorded`,
        ),
      ).toBeTruthy()
      expect(screen.queryByText('Goal met')).toBeNull()
      expect(screen.queryByText(/hydrated|water goal met/i)).toBeNull()
    },
  )

  it('shows unknown states instead of invented zero readings', () => {
    render(<DailyPriorities snapshot={null} />)
    expect(screen.getByLabelText('Water unavailable')).toBeTruthy()
    expect(
      screen.getByText('No running or Stair Stepper workout available.'),
    ).toBeTruthy()
    expect(screen.getByText('No strength workout available')).toBeTruthy()
    expect(screen.queryByText(/0 min synced|0\.0 L/)).toBeNull()
  })
})

describe('WeightCard', () => {
  it('shows a morning reading and partial-week coverage without adjustment advice', () => {
    render(
      <WeightCard snapshot={makeSnapshot()} date={new Date(2026, 8, 12, 12)} />,
    )
    expect(screen.getByLabelText('Morning weight 78.4 kilograms')).toBeTruthy()
    expect(screen.getByText('7-day average: 78.4 kg')).toBeTruthy()
    expect(screen.getByText('First reading at 7:00 AM')).toBeTruthy()
    expect(screen.getByText('1/7 mornings / previous 0/7')).toBeTruthy()
    expect(screen.getByText('Weekly change unavailable')).toBeTruthy()
    expect(screen.queryByText(/eat less|eat more|deficit|surplus/i)).toBeNull()
  })

  it('never replaces a missing morning reading with the latest known body mass', () => {
    render(
      <WeightCard
        snapshot={makeSnapshot({ bodyMassKg: 78.4, bodyMassHistory: null })}
        date={new Date(2026, 8, 12, 12)}
      />,
    )
    expect(screen.getByLabelText('Morning weight unavailable')).toBeTruthy()
    expect(screen.queryByText(/78\.4/)).toBeNull()
    expect(screen.getByText('7-day average: -- kg')).toBeTruthy()
  })

  it('compares observed morning averages rather than two single latest readings', () => {
    render(
      <WeightCard
        date={new Date(2026, 8, 12, 12)}
        snapshot={makeSnapshot({
          bodyMassHistory: [
            { kilograms: 78, startISO: new Date(2026, 8, 12, 7).toISOString() },
            { kilograms: 79, startISO: new Date(2026, 8, 11, 7).toISOString() },
            { kilograms: 80, startISO: new Date(2026, 8, 5, 7).toISOString() },
          ],
        })}
      />,
    )
    expect(screen.getByText('7-day average: 78.5 kg')).toBeTruthy()
    expect(screen.getByText('-1.5 kg vs previous 7 days')).toBeTruthy()
    expect(screen.getByText('2/7 mornings / previous 1/7')).toBeTruthy()
  })
})
