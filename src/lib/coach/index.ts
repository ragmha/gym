/**
 * CoachEngine seam — swap the active implementation here.
 *
 * `mockCoachEngine` ships today. The apple-fm adapter can be selected by
 * `selectEngineId` once that native adapter lands behind the same interface.
 */
export { mockCoachEngine as activeCoachEngine } from './mockAdapter'
export { resolveCoachAvailability, selectEngineId } from './availability'
export {
  buildDailyContext,
  formatDailyContextForPrompt,
  type BuildDailyContextInput,
} from './context/buildDailyContext'
export {
  buildWorkoutContext,
  formatWorkoutContextForPrompt,
  type BuildWorkoutContextInput,
} from './context/buildWorkoutContext'
export { buildCoachChatPrompt } from './prompts/chat'
export { buildDailyInsightPrompt } from './prompts/dailyInsight'
export { buildPostWorkoutPrompt } from './prompts/postWorkout'
export { mockCoachEngine } from './mockAdapter'
export type {
  CoachAvailability,
  CoachChatContext,
  CoachChatMessage,
  CoachEngine,
  DailyCoachContext,
  RecentWorkoutSummary,
  WorkoutCoachContext,
} from './types'
