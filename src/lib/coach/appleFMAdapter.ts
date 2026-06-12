import { Platform } from 'react-native'

import {
  coachInsightSchema,
  parsedMealSchema,
  type CoachInsight,
  type ParsedMeal,
  type WorkoutNarration,
  workoutNarrationSchema,
} from '@/lib/validators'
import { buildCoachChatPrompt } from './prompts/chat'
import { buildDailyInsightPrompt } from './prompts/dailyInsight'
import { buildPostWorkoutPrompt } from './prompts/postWorkout'
import type {
  CoachAvailability,
  CoachChatContext,
  CoachChatMessage,
  CoachEngine,
  DailyCoachContext,
  WorkoutCoachContext,
} from './types'
import type {
  FoundationModelsAvailability,
  StructureSchema,
} from 'react-native-apple-llm'

type AppleLLMModule = typeof import('react-native-apple-llm')
type AppleLLMSession = InstanceType<AppleLLMModule['AppleLLMSession']>
type SchemaParser<T> = { parse(value: unknown): T }

const GENERATE_TIMEOUT_MS = 30_000

let nativePromise: Promise<AppleLLMModule | null> | null = null
let nativeSessionQueue: Promise<void> = Promise.resolve()

async function getNative(): Promise<AppleLLMModule | null> {
  if (Platform.OS !== 'ios') {
    return null
  }

  nativePromise ??= importNative()

  try {
    return await nativePromise
  } catch (error) {
    nativePromise = null
    throw error
  }
}

async function importNative(): Promise<AppleLLMModule> {
  if (isJestRuntime()) {
    // Jest's CommonJS runtime cannot execute native dynamic import without
    // vm-modules. Keep production lazy-import behavior and use the Jest mock.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-apple-llm') as AppleLLMModule
  }

  return import('react-native-apple-llm')
}

function isJestRuntime(): boolean {
  const maybeProcess = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> }
  }

  return maybeProcess.process?.env?.JEST_WORKER_ID !== undefined
}

export const appleFMCoachEngine: CoachEngine = {
  id: 'apple-fm',

  async availability(): Promise<CoachAvailability> {
    try {
      const native = await getNative()

      if (!native) {
        return 'platform-unsupported'
      }

      return mapFoundationModelsAvailability(
        await native.isFoundationModelsEnabled(),
      )
    } catch {
      return 'os-too-old'
    }
  },

  async generateDailyInsight(ctx: DailyCoachContext): Promise<CoachInsight> {
    const { system, prompt } = buildDailyInsightPrompt(ctx)

    return generateValidatedJson({
      system,
      prompt,
      retryInstruction:
        'Return ONLY valid JSON matching {"headline":"string <=80 chars","body":"string","suggestion":"string","tone":"celebrate|steady|caution"}.',
      schema: coachInsightSchema,
      structure: coachInsightStructure,
      label: 'daily insight',
    })
  },

  async narrateWorkout(ctx: WorkoutCoachContext): Promise<WorkoutNarration> {
    const { system, prompt } = buildPostWorkoutPrompt(ctx)

    return generateValidatedJson({
      system,
      prompt,
      retryInstruction:
        'Return ONLY valid JSON matching {"headline":"string","summary":"string","nextSessionTip":"string","tone":"celebrate|steady|caution"}.',
      schema: workoutNarrationSchema,
      structure: workoutNarrationStructure,
      label: 'workout narration',
    })
  },

  async *chat(
    messages: CoachChatMessage[],
    ctx: CoachChatContext,
  ): AsyncIterable<string> {
    const native = await getRequiredNative()
    const release = await acquireNativeSessionLock()
    let session: AppleLLMSession | null = null
    let iterator: AsyncIterator<string> | null = null
    let previous = ''
    let streamDone = false
    let streamFailed = false

    try {
      session = new native.AppleLLMSession()
      await session.configure({ instructions: buildCoachChatPrompt().system })

      const stream = session.generateTextStream({
        prompt: buildChatPrompt(messages, ctx),
      })
      iterator = getTextStreamIterator(stream)

      while (true) {
        const result = await withTimeout(
          Promise.resolve(iterator.next()),
          GENERATE_TIMEOUT_MS,
          'Apple Foundation Models chat chunk',
        )

        if (result.done) {
          streamDone = true
          return
        }

        const cumulativeChunk = result.value
        const delta = toDelta(previous, cumulativeChunk)
        previous = cumulativeChunk

        if (delta.length > 0) {
          yield delta
        }
      }
    } catch (error) {
      streamFailed = true
      throw error
    } finally {
      if (session && iterator && !streamDone && !streamFailed) {
        // Native AppleLLM exposes a singleton chunk event but no cancel API.
        // Keep the global session lock until abandoned native chunks drain so
        // they cannot interleave with the next chat stream listener.
        void drainAbandonedStream(iterator, session, release)
      } else {
        session?.dispose()
        release()
      }
    }
  },

  async parseMealText(text: string): Promise<ParsedMeal> {
    return generateValidatedJson({
      system:
        'You estimate nutrition from a short meal description. Return JSON only with shape {"name":"string","calories_kcal":"number","protein_g":"number","carb_g":"number","fat_g":"number","ai_confidence":"number 0..1"}. Use conservative estimates and never add commentary.',
      prompt: `Meal description:\n${text}`,
      retryInstruction:
        'Return ONLY valid JSON matching {"name":"string","calories_kcal":"number","protein_g":"number","carb_g":"number","fat_g":"number","ai_confidence":"number 0..1"}.',
      schema: parsedMealSchema,
      structure: parsedMealStructure,
      label: 'parsed meal',
    })
  },
}

function mapFoundationModelsAvailability(
  status: FoundationModelsAvailability,
): CoachAvailability {
  switch (status) {
    case 'available':
      return 'available'
    case 'appleIntelligenceNotEnabled':
      return 'ai-disabled'
    case 'unavailable':
      return 'device-unsupported'
    case 'modelNotReady':
      return 'model-not-ready'
  }
}

async function generateValidatedJson<T>({
  system,
  prompt,
  retryInstruction,
  schema,
  structure,
  label,
}: {
  system: string
  prompt: string
  retryInstruction: string
  schema: SchemaParser<T>
  structure: StructureSchema
  label: string
}): Promise<T> {
  const native = await getRequiredNative()
  const release = await acquireNativeSessionLock()
  let session: AppleLLMSession | null = null

  try {
    session = new native.AppleLLMSession()
    await session.configure({ instructions: system })

    const first = await requestJson(session, prompt, structure, label)
    const firstParse = parseAndValidate(first, schema)

    if (firstParse.ok) {
      return firstParse.value
    }

    const retry = await requestJson(
      session,
      `${prompt}\n\n${retryInstruction}`,
      structure,
      label,
    )
    const retryParse = parseAndValidate(retry, schema)

    if (retryParse.ok) {
      return retryParse.value
    }

    throw new Error(
      `Apple Foundation Models returned invalid ${label} JSON after retry: ${retryParse.error}`,
    )
  } finally {
    session?.dispose()
    release()
  }
}

async function acquireNativeSessionLock(): Promise<() => void> {
  const previous = nativeSessionQueue
  let releaseCurrent!: () => void
  nativeSessionQueue = new Promise<void>((resolve) => {
    releaseCurrent = resolve
  })

  await previous
  return releaseCurrent
}

async function getRequiredNative(): Promise<AppleLLMModule> {
  const native = await getNative()

  if (!native) {
    throw new Error('Apple Foundation Models are only available on iOS')
  }

  return native
}

async function requestJson(
  session: AppleLLMSession,
  prompt: string,
  structure: StructureSchema,
  label: string,
): Promise<unknown> {
  if (typeof session.generateStructuredOutput === 'function') {
    return withTimeout(
      session.generateStructuredOutput({ structure, prompt }),
      GENERATE_TIMEOUT_MS,
      `Apple Foundation Models ${label} structured output`,
    )
  }

  return withTimeout(
    session.generateText({ prompt }),
    GENERATE_TIMEOUT_MS,
    `Apple Foundation Models ${label} text output`,
  )
}

function parseAndValidate<T>(
  raw: unknown,
  schema: SchemaParser<T>,
): { ok: true; value: T } | { ok: false; error: string } {
  try {
    const value =
      typeof raw === 'string' ? JSON.parse(stripJsonFences(raw)) : raw
    return { ok: true, value: schema.parse(value) }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function stripJsonFences(raw: string): string {
  const withoutFences = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/u, '')
    .trim()
  const objectStart = withoutFences.indexOf('{')
  const objectEnd = withoutFences.lastIndexOf('}')

  if (objectStart >= 0 && objectEnd > objectStart) {
    return withoutFences.slice(objectStart, objectEnd + 1)
  }

  return withoutFences
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs / 1000}s`))
    }, timeoutMs)
  })

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  })
}

function getTextStreamIterator(
  stream: ReadableStream<string> | AsyncIterable<string>,
): AsyncIterator<string> {
  const iterable = stream as AsyncIterable<string>

  if (typeof iterable[Symbol.asyncIterator] !== 'function') {
    throw new Error('Apple Foundation Models chat stream is not async iterable')
  }

  return iterable[Symbol.asyncIterator]()
}

async function drainAbandonedStream(
  iterator: AsyncIterator<string>,
  session: AppleLLMSession,
  release: () => void,
): Promise<void> {
  try {
    while (true) {
      const result = await withTimeout(
        Promise.resolve(iterator.next()),
        GENERATE_TIMEOUT_MS,
        'Apple Foundation Models abandoned chat chunk',
      )

      if (result.done) {
        return
      }
    }
  } catch (error) {
    console.warn('Apple Foundation Models abandoned chat drain stopped', error)
  } finally {
    session.dispose()
    release()
  }
}

function toDelta(previous: string, next: string): string {
  return next.startsWith(previous) ? next.slice(previous.length) : next
}

function buildChatPrompt(
  messages: CoachChatMessage[],
  ctx: CoachChatContext,
): string {
  const metrics = [
    `Date: ${ctx.dateISO}`,
    ctx.recovery
      ? `Recovery: ${ctx.recovery.score}/100 (${ctx.recovery.label})`
      : null,
    ctx.snapshot?.sleepHours !== null && ctx.snapshot?.sleepHours !== undefined
      ? `Sleep: ${ctx.snapshot.sleepHours}h`
      : null,
    ctx.snapshot?.steps !== null && ctx.snapshot?.steps !== undefined
      ? `Steps: ${ctx.snapshot.steps}`
      : null,
  ].filter((line): line is string => line !== null)
  const transcript = messages
    .map((message) => {
      const speaker = message.role === 'assistant' ? 'Coach' : 'User'
      return `${speaker}: ${message.content}`
    })
    .join('\n')

  // Future optimization: keep one native session per conversation instead of
  // flattening prior turns into a transcript for each request.
  return `Metrics:\n${metrics.join('\n')}\n\nConversation:\n${transcript}\n\nCoach:`
}

const coachInsightStructure: StructureSchema = {
  headline: { type: 'string', description: 'Short headline, 80 chars max' },
  body: { type: 'string', description: 'Concise insight body' },
  suggestion: { type: 'string', description: 'Next best training suggestion' },
  tone: { type: 'string', enum: ['celebrate', 'steady', 'caution'] },
}

const workoutNarrationStructure: StructureSchema = {
  headline: { type: 'string', description: 'Short post-workout headline' },
  summary: { type: 'string', description: 'Concise workout summary' },
  nextSessionTip: { type: 'string', description: 'Tip for the next session' },
  tone: { type: 'string', enum: ['celebrate', 'steady', 'caution'] },
}

const parsedMealStructure: StructureSchema = {
  name: { type: 'string', description: 'Meal name from user text' },
  calories_kcal: { type: 'number', description: 'Estimated calories' },
  protein_g: { type: 'number', description: 'Estimated protein grams' },
  carb_g: { type: 'number', description: 'Estimated carbohydrate grams' },
  fat_g: { type: 'number', description: 'Estimated fat grams' },
  ai_confidence: { type: 'number', description: 'Confidence from 0 to 1' },
}
