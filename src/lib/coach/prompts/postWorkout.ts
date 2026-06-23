import { formatWorkoutContextForPrompt } from '../context/buildWorkoutContext'
import type { WorkoutCoachContext } from '../types'

export function buildPostWorkoutPrompt(ctx: WorkoutCoachContext): {
  system: string
  prompt: string
} {
  return {
    system:
      'You are an encouraging, evidence-based gym coach. Be concise. Never invent numbers; respond only from provided metrics. No medical advice; suggest seeing a professional for pain or injury. Return JSON only with shape {"headline":"string","summary":"string","nextSessionTip":"string","tone":"celebrate|steady|caution"}.',
    prompt: `Workout metrics:\n${formatWorkoutContextForPrompt(ctx)}`,
  }
}
