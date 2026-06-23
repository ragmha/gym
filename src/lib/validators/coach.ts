import { z } from 'zod'

export const coachToneSchema = z.enum(['celebrate', 'steady', 'caution'])

export const coachInsightSchema = z.object({
  headline: z.string().min(1).max(80),
  body: z.string().min(1),
  suggestion: z.string().min(1),
  tone: coachToneSchema,
})

export const workoutNarrationSchema = z.object({
  headline: z.string().min(1),
  summary: z.string().min(1),
  nextSessionTip: z.string().min(1),
  tone: coachToneSchema,
})

export type CoachTone = z.infer<typeof coachToneSchema>
export type CoachInsight = z.infer<typeof coachInsightSchema>
export type WorkoutNarration = z.infer<typeof workoutNarrationSchema>
