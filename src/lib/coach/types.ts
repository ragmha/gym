import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import type {
  ParsedMeal,
  CoachInsight,
  WorkoutNarration,
} from '@/lib/validators'
import type { RecoveryResult } from '@/utils/recovery'
import type { WorkoutEfficiency } from '@/lib/workoutEfficiency'

export type CoachAvailability =
  | 'available'
  | 'device-unsupported'
  | 'ai-disabled'
  | 'os-too-old'
  | 'platform-unsupported'

export interface RecentWorkoutSummary {
  templateTitle: string
  completedAt: string
  totalVolumeKg: number
}

export interface DailyCoachContext {
  dateISO: string
  snapshot: DailyHealthSnapshot
  recovery: RecoveryResult | null
  recentWorkouts: RecentWorkoutSummary[]
}

export interface WorkoutCoachContext {
  templateTitle: string
  templateDay: string
  templateWeek: string
  efficiency: WorkoutEfficiency
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
  narrateWorkout(ctx: WorkoutCoachContext): Promise<WorkoutNarration>
  chat(
    messages: CoachChatMessage[],
    ctx: CoachChatContext,
  ): AsyncIterable<string>
  parseMealText(text: string): Promise<ParsedMeal>
}
