import { formatDailyContextForPrompt } from '../context/buildDailyContext'
import type { DailyCoachContext } from '../types'

export function buildDailyInsightPrompt(ctx: DailyCoachContext): {
  system: string
  prompt: string
} {
  return {
    system:
      'You are an encouraging, evidence-based gym coach. Be concise. Never invent numbers; respond only from provided metrics. No medical advice; suggest seeing a professional for pain or injury. Return JSON only with shape {"headline":"string <=80 chars","body":"string","suggestion":"string","tone":"celebrate|steady|caution"}.',
    prompt: `Daily metrics:\n${formatDailyContextForPrompt(ctx)}`,
  }
}
