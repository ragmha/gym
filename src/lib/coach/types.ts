import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import type { CoachInsight } from '@/lib/validators'
import type { RecoveryResult } from '@/utils/recovery'

export type CoachAvailability =
  | 'available'
  | 'device-unsupported'
  | 'ai-disabled'
  | 'model-not-ready'
  | 'os-too-old'
  | 'platform-unsupported'

export interface DailyCoachContext {
  dateISO: string
  snapshot: DailyHealthSnapshot
  recovery: RecoveryResult | null
}

export interface CoachChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface CoachChatContext {
  dateISO: string
  snapshot: DailyHealthSnapshot | null
  recovery: RecoveryResult | null
}

export interface CoachEngine {
  readonly id: 'mock' | 'apple-fm'
  availability(): Promise<CoachAvailability>
  generateDailyInsight(ctx: DailyCoachContext): Promise<CoachInsight>
  chat(
    messages: CoachChatMessage[],
    ctx: CoachChatContext,
  ): AsyncIterable<string>
}
