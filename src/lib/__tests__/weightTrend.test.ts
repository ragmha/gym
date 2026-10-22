import { morningWeighIns } from '@/lib/dailyGoals'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import {
  bmiGaugePosition,
  bodyMassIndex,
  goalProgress,
  goalStatus,
  recentChanges,
  steppedGoal,
  weighInsEnding,
  weightBars,
} from '@/lib/weightTrend'

const at = (day: number, hour: number, kilograms: number) => ({
  kilograms,
  startISO: new Date(2026, 9, day, hour).toISOString(),
})

const date = new Date(2026, 9, 28, 12)

describe('morningWeighIns', () => {
  it('keeps each day’s earliest valid weigh-in before noon', () => {
    const mornings = morningWeighIns([
      at(27, 8, 81),
      at(27, 6, 80.5),
      at(27, 13, 79),
      at(26, 12, 82),
      {
        kilograms: Number.NaN,
        startISO: new Date(2026, 9, 25, 7).toISOString(),
      },
      { kilograms: 80, startISO: 'not a date' },
      at(24, 7, -1),
    ])
    expect([...mornings.keys()]).toEqual(['2026-10-27'])
    expect(mornings.get('2026-10-27')?.kilograms).toBe(80.5)
  })
})

describe('weightBars', () => {
  it('draws 14 daily bars ending on the selected day with gaps, never zeroes', () => {
    const mornings = morningWeighIns([at(28, 7, 80.4), at(20, 7, 81)])
    const bars = weightBars(mornings, date, '2W')
    expect(bars).toHaveLength(14)
    expect(localDateKey(bars[0].start)).toBe('2026-10-15')
    expect(localDateKey(bars[13].end)).toBe('2026-10-28')
    expect(bars[13].kilograms).toBe(80.4)
    expect(bars[5].kilograms).toBe(81)
    expect(bars.filter((bar) => bar.kilograms === null)).toHaveLength(12)
  })

  it('averages morning weigh-ins into weekly bars for 3M and 6M', () => {
    const mornings = morningWeighIns([
      at(28, 7, 80),
      at(22, 7, 82),
      at(21, 7, 90),
    ])
    const threeMonths = weightBars(mornings, date, '3M')
    expect(threeMonths).toHaveLength(13)
    expect(localDateKey(threeMonths[12].start)).toBe('2026-10-22')
    expect(localDateKey(threeMonths[12].end)).toBe('2026-10-28')
    expect(threeMonths[12].kilograms).toBe(81)
    expect(threeMonths[11].kilograms).toBe(90)
    expect(threeMonths[0].kilograms).toBeNull()
    expect(weightBars(mornings, date, '6M')).toHaveLength(26)
  })
})

describe('weighInsEnding and recentChanges', () => {
  const mornings = morningWeighIns([
    at(29, 7, 79),
    at(28, 7, 80.1),
    at(26, 7, 80.4),
    at(20, 7, 81),
    at(1, 7, 83),
  ])

  it('lists weigh-ins on or before the selected day, oldest first', () => {
    expect(weighInsEnding(mornings, date).map((s) => s.kilograms)).toEqual([
      83, 81, 80.4, 80.1,
    ])
    expect(weighInsEnding(mornings, date, 14).map((s) => s.kilograms)).toEqual([
      81, 80.4, 80.1,
    ])
  })

  it('shows the newest first with changes from the previous weigh-in', () => {
    const changes = recentChanges(weighInsEnding(mornings, date), 3)
    expect(
      changes.map(({ sample, changeKg }) => [sample.kilograms, changeKg]),
    ).toEqual([
      [80.1, -0.3],
      [80.4, -0.6],
      [81, -2],
    ])
    expect(recentChanges([at(1, 7, 83)], 7)).toEqual([
      { sample: at(1, 7, 83), changeKg: null },
    ])
  })
})

describe('goal maths', () => {
  it('reports the distance, arrival and crossing of a goal', () => {
    expect(goalStatus(90, 86.4, 70)).toEqual({
      kind: 'toGoal',
      kilograms: 16.4,
    })
    expect(goalStatus(90, 70.04, 70)).toEqual({ kind: 'atGoal' })
    expect(goalStatus(90, 69.5, 70)).toEqual({ kind: 'reached' })
    expect(goalStatus(60, 70.5, 70)).toEqual({ kind: 'reached' })
    expect(goalStatus(null, 69.5, 70)).toEqual({
      kind: 'toGoal',
      kilograms: 0.5,
    })
    expect(goalStatus(90, null, 70)).toBeNull()
    expect(goalStatus(90, 80, null)).toBeNull()
  })

  it('measures progress from start towards the goal, clamped', () => {
    expect(goalProgress(90, 80, 70)).toBe(0.5)
    expect(goalProgress(90, 95, 70)).toBe(0)
    expect(goalProgress(90, 60, 70)).toBe(1)
    expect(goalProgress(60, 65, 70)).toBe(0.5)
    expect(goalProgress(70, 70, 70)).toBeNull()
    expect(goalProgress(null, 80, 70)).toBeNull()
  })

  it('starts the goal from the current weight and clamps each step', () => {
    expect(steppedGoal(null, 82.4, -1)).toBe(81)
    expect(steppedGoal(null, null, 1)).toBe(71)
    expect(steppedGoal(70, 82.4, -1)).toBe(69)
    expect(steppedGoal(20, null, -1)).toBe(20)
    expect(steppedGoal(300, null, 1)).toBe(300)
  })
})

describe('bodyMassIndex', () => {
  it('divides kilograms by height squared and rejects missing inputs', () => {
    expect(bodyMassIndex(80, 1.78)).toBeCloseTo(25.25, 2)
    expect(bodyMassIndex(null, 1.78)).toBeNull()
    expect(bodyMassIndex(80, null)).toBeNull()
    expect(bodyMassIndex(80, 0)).toBeNull()
    expect(bodyMassIndex(0, 1.78)).toBeNull()
  })

  it('places a BMI on the 15–40 gauge', () => {
    expect(bmiGaugePosition(15)).toBe(0)
    expect(bmiGaugePosition(27.5)).toBe(0.5)
    expect(bmiGaugePosition(50)).toBe(1)
    expect(bmiGaugePosition(10)).toBe(0)
  })
})
