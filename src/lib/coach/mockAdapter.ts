import { coachInsightSchema, type CoachInsight } from '@/lib/validators'
import type {
  CoachAvailability,
  CoachChatContext,
  CoachChatMessage,
  CoachEngine,
  DailyCoachContext,
} from './types'

const DAILY_HEADLINES = [
  'Strong base for today',
  'Train with a steady hand',
  'Recovery deserves respect',
  'Good momentum building',
] as const

const DAILY_SUGGESTIONS = [
  'Keep the first working set controlled and adjust from there.',
  'Use warm-up sets to confirm the right load before pushing.',
  'Prioritize clean reps and leave a little in reserve today.',
  'Stay consistent with hydration before the next session.',
] as const

export const mockCoachEngine: CoachEngine = {
  id: 'mock',

  async availability(): Promise<CoachAvailability> {
    return 'available'
  },

  async generateDailyInsight(ctx: DailyCoachContext): Promise<CoachInsight> {
    const seed = dailySeed(ctx)
    const tone = toneFromRecovery(ctx.recovery?.score ?? null)
    const headline = ctx.recovery
      ? DAILY_HEADLINES[hash(seed) % DAILY_HEADLINES.length]
      : 'Recovery data unavailable'
    const suggestion = ctx.recovery
      ? DAILY_SUGGESTIONS[hash(`${seed}:s`) % DAILY_SUGGESTIONS.length]
      : 'Use the available Health metrics; recovery readiness cannot be assessed yet.'
    const body = buildDailyBody(ctx)

    return coachInsightSchema.parse({ headline, body, suggestion, tone })
  },

  async *chat(
    messages: CoachChatMessage[],
    ctx: CoachChatContext,
  ): AsyncIterable<string> {
    const metric = pickChatMetric(ctx)
    const lastUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === 'user')?.content
    const prefix = lastUserMessage ? 'Based on your question, ' : ''
    const chunks = [
      `${prefix}I would keep this practical. `,
      metric
        ? `${metric}. `
        : 'Not enough Health data is available to assess recovery. ',
      'Choose a load that keeps reps crisp. ',
      'If pain or injury shows up, pause and speak with a professional.',
    ]

    for (const chunk of chunks) {
      await new Promise((resolve) => setTimeout(resolve, 1))
      yield chunk
    }
  },
}

function dailySeed(ctx: DailyCoachContext): string {
  return [
    ctx.dateISO,
    ctx.snapshot.steps,
    ctx.snapshot.sleepHours,
    ctx.snapshot.hrv,
    ctx.snapshot.restingHeartRate,
    ctx.recovery?.score,
  ].join('|')
}

function buildDailyBody(ctx: DailyCoachContext): string {
  const parts: string[] = []

  if (ctx.recovery) {
    parts.push(`Recovery is ${ctx.recovery.score}/100 (${ctx.recovery.label}).`)
  } else {
    parts.push('Not enough Health data is available to assess recovery.')
  }

  if (ctx.snapshot.sleepHours !== null) {
    parts.push(`Sleep was ${ctx.snapshot.sleepHours}h.`)
  }

  if (ctx.snapshot.steps !== null) {
    parts.push(`Steps are at ${ctx.snapshot.steps}.`)
  }

  return parts.join(' ')
}

function toneFromRecovery(score: number | null): CoachInsight['tone'] {
  if (score !== null && score < 34) {
    return 'caution'
  }

  if (score !== null && score >= 67) {
    return 'celebrate'
  }

  return 'steady'
}

function pickChatMetric(ctx: CoachChatContext): string | null {
  if (ctx.recovery) {
    return `Your recovery score is ${ctx.recovery.score}/100`
  }

  if (
    ctx.snapshot?.sleepHours !== null &&
    ctx.snapshot?.sleepHours !== undefined
  ) {
    return `Your sleep is ${ctx.snapshot.sleepHours}h`
  }

  if (ctx.snapshot?.steps !== null && ctx.snapshot?.steps !== undefined) {
    return `Your steps are ${ctx.snapshot.steps}`
  }

  return null
}

function hash(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}
