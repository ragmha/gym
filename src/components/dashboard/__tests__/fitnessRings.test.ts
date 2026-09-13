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
      'Workouts',
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

  it('labels all workout types as workouts, not cardio', () => {
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

    expect(ringFor(rings, 'Workouts').value).toBe(60)
  })

  it('renders empty rings rather than throwing when there is no snapshot', () => {
    const rings = buildFitnessRings(null)

    expect(rings).toHaveLength(5)
    expect(rings.every((r) => r.value === null)).toBe(true)
    expect(rings.every((r) => r.goal > 0)).toBe(true)
  })

  it('preserves missing measurements without discarding available ones', () => {
    const rings = buildFitnessRings(
      snapshot({ calories: null, waterLiters: null, steps: null }),
    )

    expect(ringFor(rings, 'Calories').value).toBeNull()
    expect(ringFor(rings, 'Hydration').value).toBeNull()
    expect(ringFor(rings, 'Steps').value).toBeNull()
    expect(ringFor(rings, 'Sleep').value).toBe(7.3)
    expect(ringFor(rings, 'Workouts').value).toBeNull()
  })

  it('preserves measured zeros', () => {
    const rings = buildFitnessRings(
      snapshot({
        calories: 0,
        waterLiters: 0,
        sleepHours: 0,
        steps: 0,
        workouts: [
          {
            activityName: 'Walking',
            calories: 0,
            distance: 0,
            durationMinutes: 0,
            startISO: '2025-03-04T07:00:00.000Z',
            endISO: '2025-03-04T07:00:00.000Z',
          },
        ],
      }),
    )

    expect(rings.every((ring) => ring.value === 0)).toBe(true)
  })

  it('does not sum invalid workout durations into a measured total', () => {
    const rings = buildFitnessRings(
      snapshot({
        workouts: [
          {
            activityName: 'Walking',
            calories: 0,
            distance: 0,
            durationMinutes: NaN,
            startISO: '2025-03-04T07:00:00.000Z',
            endISO: '2025-03-04T07:30:00.000Z',
          },
        ],
      }),
    )

    expect(ringFor(rings, 'Workouts').value).toBeNull()
  })
})
