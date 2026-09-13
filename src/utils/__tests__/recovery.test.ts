import {
  computeRecoveryScore,
  presentRecoveryScore,
  type RecoveryInput,
  type RecoveryResult,
} from '../recovery'

function resultWithScore(score: number): RecoveryResult {
  return {
    score,
    label: 'ignored by presenter',
    description: 'description',
  }
}

describe('computeRecoveryScore', () => {
  it('uses default baselines when baselines are missing', () => {
    const result = computeRecoveryScore({
      hrv: 50,
      restingHR: 65,
      sleepHours: 8,
    })

    expect(result).toMatchObject({ score: 85, label: 'Primed to Perform' })
    expect(result?.description).toContain('Your HRV is close to your baseline.')
  })

  it('does not manufacture a score from missing measurements', () => {
    expect(
      computeRecoveryScore({
        hrv: null,
        restingHR: null,
        sleepHours: null,
      }),
    ).toBeNull()
  })

  it.each(['hrv', 'restingHR', 'sleepHours'] as const)(
    'cannot assess recovery without %s even when the other measurements exist',
    (missingMetric) => {
      expect(
        computeRecoveryScore({
          hrv: 50,
          restingHR: 65,
          sleepHours: 8,
          [missingMetric]: null,
        }),
      ).toBeNull()
    },
  )

  it.each<Partial<RecoveryInput>>([
    { hrv: -1 },
    { hrv: NaN },
    { hrv: Infinity },
    { restingHR: 0 },
    { restingHR: -1 },
    { restingHR: NaN },
    { restingHR: Infinity },
    { sleepHours: -1 },
    { sleepHours: NaN },
    { sleepHours: Infinity },
    { hrvBaseline: 0 },
    { hrvBaseline: -1 },
    { hrvBaseline: NaN },
    { hrvBaseline: Infinity },
    { rhrBaseline: 0 },
    { rhrBaseline: -1 },
    { rhrBaseline: NaN },
    { rhrBaseline: Infinity },
    { sleepGoalHours: 0 },
    { sleepGoalHours: -1 },
    { sleepGoalHours: NaN },
    { sleepGoalHours: Infinity },
  ])('returns unavailable for invalid inputs: %j', (invalidInput) => {
    expect(
      computeRecoveryScore({
        hrv: 50,
        restingHR: 65,
        sleepHours: 8,
        ...invalidInput,
      }),
    ).toBeNull()
  })

  it.each([
    [{ hrv: 50, restingHR: 65, sleepHours: 8 }, 85],
    [{ hrv: 25, restingHR: 78, sleepHours: 4 }, 44],
    [{ hrv: 40, restingHR: 78, sleepHours: 2 }, 49],
    [{ hrv: 0, restingHR: 65, sleepHours: 0 }, 15],
    [{ hrv: 0, restingHR: 100, sleepHours: 0 }, 0],
    [
      {
        hrv: 30,
        restingHR: 60,
        sleepHours: 6,
        hrvBaseline: 60,
        rhrBaseline: 60,
        sleepGoalHours: 6,
      },
      65,
    ],
  ] as const)(
    'preserves the original formula for complete measurements %j',
    (input, score) => {
      expect(computeRecoveryScore(input)?.score).toBe(score)
    },
  )

  it('caps inputs above baseline at a 100 score', () => {
    const result = computeRecoveryScore({
      hrv: 100,
      restingHR: 1,
      sleepHours: 10,
      hrvBaseline: 50,
      rhrBaseline: 65,
      sleepGoalHours: 8,
    })

    expect(result).toMatchObject({ score: 100, label: 'Primed to Perform' })
  })
})

describe('presentRecoveryScore', () => {
  it('has no tone or training label when recovery is unavailable', () => {
    expect(presentRecoveryScore(null)).toBeNull()
  })

  it.each([
    [0, 'under', 'danger', 'Under-recovered'],
    [33, 'under', 'danger', 'Under-recovered'],
    [33.999, 'under', 'danger', 'Under-recovered'],
    [34, 'adequate', 'warning', 'Adequate Recovery'],
    [50, 'adequate', 'warning', 'Adequate Recovery'],
    [66, 'adequate', 'warning', 'Adequate Recovery'],
    [67, 'primed', 'success', 'Primed to Perform'],
    [80, 'primed', 'success', 'Primed to Perform'],
    [100, 'primed', 'success', 'Primed to Perform'],
  ] as const)(
    'maps score %s to the recovery presentation rule',
    (score, tone, accentColorToken, label) => {
      expect(presentRecoveryScore(resultWithScore(score))).toMatchObject({
        score,
        tone,
        accentColorToken,
        label,
      })
    },
  )
})
