import {
  SLEEP_GOAL_HOURS,
  buildFitnessRings,
} from '@/components/dashboard/fitnessRings'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'

const snapshot = (
  overrides: Partial<DailyHealthSnapshot> = {},
): DailyHealthSnapshot => ({
  date: '2025-03-04',
  steps: 8_000,
  calories: 450,
  sleepHours: 7.25,
  heartRate: 62,
  hrv: 48,
  restingHeartRate: 55,
  waterLiters: 1.84,
  flightsClimbed: 6,
  bodyMassKg: 78.4,
  dietaryCalories: 2_100,
  workouts: [],
  ...overrides,
})

const ringFor = (
  rings: ReturnType<typeof buildFitnessRings>,
  label: string,
) => {
  const ring = rings.find((r) => r.label === label)
  if (!ring) throw new Error(`no ring labelled ${label}`)
  return ring
}

describe('buildFitnessRings', () => {
  it('maps snapshot metrics onto the five dashboard rings', () => {
    const rings = buildFitnessRings(snapshot())

    expect(rings.map((r) => r.label)).toEqual([
      'Calories',
      'Hydration',
      'Sleep',
      'Steps',
      'Cardio',
    ])
    expect(ringFor(rings, 'Calories').value).toBe(450)
    expect(ringFor(rings, 'Steps').value).toBe(8_000)
    expect(ringFor(rings, 'Sleep').goal).toBe(SLEEP_GOAL_HOURS)
  })

  it('rounds hydration and sleep to one decimal place', () => {
    const rings = buildFitnessRings(
      snapshot({ waterLiters: 1.84, sleepHours: 7.25 }),
    )

    expect(ringFor(rings, 'Hydration').value).toBe(1.8)
    expect(ringFor(rings, 'Sleep').value).toBe(7.3)
  })

  it('sums workout durations into the cardio ring', () => {
    const rings = buildFitnessRings(
      snapshot({
        workouts: [
          {
            activityName: 'Running',
            calories: 300,
            distance: 5,
            durationMinutes: 28.4,
            startISO: '2025-03-04T07:00:00.000Z',
            endISO: '2025-03-04T07:28:00.000Z',
          },
          {
            activityName: 'Strength',
            calories: 180,
            distance: 0,
            durationMinutes: 31.2,
            startISO: '2025-03-04T18:00:00.000Z',
            endISO: '2025-03-04T18:31:00.000Z',
          },
        ],
      }),
    )

    expect(ringFor(rings, 'Cardio').value).toBe(60)
  })

  it('renders empty rings rather than throwing when there is no snapshot', () => {
    const rings = buildFitnessRings(null)

    expect(rings).toHaveLength(5)
    expect(rings.every((r) => r.value === 0)).toBe(true)
    expect(rings.every((r) => r.goal > 0)).toBe(true)
  })

  it('treats missing metrics as zero', () => {
    const rings = buildFitnessRings(
      snapshot({ calories: null, waterLiters: null, steps: null }),
    )

    expect(ringFor(rings, 'Calories').value).toBe(0)
    expect(ringFor(rings, 'Hydration').value).toBe(0)
    expect(ringFor(rings, 'Steps').value).toBe(0)
  })
})
