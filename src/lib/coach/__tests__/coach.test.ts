import { coachInsightSchema, workoutNarrationSchema } from '@/lib/validators'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import type { WorkoutSession, WorkoutTemplate } from '@/types/models'
import type { RecoveryResult } from '@/utils/recovery'
import { resolveCoachAvailability, selectEngineId } from '../availability'
import {
  buildDailyContext,
  formatDailyContextForPrompt,
} from '../context/buildDailyContext'
import {
  buildWorkoutContext,
  formatWorkoutContextForPrompt,
} from '../context/buildWorkoutContext'
import { mockCoachEngine } from '../mockAdapter'
import { buildCoachChatPrompt } from '../prompts/chat'
import { buildDailyInsightPrompt } from '../prompts/dailyInsight'
import { buildPostWorkoutPrompt } from '../prompts/postWorkout'

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
  workouts: [],
}

const recovery: RecoveryResult = {
  score: 72,
  label: 'Primed to Perform',
  description: 'Recovered well.',
}

function template(): WorkoutTemplate {
  return {
    id: 'template-a',
    day: 'Day 1',
    week: 'Week 1',
    title: 'Full Body Strength',
    videoURL: null,
    cardio: { morning: 0, evening: 0 },
    color: '#000000',
    exercises: [
      { id: 'squat', title: 'Back Squat', sets: 2, reps: 5, variation: null },
    ],
  }
}

function session(): WorkoutSession {
  return {
    id: 'session-a',
    templateId: 'template-a',
    startedAt: '2026-06-12T08:00:00.000Z',
    completedAt: '2026-06-12T08:30:00.000Z',
    exerciseProgress: {
      squat: {
        detailId: 'squat',
        selectedSets: [true, true],
        weightPerSet: [100, 110],
      },
    },
    cardio: { morning: 0, evening: 0 },
    cardioCompleted: { morning: false, evening: false },
    status: 'complete',
  }
}

describe('coach context builders', () => {
  it('builds daily context and omits null metrics from the prompt block', () => {
    const ctx = buildDailyContext({
      dateISO: '2026-06-12',
      snapshot,
      recovery,
      recentWorkouts: [{ session: session(), template: template() }],
    })
    const formatted = formatDailyContextForPrompt(ctx)

    expect(ctx.recentWorkouts).toEqual([
      {
        templateTitle: 'Full Body Strength',
        completedAt: '2026-06-12T08:30:00.000Z',
        totalVolumeKg: 1050,
      },
    ])
    expect(formatted).toContain('- steps: 8200')
    expect(formatted).toContain('- recoveryScore: 72')
    expect(formatted).not.toContain('heartRate')
    expect(formatted.split(/\s+/).length).toBeLessThanOrEqual(150)
  })

  it('builds workout context with precomputed metrics for prompts', () => {
    const ctx = buildWorkoutContext({
      session: session(),
      template: template(),
      recovery,
    })
    const formatted = formatWorkoutContextForPrompt(ctx)

    expect(ctx.efficiency.totalVolumeKg).toBe(1050)
    expect(formatted).toContain('- volumeKg: 1050')
    expect(formatted).toContain('- completionRate: 100%')
    expect(formatted).toContain('- recoveryLabel: Primed to Perform')
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

  it('includes formatted context and JSON instructions for post-workout narration', () => {
    const ctx = buildWorkoutContext({
      session: session(),
      template: template(),
      recovery,
    })
    const prompt = buildPostWorkoutPrompt(ctx)

    expect(prompt.prompt).toContain('- workout: Full Body Strength')
    expect(prompt.system).toContain('Return JSON only')
    expect(prompt.system).toContain('nextSessionTip')
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
    const workoutCtx = buildWorkoutContext({
      session: session(),
      template: template(),
      recovery,
    })

    expect(
      coachInsightSchema.safeParse(
        await mockCoachEngine.generateDailyInsight(dailyCtx),
      ).success,
    ).toBe(true)
    expect(
      workoutNarrationSchema.safeParse(
        await mockCoachEngine.narrateWorkout(workoutCtx),
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

  it('parses meal text deterministically and validates the parsed meal shape', async () => {
    const first = await mockCoachEngine.parseMealText('chicken lunch')
    const second = await mockCoachEngine.parseMealText('chicken lunch')

    expect(first).toEqual(second)
    expect(first.name).toBe('chicken lunch')
    expect(first.ai_confidence).toBeGreaterThan(0)
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

  it('selects apple-fm only for iOS when available', () => {
    expect(selectEngineId('ios', true)).toBe('apple-fm')
    expect(selectEngineId('ios', false)).toBe('mock')
    expect(selectEngineId('web', true)).toBe('mock')
  })
})
