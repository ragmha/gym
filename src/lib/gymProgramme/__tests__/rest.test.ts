import {
  clampRest,
  DEFAULT_REST_SECONDS,
  MAX_REST_SECONDS,
  MIN_REST_SECONDS,
  restSeconds,
} from '@/lib/gymProgramme/rest'

const rest = (title: string, target: number, done = target) =>
  restSeconds({ title, reps: target }, { reps: done })

describe('restSeconds', () => {
  it('defaults to two minutes for a completed isolation set', () => {
    expect(rest('Dumbbell Biceps Curl', 12)).toBe(DEFAULT_REST_SECONDS)
  })

  it('rests compound lifts longer than isolation lifts', () => {
    expect(rest('Leg Press', 12)).toBe(150)
    expect(rest('Barbell Bentover Row', 12)).toBe(150)
    expect(rest('Pushups', 12)).toBe(150)
  })

  it('does not treat lookalike titles as compound', () => {
    expect(rest('Narrow-Grip EZ Bar Curls', 12)).toBe(120)
    expect(rest('Machine Triceps Pressdown', 12)).toBe(120)
    expect(rest('Seated Calf Press', 12)).toBe(120)
    expect(rest('Straight-Arm Pulldowns', 12)).toBe(120)
  })

  it('adjusts for the rep range and missed targets', () => {
    expect(rest('Cable Crossover', 15)).toBe(90)
    expect(rest('Barbell Squat', 8)).toBe(180)
    expect(rest('Barbell Squat', 8, 6)).toBe(210)
  })

  it('keeps adjustments within bounds', () => {
    expect(clampRest(0)).toBe(MIN_REST_SECONDS)
    expect(clampRest(10_000)).toBe(MAX_REST_SECONDS)
    expect(clampRest(135)).toBe(135)
  })
})
