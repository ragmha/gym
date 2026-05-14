import {
  computeRecoveryScore,
  presentRecoveryScore,
  type RecoveryResult,
} from '../recoveryScore'

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

    expect(result.score).toBe(85)
    expect(result.label).toBe('Primed to Perform')
    expect(result.description).toContain('Your HRV is close to your baseline.')
  })

  it('does not crash for zero or negative inputs', () => {
    expect(() =>
      computeRecoveryScore({
        hrv: -10,
        restingHR: 0,
        sleepHours: -2,
        hrvBaseline: 0,
        rhrBaseline: -1,
        sleepGoalHours: 0,
      }),
    ).not.toThrow()
  })

  it('caps inputs above baseline at a 100 score', () => {
    const result = computeRecoveryScore({
      hrv: 100,
      restingHR: 1,
      sleepHours: 10,
      hrvBaseline: 50,
      rhrBaseline: 65,
      sleepGoalHours: 8,
    })

    expect(result.score).toBe(100)
    expect(result.label).toBe('Primed to Perform')
  })
})

describe('presentRecoveryScore', () => {
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
