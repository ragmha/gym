import {
  countRep,
  defaultJoint,
  emptyRepCount,
  type RepCount,
} from '@/lib/repCount'

const run = (angles: (number | null)[]) =>
  angles.reduce<RepCount>(
    (count, angle) => countRep(count, angle),
    emptyRepCount,
  ).reps

describe('countRep', () => {
  it('counts a full bend and straighten as one rep', () => {
    expect(run([170, 90, 170, 90, 170])).toBe(2)
  })

  it('requires a complete observed cycle even when starting bent', () => {
    expect(run([80, 170, 80, 170])).toBe(1)
  })

  it('ignores partial range and wobble around the thresholds', () => {
    expect(run([170, 130, 170, 120, 160, 140, 170])).toBe(0)
    expect(run([170, 100, 120, 105, 140, 175])).toBe(1)
  })

  it('does not count across tracking gaps or invalid native values', () => {
    for (const missing of [null, NaN, Infinity, -1, 181]) {
      expect(run([170, 90, missing, 170])).toBe(0)
      expect(run([170, 90, 170, missing, 170, 90, 170])).toBe(2)
    }
  })

  it('honours the calibrated bend angle and the lifting-log limit', () => {
    expect(
      [170, 125, 170].reduce(
        (c, angle) => countRep(c, angle, 130),
        emptyRepCount,
      ).reps,
    ).toBe(1)
    expect(countRep({ reps: 500, phase: 'bent' }, 170).reps).toBe(500)
  })
})

it('picks the joint that moves most for the exercise', () => {
  expect(defaultJoint('Barbell Squat')).toBe('knee')
  expect(defaultJoint('Bulgarian Split')).toBe('knee')
  expect(defaultJoint('Dumbbell Stiff-Legged Deadlift')).toBe('hip')
  expect(defaultJoint('Close-Grip Pushups')).toBe('elbow')
  expect(defaultJoint('Seated Leg Press')).toBe('knee')
  expect(defaultJoint('Single-Leg Extension')).toBe('knee')
  expect(defaultJoint('Lying Hamstring Curl')).toBe('knee')
  expect(defaultJoint('Weighted Hyperextensions')).toBe('hip')
})
