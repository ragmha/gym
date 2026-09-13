import { coachInsightSchema } from '@/lib/validators'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import type { RecoveryResult } from '@/utils/recovery'
import { resolveCoachAvailability, selectEngineId } from '../availability'
import {
  buildDailyContext,
  formatDailyContextForPrompt,
} from '../context/buildDailyContext'
import { mockCoachEngine } from '../mockAdapter'
import { buildCoachChatPrompt } from '../prompts/chat'
import { buildDailyInsightPrompt } from '../prompts/dailyInsight'

const snapshot: DailyHealthSnapshot = {
  date: '2026-06-12',
  steps: 8200,
  calories: 2300,
  sleepHours: 7.5,
  heartRate: null,
  hrv: 58,
  restingHeartRate: 62,
  waterLiters: null,
  flightsClimbed: 8,
  bodyMassKg: 81.4,
  dietaryCalories: null,
  workouts: [
    {
      activityName: 'Traditional Strength Training',
      calories: 320,
      distance: 0,
      durationMinutes: 48,
      startISO: '2026-06-12T08:00:00.000Z',
      endISO: '2026-06-12T08:48:00.000Z',
    },
  ],
}

const recovery: RecoveryResult = {
  score: 72,
  label: 'Primed to Perform',
  description: 'Recovered well.',
}

const missingSnapshot: DailyHealthSnapshot = {
  date: snapshot.date,
  steps: null,
  calories: null,
  sleepHours: null,
  heartRate: null,
  hrv: null,
  restingHeartRate: null,
  waterLiters: null,
  flightsClimbed: null,
  bodyMassKg: null,
  dietaryCalories: null,
  workouts: [],
}

describe('coach context builders', () => {
  it('builds daily context and omits null metrics from the prompt block', () => {
    const ctx = buildDailyContext({ dateISO: '2026-06-12', snapshot, recovery })
    const formatted = formatDailyContextForPrompt(ctx)

    expect(formatted).toContain('- steps: 8200')
    expect(formatted).toContain('- bodyMassKg: 81.4')
    expect(formatted).toContain(
      '- healthWorkouts: Traditional Strength Training 48min',
    )
    expect(formatted).not.toContain('dietaryCalories')
    expect(formatted).toContain('- recoveryScore: 72')
    expect(formatted).not.toContain('heartRate')
    expect(formatted.split(/\s+/).length).toBeLessThanOrEqual(150)
  })

  it('omits all unavailable measurements and recovery instead of sending zeros', () => {
    const ctx = buildDailyContext({
      dateISO: snapshot.date,
      snapshot: missingSnapshot,
      recovery: null,
    })

    expect(ctx.recovery).toBeNull()
    expect(formatDailyContextForPrompt(ctx)).toBe(`- date: ${snapshot.date}`)
  })

  it('retains actual zeros in a partial snapshot without a recovery assessment', () => {
    const ctx = buildDailyContext({
      dateISO: snapshot.date,
      snapshot: { ...missingSnapshot, steps: 0, calories: 0, sleepHours: 0 },
      recovery: null,
    })
    const formatted = formatDailyContextForPrompt(ctx)

    expect(formatted).toContain('- steps: 0')
    expect(formatted).toContain('- calories: 0')
    expect(formatted).toContain('- sleepHours: 0')
    expect(formatted).not.toContain('hrv')
    expect(formatted).not.toContain('restingHeartRate')
    expect(formatted).not.toContain('recoveryScore')
    expect(formatted).not.toContain('recoveryLabel')
  })

  it('preserves the 150-word context budget even with long workout summaries', () => {
    const ctx = buildDailyContext({
      dateISO: snapshot.date,
      snapshot: {
        ...snapshot,
        workouts: Array.from({ length: 5 }, () => ({
          ...snapshot.workouts[0],
          activityName: 'Workout '.repeat(100),
        })),
      },
      recovery: null,
    })

    expect(formatDailyContextForPrompt(ctx).split(/\s+/)).toHaveLength(150)
  })
})

describe('coach prompts', () => {
  it('includes formatted context and JSON instructions for daily insight', () => {
    const ctx = buildDailyContext({ dateISO: '2026-06-12', snapshot, recovery })
    const prompt = buildDailyInsightPrompt(ctx)

    expect(prompt.prompt).toContain('- steps: 8200')
    expect(prompt.system).toContain('Return JSON only')
    expect(prompt.system).toContain('headline')
    expect(prompt.system).toContain('No medical advice')
    expect(prompt.system).toContain('Missing metrics are unknown, not zero')
    expect(prompt.system).toContain('use a steady tone')
    expect(prompt.system).toContain('do not assess training readiness')
  })

  it('uses plain-text chat instructions', () => {
    const prompt = buildCoachChatPrompt()

    expect(prompt.system).toContain('plain text')
    expect(prompt.system).toContain('Never invent numbers')
    expect(prompt.system).toContain('Missing metrics are unknown, not zero')
    expect(prompt.system).toContain('acknowledge unavailable recovery')
  })
})

describe('mockCoachEngine', () => {
  it('is deterministic for the same daily context', async () => {
    const ctx = buildDailyContext({ dateISO: '2026-06-12', snapshot, recovery })

    await expect(mockCoachEngine.generateDailyInsight(ctx)).resolves.toEqual(
      await mockCoachEngine.generateDailyInsight(ctx),
    )
  })

  it('validates generated structured outputs against coach schemas', async () => {
    const dailyCtx = buildDailyContext({
      dateISO: '2026-06-12',
      snapshot,
      recovery,
    })
    expect(
      coachInsightSchema.safeParse(
        await mockCoachEngine.generateDailyInsight(dailyCtx),
      ).success,
    ).toBe(true)
  })

  it('keeps an all-missing snapshot neutral instead of claiming good or poor recovery', async () => {
    const result = await mockCoachEngine.generateDailyInsight(
      buildDailyContext({
        dateISO: snapshot.date,
        snapshot: missingSnapshot,
        recovery: null,
      }),
    )

    expect(result).toMatchObject({
      headline: 'Recovery data unavailable',
      tone: 'steady',
    })
    expect(result.body).toContain('Not enough Health data')
    expect(result.body).not.toContain('/100')
    expect(result.body).not.toContain('Steps are')
    expect(result.body).not.toContain('Sleep was')
    expect(result.suggestion).toContain('cannot be assessed')
  })

  it('can describe measured zero without turning missing recovery into a score', async () => {
    const result = await mockCoachEngine.generateDailyInsight(
      buildDailyContext({
        dateISO: snapshot.date,
        snapshot: { ...missingSnapshot, steps: 0, sleepHours: 0 },
        recovery: null,
      }),
    )

    expect(result.tone).toBe('steady')
    expect(result.body).toContain('Sleep was 0h.')
    expect(result.body).toContain('Steps are at 0.')
    expect(result.body).not.toContain('/100')
  })

  it('streams chat chunks referencing a real metric', async () => {
    const chunks: string[] = []

    for await (const chunk of mockCoachEngine.chat(
      [{ role: 'user', content: 'How should I train?' }],
      { dateISO: '2026-06-12', snapshot, recovery },
    )) {
      chunks.push(chunk)
    }

    expect(chunks.length).toBeGreaterThanOrEqual(3)
    expect(chunks.join('')).toContain('72/100')
  })

  it.each([null, missingSnapshot])(
    'acknowledges unavailable health data in chat without fabricated metrics: %j',
    async (snapshot) => {
      const chunks: string[] = []

      for await (const chunk of mockCoachEngine.chat([], {
        dateISO: '2026-06-12',
        snapshot,
        recovery: null,
      })) {
        chunks.push(chunk)
      }

      expect(chunks.join('')).toContain('Not enough Health data')
      expect(chunks.join('')).not.toContain('/100')
      expect(chunks.join('')).not.toContain('Your sleep is')
      expect(chunks.join('')).not.toContain('Your steps are')
    },
  )

  it('reports available mock availability', async () => {
    await expect(mockCoachEngine.availability()).resolves.toBe('available')
  })
})

describe('coach availability', () => {
  it('keeps the seam available on web because mock can serve', () => {
    expect(resolveCoachAvailability({ platformOS: 'web' })).toBe('available')
    expect(resolveCoachAvailability({ platformOS: 'android' })).toBe(
      'available',
    )
  })

  it('surfaces the Apple FM status on iOS', () => {
    expect(
      resolveCoachAvailability({
        platformOS: 'ios',
        appleFMStatus: 'available',
      }),
    ).toBe('available')
    expect(
      resolveCoachAvailability({
        platformOS: 'ios',
        appleFMStatus: 'model-not-ready',
      }),
    ).toBe('model-not-ready')
    expect(resolveCoachAvailability({ platformOS: 'ios' })).toBe('available')
  })

  it('selects apple-fm only for iOS when available', () => {
    expect(selectEngineId('ios', true)).toBe('apple-fm')
    expect(selectEngineId('ios', false)).toBe('mock')
    expect(selectEngineId('web', true)).toBe('mock')
  })
})
