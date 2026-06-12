import { Platform } from 'react-native'

import { appleFMCoachEngine } from './appleFMAdapter'
import { selectEngineId } from './availability'
import { mockCoachEngine } from './mockAdapter'
import type { CoachAvailability, CoachEngine } from './types'

let resolvedEngine: CoachEngine | null = null
let resolveEnginePromise: Promise<CoachEngine> | null = null

async function resolveActiveEngine(): Promise<CoachEngine> {
  if (resolvedEngine) {
    return resolvedEngine
  }

  resolveEnginePromise ??= (async () => {
    const appleAvailability: CoachAvailability =
      Platform.OS === 'ios'
        ? await appleFMCoachEngine.availability()
        : 'platform-unsupported'
    const engineId = selectEngineId(
      Platform.OS,
      appleAvailability === 'available',
    )

    resolvedEngine =
      engineId === 'apple-fm' ? appleFMCoachEngine : mockCoachEngine
    return resolvedEngine
  })()

  return resolveEnginePromise
}

export function resetActiveCoachEngineForTests(): void {
  resolvedEngine = null
  resolveEnginePromise = null
}

export const activeCoachEngine: CoachEngine = {
  // Before lazy resolution completes, callers see the safe mock id.
  get id() {
    return resolvedEngine?.id ?? 'mock'
  },

  async availability() {
    return (await resolveActiveEngine()).availability()
  },

  async generateDailyInsight(ctx) {
    return (await resolveActiveEngine()).generateDailyInsight(ctx)
  },

  async narrateWorkout(ctx) {
    return (await resolveActiveEngine()).narrateWorkout(ctx)
  },

  async *chat(messages, ctx) {
    yield* (await resolveActiveEngine()).chat(messages, ctx)
  },

  async parseMealText(text) {
    return (await resolveActiveEngine()).parseMealText(text)
  },
}

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
export { appleFMCoachEngine } from './appleFMAdapter'
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
