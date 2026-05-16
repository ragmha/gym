import {
  activityToPillar,
  classifyHealthKitActivity,
  PILLAR_META,
} from '../pillars'

describe('classifyHealthKitActivity', () => {
  it('maps known numeric HK enum values to normalised types', () => {
    expect(classifyHealthKitActivity(37)).toBe('running')
    expect(classifyHealthKitActivity(13)).toBe('cycling')
    expect(classifyHealthKitActivity(35)).toBe('rowing')
    expect(classifyHealthKitActivity(46)).toBe('swimming')
    expect(classifyHealthKitActivity(50)).toBe('strength')
    expect(classifyHealthKitActivity(20)).toBe('strength')
    expect(classifyHealthKitActivity(63)).toBe('hiit')
    expect(classifyHealthKitActivity(73)).toBe('mixedCardio')
    expect(classifyHealthKitActivity(82)).toBe('multisport')
    expect(classifyHealthKitActivity(83)).toBe('multisport')
    expect(classifyHealthKitActivity(57)).toBe('recovery')
  })

  it('handles numeric strings (the iOS adapter sometimes returns these)', () => {
    expect(classifyHealthKitActivity('37')).toBe('running')
    expect(classifyHealthKitActivity('82')).toBe('multisport')
  })

  it('handles word strings case-insensitively', () => {
    expect(classifyHealthKitActivity('Running')).toBe('running')
    expect(classifyHealthKitActivity('running')).toBe('running')
    expect(classifyHealthKitActivity('functionalStrengthTraining')).toBe(
      'strength',
    )
    expect(classifyHealthKitActivity('swimBikeRun')).toBe('multisport')
    expect(classifyHealthKitActivity('Yoga')).toBe('recovery')
  })

  it('falls back to "other" for null/undefined/unknown values', () => {
    expect(classifyHealthKitActivity(null)).toBe('other')
    expect(classifyHealthKitActivity(undefined)).toBe('other')
    expect(classifyHealthKitActivity('badminton')).toBe('other')
    expect(classifyHealthKitActivity(9999)).toBe('other')
  })
})

describe('activityToPillar', () => {
  it('routes running/hiking to run', () => {
    expect(activityToPillar('running')).toBe('run')
    expect(activityToPillar('hiking')).toBe('run')
  })

  it('routes strength to strength', () => {
    expect(activityToPillar('strength')).toBe('strength')
  })

  it('routes cardio modalities to conditioning', () => {
    expect(activityToPillar('cycling')).toBe('conditioning')
    expect(activityToPillar('rowing')).toBe('conditioning')
    expect(activityToPillar('swimming')).toBe('conditioning')
    expect(activityToPillar('hiit')).toBe('conditioning')
    expect(activityToPillar('mixedCardio')).toBe('conditioning')
    expect(activityToPillar('jumpRope')).toBe('conditioning')
    expect(activityToPillar('stairClimbing')).toBe('conditioning')
    expect(activityToPillar('elliptical')).toBe('conditioning')
    expect(activityToPillar('crossTraining')).toBe('conditioning')
  })

  it('excludes walking, recovery, multisport, other', () => {
    expect(activityToPillar('walking')).toBeNull()
    expect(activityToPillar('recovery')).toBeNull()
    expect(activityToPillar('multisport')).toBeNull()
    expect(activityToPillar('other')).toBeNull()
  })
})

describe('PILLAR_META', () => {
  it('has metadata for every pillar', () => {
    expect(PILLAR_META.strength.label).toBe('Strength')
    expect(PILLAR_META.run.label).toBe('Run')
    expect(PILLAR_META.conditioning.label).toBe('Conditioning')
    for (const pillar of ['strength', 'run', 'conditioning'] as const) {
      expect(PILLAR_META[pillar].ioniconName).toBeTruthy()
      expect(PILLAR_META[pillar].accent).toMatch(/^#[0-9A-F]{6}$/i)
    }
  })
})
