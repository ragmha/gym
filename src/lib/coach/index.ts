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
    const engine =
      engineId === 'apple-fm' ? appleFMCoachEngine : mockCoachEngine

    if (isTerminalAvailability(appleAvailability)) {
      resolvedEngine = engine
      return resolvedEngine
    }

    // model-not-ready and ai-disabled can change after asset download or user
    // Settings changes, so fall back only for this call and re-probe next time.
    resolvedEngine = null
    resolveEnginePromise = null
    return engine
  })()

  return resolveEnginePromise
}

function isTerminalAvailability(availability: CoachAvailability): boolean {
  return (
    availability === 'available' ||
    availability === 'device-unsupported' ||
    availability === 'platform-unsupported' ||
    availability === 'os-too-old'
  )
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

  async *chat(messages, ctx) {
    yield* (await resolveActiveEngine()).chat(messages, ctx)
  },
}

export { resolveCoachAvailability, selectEngineId } from './availability'
export {
  buildDailyContext,
  formatDailyContextForPrompt,
  type BuildDailyContextInput,
} from './context/buildDailyContext'
export { buildCoachChatPrompt } from './prompts/chat'
export { buildDailyInsightPrompt } from './prompts/dailyInsight'
export { appleFMCoachEngine } from './appleFMAdapter'
export { mockCoachEngine } from './mockAdapter'
export type {
  CoachAvailability,
  CoachChatContext,
  CoachChatMessage,
  CoachEngine,
  DailyCoachContext,
} from './types'
