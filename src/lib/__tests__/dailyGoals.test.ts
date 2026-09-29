import { makeSnapshot } from '@/components/dashboard/__fixtures__/healthSnapshot'
import { longestWorkout, summarizeMorningWeights } from '@/lib/dailyGoals'
import type {
  HealthBodyMassSample,
  HealthWorkout,
} from '@/lib/healthSnapshot/types'

const date = new Date(2026, 8, 12, 12)
const weight = (
  day: number,
  kilograms: number,
  hour = 7,
): HealthBodyMassSample => ({
  kilograms,
  startISO: new Date(2026, 8, day, hour).toISOString(),
})

const workout = (
  kind: HealthWorkout['kind'],
  durationMinutes: number,
  day = 12,
): HealthWorkout => ({
  kind,
  activityName: kind,
  averageHeartRate: null,
  durationMinutes,
  calories: null,
  distance: null,
  startISO: new Date(2026, 8, day, 8).toISOString(),
  endISO: new Date(2026, 8, day, 9).toISOString(),
})

describe('daily goal readings', () => {
  it('selects a single longest run, never adding different sessions or workout types', () => {
    const first = workout('running', 20)
    const snapshot = makeSnapshot({
      workouts: [
        first,
        workout('running', 15),
        workout('stairClimber', 45),
        workout('running', 60, 11),
        workout('strength', 80),
      ],
    })
    expect(longestWorkout(snapshot, 'running')).toBe(first)
    expect(longestWorkout(snapshot, 'stairClimber')?.durationMinutes).toBe(45)
    expect(longestWorkout(snapshot, 'strength')?.durationMinutes).toBe(80)
  })

  it('preserves a zero workout without inventing one when data is absent', () => {
    expect(longestWorkout(null, 'running')).toBeNull()
    expect(longestWorkout(makeSnapshot(), 'running')).toBeNull()
    expect(
      longestWorkout(
        makeSnapshot({ workouts: [workout('running', 0)] }),
        'running',
      )?.durationMinutes,
    ).toBe(0)
  })

  it('excludes malformed and invalid-duration workouts from progress', () => {
    expect(
      longestWorkout(
        makeSnapshot({
          workouts: [
            workout('running', NaN),
            workout('running', -1),
            { ...workout('running', 50), startISO: 'invalid' },
          ],
        }),
        'running',
      ),
    ).toBeNull()
  })
})

describe('morning weight trend', () => {
  it('uses the earliest reading before noon, not the latest or an afternoon reading', () => {
    const first = weight(12, 80, 6)
    const result = summarizeMorningWeights(
      [weight(12, 81, 8), weight(12, 82, 12), first, weight(11, 79, 18)],
      date,
    )
    expect(result).toEqual({
      morning: first,
      currentAverageKg: 80,
      previousAverageKg: null,
      currentDays: 1,
      previousDays: 0,
    })
  })

  it('compares seven local calendar days with the preceding seven, excluding missing days', () => {
    const result = summarizeMorningWeights(
      [
        weight(12, 80),
        weight(11, 78),
        weight(6, 79),
        weight(5, 82),
        weight(-1, 84),
        weight(-2, 500),
        weight(13, 500),
      ],
      date,
    )
    expect(result.currentAverageKg).toBe(79)
    expect(result.currentDays).toBe(3)
    expect(result.previousAverageKg).toBe(83)
    expect(result.previousDays).toBe(2)
  })

  it.each([null, []])(
    'keeps unavailable history %j distinct from zero',
    (samples) => {
      expect(summarizeMorningWeights(samples, date)).toEqual({
        morning: null,
        currentAverageKg: null,
        previousAverageKg: null,
        currentDays: 0,
        previousDays: 0,
      })
    },
  )

  it('does not substitute an older or afternoon weigh-in for the selected morning', () => {
    const result = summarizeMorningWeights(
      [weight(11, 80), weight(12, 81, 15)],
      date,
    )
    expect(result.morning).toBeNull()
    expect(result.currentAverageKg).toBe(80)
    expect(result.currentDays).toBe(1)
  })

  it('preserves observed zero and counts a morning only once', () => {
    const result = summarizeMorningWeights(
      [weight(12, 0), weight(12, 0), weight(12, 12, 8)],
      date,
    )
    expect(result.morning?.kilograms).toBe(0)
    expect(result.currentAverageKg).toBe(0)
    expect(result.currentDays).toBe(1)
  })

  it('uses local dates and noon boundaries across a daylight-saving transition', () => {
    const selected = new Date(2026, 2, 8, 12)
    const samples = [
      { kilograms: 80, startISO: new Date(2026, 2, 8, 0, 30).toISOString() },
      { kilograms: 82, startISO: new Date(2026, 2, 2, 11, 59).toISOString() },
      { kilograms: 84, startISO: new Date(2026, 2, 1, 7).toISOString() },
      { kilograms: 99, startISO: new Date(2026, 2, 8, 12).toISOString() },
    ]
    const result = summarizeMorningWeights(samples, selected)
    expect(result.morning?.kilograms).toBe(80)
    expect(result.currentAverageKg).toBe(81)
    expect(result.previousAverageKg).toBe(84)
  })
})
