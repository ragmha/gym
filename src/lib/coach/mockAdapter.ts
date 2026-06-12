import {
  coachInsightSchema,
  parsedMealSchema,
  type CoachInsight,
  type ParsedMeal,
  type WorkoutNarration,
  workoutNarrationSchema,
} from '@/lib/validators'
import type {
  CoachAvailability,
  CoachChatContext,
  CoachChatMessage,
  CoachEngine,
  DailyCoachContext,
  WorkoutCoachContext,
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

const WORKOUT_HEADLINES = [
  'Session logged with intent',
  'Volume moved well',
  'Solid work under the bar',
  'Progress signal captured',
] as const

const MEAL_CATALOGUE = [
  { name: 'Chicken Rice Bowl', kcal: 640, p: 42, c: 74, f: 18 },
  { name: 'Egg and Avocado Toast', kcal: 430, p: 20, c: 36, f: 24 },
  { name: 'Greek Yogurt Protein Bowl', kcal: 390, p: 32, c: 44, f: 9 },
  { name: 'Salmon Potato Plate', kcal: 700, p: 46, c: 58, f: 30 },
  { name: 'Tofu Noodle Stir Fry', kcal: 560, p: 28, c: 72, f: 17 },
] as const

export const mockCoachEngine: CoachEngine = {
  id: 'mock',

  async availability(): Promise<CoachAvailability> {
    return 'available'
  },

  async generateDailyInsight(ctx: DailyCoachContext): Promise<CoachInsight> {
    const seed = dailySeed(ctx)
    const tone = toneFromRecovery(ctx.recovery?.score ?? null)
    const headline = DAILY_HEADLINES[hash(seed) % DAILY_HEADLINES.length]
    const suggestion =
      DAILY_SUGGESTIONS[hash(`${seed}:s`) % DAILY_SUGGESTIONS.length]
    const body = buildDailyBody(ctx)

    return coachInsightSchema.parse({ headline, body, suggestion, tone })
  },

  async narrateWorkout(ctx: WorkoutCoachContext): Promise<WorkoutNarration> {
    const seed = workoutSeed(ctx)
    const tone = toneFromWorkout(ctx)
    const headline = WORKOUT_HEADLINES[hash(seed) % WORKOUT_HEADLINES.length]
    const volume = Math.round(ctx.efficiency.totalVolumeKg)
    const completion = Math.round(ctx.efficiency.completionRate * 100)
    const summary = `You completed ${completion}% of ${ctx.templateTitle} and moved ${volume}kg.`
    const nextSessionTip =
      ctx.efficiency.volumeVsPriorSessionPct !== null &&
      ctx.efficiency.volumeVsPriorSessionPct > 0
        ? 'Volume is up from the prior session, so protect recovery before adding more load.'
        : 'Repeat the same structure and progress only if reps stay clean.'

    return workoutNarrationSchema.parse({
      headline,
      summary,
      nextSessionTip,
      tone,
    })
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
        : 'Use today’s logged metrics as the source of truth. ',
      'Choose a load that keeps reps crisp. ',
      'If pain or injury shows up, pause and speak with a professional.',
    ]

    for (const chunk of chunks) {
      await new Promise((resolve) => setTimeout(resolve, 1))
      yield chunk
    }
  },

  async parseMealText(text: string): Promise<ParsedMeal> {
    const seed = text.trim() || 'mock-meal'
    const base = MEAL_CATALOGUE[hash(seed) % MEAL_CATALOGUE.length]
    const factor = 1 + ((hash(`${seed}:meal`) % 100) - 50) / 1000

    return parsedMealSchema.parse({
      name: text.trim() || base.name,
      calories_kcal: round1(base.kcal * factor),
      protein_g: round1(base.p * factor),
      carb_g: round1(base.c * factor),
      fat_g: round1(base.f * factor),
      ai_confidence: 0.76,
    })
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
    ctx.recentWorkouts.map((workout) => workout.totalVolumeKg).join(','),
  ].join('|')
}

function workoutSeed(ctx: WorkoutCoachContext): string {
  return [
    ctx.templateTitle,
    ctx.templateDay,
    ctx.templateWeek,
    ctx.efficiency.totalVolumeKg,
    ctx.efficiency.completedSets,
    ctx.efficiency.totalSets,
    ctx.recovery?.score,
  ].join('|')
}

function buildDailyBody(ctx: DailyCoachContext): string {
  const parts: string[] = []

  if (ctx.recovery) {
    parts.push(`Recovery is ${ctx.recovery.score}/100 (${ctx.recovery.label}).`)
  }

  if (ctx.snapshot.sleepHours !== null) {
    parts.push(`Sleep was ${ctx.snapshot.sleepHours}h.`)
  }

  if (ctx.snapshot.steps !== null) {
    parts.push(`Steps are at ${ctx.snapshot.steps}.`)
  }

  if (ctx.recentWorkouts[0]) {
    parts.push(
      `Recent strength volume: ${Math.round(ctx.recentWorkouts[0].totalVolumeKg)}kg.`,
    )
  }

  return parts.length > 0
    ? parts.join(' ')
    : 'No recovery metrics are available, so keep intensity conservative.'
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

function toneFromWorkout(ctx: WorkoutCoachContext): WorkoutNarration['tone'] {
  if (ctx.recovery && ctx.recovery.score < 34) {
    return 'caution'
  }

  if (ctx.efficiency.completionRate === 1) {
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

function round1(value: number): number {
  return Math.round(value * 10) / 10
}
