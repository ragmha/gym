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
})

describe('coach prompts', () => {
  it('includes formatted context and JSON instructions for daily insight', () => {
    const ctx = buildDailyContext({ dateISO: '2026-06-12', snapshot, recovery })
    const prompt = buildDailyInsightPrompt(ctx)

    expect(prompt.prompt).toContain('- steps: 8200')
    expect(prompt.system).toContain('Return JSON only')
    expect(prompt.system).toContain('headline')
    expect(prompt.system).toContain('No medical advice')
  })

  it('uses plain-text chat instructions', () => {
    const prompt = buildCoachChatPrompt()

    expect(prompt.system).toContain('plain text')
    expect(prompt.system).toContain('Never invent numbers')
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
