import { Platform } from 'react-native'
import {
  AppleLLMSession,
  isFoundationModelsEnabled,
} from 'react-native-apple-llm'

import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import type { WorkoutSession, WorkoutTemplate } from '@/types/models'
import type { RecoveryResult } from '@/utils/recovery'
import { buildDailyContext } from '../context/buildDailyContext'
import { buildWorkoutContext } from '../context/buildWorkoutContext'
import { activeCoachEngine, resetActiveCoachEngineForTests } from '../index'
import { appleFMCoachEngine } from '../appleFMAdapter'

jest.mock('react-native-apple-llm', () => ({
  isFoundationModelsEnabled: jest.fn(),
  AppleLLMSession: jest.fn(),
}))

const mockedIsFoundationModelsEnabled = jest.mocked(isFoundationModelsEnabled)
const mockedAppleLLMSession = AppleLLMSession as unknown as jest.Mock

type MockSession = {
  configure: jest.Mock<Promise<boolean>, [{ instructions?: string }]>
  generateStructuredOutput?: jest.Mock<Promise<unknown>, [unknown]>
  generateText: jest.Mock<Promise<string>, [unknown]>
  generateTextStream: jest.Mock<AsyncIterable<string>, [unknown]>
  dispose: jest.Mock<void, []>
}

const originalPlatform = Platform.OS

const snapshot: DailyHealthSnapshot = {
  date: '2026-06-12',
  steps: 8200,
  calories: 2300,
  sleepHours: 7.5,
  heartRate: null,
  hrv: 58,
  restingHeartRate: 62,
  waterLiters: null,
  flightsClimbed: 8,
  workouts: [],
}

const recovery: RecoveryResult = {
  score: 72,
  label: 'Primed to Perform',
  description: 'Recovered well.',
}

function setPlatform(os: typeof Platform.OS): void {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os })
}

function template(): WorkoutTemplate {
  return {
    id: 'template-a',
    day: 'Day 1',
    week: 'Week 1',
    title: 'Full Body Strength',
    videoURL: null,
    cardio: { morning: 0, evening: 0 },
    color: '#000000',
    exercises: [
      { id: 'squat', title: 'Back Squat', sets: 2, reps: 5, variation: null },
    ],
  }
}

function session(): WorkoutSession {
  return {
    id: 'session-a',
    templateId: 'template-a',
    startedAt: '2026-06-12T08:00:00.000Z',
    completedAt: '2026-06-12T08:30:00.000Z',
    exerciseProgress: {
      squat: {
        detailId: 'squat',
        selectedSets: [true, true],
        weightPerSet: [100, 110],
      },
    },
    cardio: { morning: 0, evening: 0 },
    cardioCompleted: { morning: false, evening: false },
    status: 'complete',
  }
}

function makeSession(): MockSession {
  return {
    configure: jest.fn(async (_options: { instructions?: string }) => true),
    generateStructuredOutput: jest.fn(),
    generateText: jest.fn(),
    generateTextStream: jest.fn(),
    dispose: jest.fn(),
  }
}

async function* cumulativeChunks(chunks: string[]): AsyncIterable<string> {
  for (const chunk of chunks) {
    yield chunk
  }
}

class ControlledTextStream implements AsyncIterableIterator<string> {
  private readonly queued: IteratorResult<string>[] = []
  private readonly waiters: ((result: IteratorResult<string>) => void)[] = []

  next(): Promise<IteratorResult<string>> {
    const queued = this.queued.shift()

    if (queued) {
      return Promise.resolve(queued)
    }

    return new Promise((resolve) => {
      this.waiters.push(resolve)
    })
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<string> {
    return this
  }

  push(value: string): void {
    this.settle({ done: false, value })
  }

  finish(): void {
    this.settle({ done: true, value: undefined })
  }

  private settle(result: IteratorResult<string>): void {
    const waiter = this.waiters.shift()

    if (waiter) {
      waiter(result)
    } else {
      this.queued.push(result)
    }
  }
}

function neverResolvingStream(): AsyncIterable<string> {
  return {
    [Symbol.asyncIterator](): AsyncIterator<string> {
      return {
        next: () => new Promise<IteratorResult<string>>(() => undefined),
      }
    },
  }
}

async function flushMicrotasks(times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve()
  }
}

async function flushUntil(
  predicate: () => boolean,
  attempts = 50,
): Promise<void> {
  for (let i = 0; i < attempts; i += 1) {
    if (predicate()) {
      return
    }

    await Promise.resolve()
  }
}

beforeEach(() => {
  jest.useRealTimers()
  jest.clearAllMocks()
  resetActiveCoachEngineForTests()
  setPlatform('web')
  mockedIsFoundationModelsEnabled.mockResolvedValue('available')
  mockedAppleLLMSession.mockImplementation(makeSession)
})

afterAll(() => {
  setPlatform(originalPlatform)
})

describe('appleFMCoachEngine availability', () => {
  it('short-circuits non-iOS platforms without importing native behavior', async () => {
    setPlatform('web')

    await expect(appleFMCoachEngine.availability()).resolves.toBe(
      'platform-unsupported',
    )
    expect(isFoundationModelsEnabled).not.toHaveBeenCalled()
  })

  it.each([
    ['available', 'available'],
    ['appleIntelligenceNotEnabled', 'ai-disabled'],
    ['unavailable', 'device-unsupported'],
    ['modelNotReady', 'model-not-ready'],
  ] as const)('maps native status %s to %s', async (nativeStatus, expected) => {
    setPlatform('ios')
    mockedIsFoundationModelsEnabled.mockResolvedValue(nativeStatus)

    await expect(appleFMCoachEngine.availability()).resolves.toBe(expected)
  })

  it('maps native availability throws to os-too-old', async () => {
    setPlatform('ios')
    jest
      .mocked(isFoundationModelsEnabled)
      .mockRejectedValue(new Error('native unavailable'))

    await expect(appleFMCoachEngine.availability()).resolves.toBe('os-too-old')
  })
})

describe('appleFMCoachEngine structured output', () => {
  it('validates a structured daily insight through Zod', async () => {
    setPlatform('ios')
    const nativeSession = makeSession()
    nativeSession.generateStructuredOutput?.mockResolvedValue({
      headline: 'Strong base',
      body: 'Recovery supports a steady session.',
      suggestion: 'Warm up and progress carefully.',
      tone: 'steady',
    })
    mockedAppleLLMSession.mockImplementation(() => nativeSession)

    const result = await appleFMCoachEngine.generateDailyInsight(
      buildDailyContext({ dateISO: '2026-06-12', snapshot, recovery }),
    )

    expect(result).toEqual({
      headline: 'Strong base',
      body: 'Recovery supports a steady session.',
      suggestion: 'Warm up and progress carefully.',
      tone: 'steady',
    })
    expect(nativeSession.configure).toHaveBeenCalledWith({
      instructions: expect.stringContaining('Return JSON only'),
    })
    expect(nativeSession.generateStructuredOutput).toHaveBeenCalledWith({
      structure: expect.objectContaining({ headline: expect.any(Object) }),
      prompt: expect.stringContaining('Daily metrics'),
    })
    expect(nativeSession.dispose).toHaveBeenCalledTimes(1)
  })

  it('retries once after malformed JSON and succeeds', async () => {
    setPlatform('ios')
    const nativeSession = makeSession()
    nativeSession.generateStructuredOutput
      ?.mockResolvedValueOnce('```json\n{"headline":\n```')
      .mockResolvedValueOnce({
        headline: 'Volume moved well',
        summary: 'You completed the planned work.',
        nextSessionTip: 'Repeat this structure next time.',
        tone: 'celebrate',
      })
    mockedAppleLLMSession.mockImplementation(() => nativeSession)

    await expect(
      appleFMCoachEngine.narrateWorkout(
        buildWorkoutContext({
          session: session(),
          template: template(),
          recovery,
        }),
      ),
    ).resolves.toEqual({
      headline: 'Volume moved well',
      summary: 'You completed the planned work.',
      nextSessionTip: 'Repeat this structure next time.',
      tone: 'celebrate',
    })
    expect(nativeSession.generateStructuredOutput).toHaveBeenCalledTimes(2)
    expect(nativeSession.generateStructuredOutput).toHaveBeenLastCalledWith({
      structure: expect.objectContaining({
        nextSessionTip: expect.any(Object),
      }),
      prompt: expect.stringContaining('Return ONLY valid JSON matching'),
    })
    expect(nativeSession.dispose).toHaveBeenCalledTimes(1)
  })

  it('throws a descriptive error after a second invalid response', async () => {
    setPlatform('ios')
    const nativeSession = makeSession()
    nativeSession.generateStructuredOutput
      ?.mockResolvedValueOnce('{bad')
      .mockResolvedValueOnce({
        headline: '',
        body: '',
        suggestion: '',
        tone: 'x',
      })
    mockedAppleLLMSession.mockImplementation(() => nativeSession)

    await expect(
      appleFMCoachEngine.generateDailyInsight(
        buildDailyContext({ dateISO: '2026-06-12', snapshot, recovery }),
      ),
    ).rejects.toThrow('invalid daily insight JSON after retry')
    expect(nativeSession.dispose).toHaveBeenCalledTimes(1)
  })

  it('falls back to generateText when structured output is unavailable', async () => {
    setPlatform('ios')
    const nativeSession = makeSession()
    nativeSession.generateStructuredOutput = undefined
    nativeSession.generateText.mockResolvedValue(
      '```json\n{"name":"chicken lunch","calories_kcal":640,"protein_g":42,"carb_g":74,"fat_g":18,"ai_confidence":0.8}\n```',
    )
    mockedAppleLLMSession.mockImplementation(() => nativeSession)

    await expect(
      appleFMCoachEngine.parseMealText('chicken lunch'),
    ).resolves.toEqual(
      expect.objectContaining({ name: 'chicken lunch', ai_confidence: 0.8 }),
    )
    expect(nativeSession.generateText).toHaveBeenCalledTimes(1)
  })
})

describe('appleFMCoachEngine chat', () => {
  it('yields deltas from cumulative native stream chunks', async () => {
    setPlatform('ios')
    const nativeSession = makeSession()
    nativeSession.generateTextStream.mockReturnValue(
      cumulativeChunks(['Hello', 'Hello coach', 'Hello coach!']),
    )
    mockedAppleLLMSession.mockImplementation(() => nativeSession)

    const chunks: string[] = []
    for await (const chunk of appleFMCoachEngine.chat(
      [{ role: 'user', content: 'How should I train?' }],
      { dateISO: '2026-06-12', snapshot, recovery },
    )) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual(['Hello', ' coach', '!'])
    expect(nativeSession.generateTextStream).toHaveBeenCalledWith({
      prompt: expect.stringContaining('User: How should I train?'),
    })
    expect(nativeSession.dispose).toHaveBeenCalledTimes(1)
  })

  it('times out stalled stream chunks and releases the native session lock', async () => {
    jest.useFakeTimers()
    setPlatform('ios')
    const stalledSession = makeSession()
    stalledSession.generateTextStream.mockReturnValue(neverResolvingStream())
    const recoverySession = makeSession()
    recoverySession.generateStructuredOutput?.mockResolvedValue({
      headline: 'Recovered',
      body: 'The next call was not blocked.',
      suggestion: 'Keep moving.',
      tone: 'steady',
    })
    mockedAppleLLMSession
      .mockImplementationOnce(() => stalledSession)
      .mockImplementationOnce(() => recoverySession)

    const iterator = appleFMCoachEngine
      .chat([{ role: 'user', content: 'Will this stall?' }], {
        dateISO: '2026-06-12',
        snapshot,
        recovery,
      })
      [Symbol.asyncIterator]()
    const next = iterator
      .next()
      .then((result) => ({ error: null, result }))
      .catch((error: unknown) => ({
        error,
        result: null,
      }))

    await flushMicrotasks()
    await jest.advanceTimersByTimeAsync(30_000)

    const timedOut = await next
    expect(timedOut.error).toEqual(
      new Error('Apple Foundation Models chat chunk timed out after 30s'),
    )
    expect(stalledSession.dispose).toHaveBeenCalledTimes(1)

    await expect(
      appleFMCoachEngine.generateDailyInsight(
        buildDailyContext({ dateISO: '2026-06-12', snapshot, recovery }),
      ),
    ).resolves.toEqual({
      headline: 'Recovered',
      body: 'The next call was not blocked.',
      suggestion: 'Keep moving.',
      tone: 'steady',
    })
    expect(recoverySession.dispose).toHaveBeenCalledTimes(1)
    jest.useRealTimers()
  })

  it('drains an abandoned stream before allowing the next chat to start', async () => {
    setPlatform('ios')
    const abandonedStream = new ControlledTextStream()
    const cleanStream = new ControlledTextStream()
    const abandonedSession = makeSession()
    const cleanSession = makeSession()
    abandonedSession.generateTextStream.mockReturnValue(abandonedStream)
    cleanSession.generateTextStream.mockReturnValue(cleanStream)
    mockedAppleLLMSession
      .mockImplementationOnce(() => abandonedSession)
      .mockImplementationOnce(() => cleanSession)

    const firstIterator = appleFMCoachEngine
      .chat([{ role: 'user', content: 'First chat' }], {
        dateISO: '2026-06-12',
        snapshot,
        recovery,
      })
      [Symbol.asyncIterator]()

    const firstNext = firstIterator.next()
    await flushMicrotasks()
    abandonedStream.push('Old')
    await expect(firstNext).resolves.toEqual({ done: false, value: 'Old' })

    await firstIterator.return?.()

    const secondIterator = appleFMCoachEngine
      .chat([{ role: 'user', content: 'Second chat' }], {
        dateISO: '2026-06-12',
        snapshot,
        recovery,
      })
      [Symbol.asyncIterator]()
    const secondNext = secondIterator.next()

    await flushMicrotasks()
    expect(AppleLLMSession).toHaveBeenCalledTimes(1)
    expect(abandonedSession.dispose).not.toHaveBeenCalled()

    abandonedStream.push('Old native still finishing')
    abandonedStream.finish()
    await flushUntil(() => mockedAppleLLMSession.mock.calls.length === 2)

    expect(abandonedSession.dispose).toHaveBeenCalledTimes(1)
    expect(AppleLLMSession).toHaveBeenCalledTimes(2)

    cleanStream.push('Clean')
    await expect(secondNext).resolves.toEqual({ done: false, value: 'Clean' })
    const secondDone = secondIterator.next()
    cleanStream.finish()
    await expect(secondDone).resolves.toEqual({ done: true, value: undefined })
    expect(cleanSession.dispose).toHaveBeenCalledTimes(1)
  })
})

describe('activeCoachEngine facade', () => {
  it('uses the mock engine on web by default', async () => {
    setPlatform('web')

    await expect(activeCoachEngine.availability()).resolves.toBe('available')
    expect(activeCoachEngine.id).toBe('mock')
    expect(AppleLLMSession).not.toHaveBeenCalled()
    expect(isFoundationModelsEnabled).not.toHaveBeenCalled()
  })

  it('uses apple-fm on iOS when Foundation Models are available', async () => {
    setPlatform('ios')
    mockedIsFoundationModelsEnabled.mockResolvedValue('available')
    const nativeSession = makeSession()
    nativeSession.generateStructuredOutput?.mockResolvedValue({
      headline: 'Strong base',
      body: 'Recovery supports a steady session.',
      suggestion: 'Warm up and progress carefully.',
      tone: 'steady',
    })
    mockedAppleLLMSession.mockImplementation(() => nativeSession)

    const result = await activeCoachEngine.generateDailyInsight(
      buildDailyContext({ dateISO: '2026-06-12', snapshot, recovery }),
    )

    expect(result.headline).toBe('Strong base')
    expect(activeCoachEngine.id).toBe('apple-fm')
  })

  it('memoizes resolution until resetActiveCoachEngineForTests is called', async () => {
    setPlatform('ios')
    mockedIsFoundationModelsEnabled.mockResolvedValue('available')
    const firstSession = makeSession()
    const secondSession = makeSession()
    firstSession.generateStructuredOutput?.mockResolvedValue({
      headline: 'One',
      body: 'Body',
      suggestion: 'Suggestion',
      tone: 'steady',
    })
    secondSession.generateStructuredOutput?.mockResolvedValue({
      headline: 'Two',
      body: 'Body',
      suggestion: 'Suggestion',
      tone: 'steady',
    })
    mockedAppleLLMSession
      .mockImplementationOnce(() => firstSession)
      .mockImplementationOnce(() => secondSession)

    const ctx = buildDailyContext({ dateISO: '2026-06-12', snapshot, recovery })
    await activeCoachEngine.generateDailyInsight(ctx)
    await activeCoachEngine.generateDailyInsight(ctx)

    expect(isFoundationModelsEnabled).toHaveBeenCalledTimes(1)
    expect(activeCoachEngine.id).toBe('apple-fm')

    resetActiveCoachEngineForTests()
    setPlatform('web')

    await expect(activeCoachEngine.parseMealText('eggs')).resolves.toEqual(
      expect.objectContaining({ name: 'eggs' }),
    )
    expect(activeCoachEngine.id).toBe('mock')
  })

  it('falls back only temporarily while the Apple model is not ready', async () => {
    setPlatform('ios')
    mockedIsFoundationModelsEnabled
      .mockResolvedValueOnce('modelNotReady')
      .mockResolvedValueOnce('available')
    const nativeSession = makeSession()
    nativeSession.generateStructuredOutput?.mockResolvedValue({
      headline: 'Ready now',
      body: 'The model became available after a re-probe.',
      suggestion: 'Use the native engine.',
      tone: 'steady',
    })
    mockedAppleLLMSession.mockImplementation(() => nativeSession)

    await expect(activeCoachEngine.parseMealText('eggs')).resolves.toEqual(
      expect.objectContaining({ name: 'eggs' }),
    )
    expect(activeCoachEngine.id).toBe('mock')

    await expect(
      activeCoachEngine.generateDailyInsight(
        buildDailyContext({ dateISO: '2026-06-12', snapshot, recovery }),
      ),
    ).resolves.toEqual({
      headline: 'Ready now',
      body: 'The model became available after a re-probe.',
      suggestion: 'Use the native engine.',
      tone: 'steady',
    })
    expect(isFoundationModelsEnabled).toHaveBeenCalledTimes(2)
    expect(activeCoachEngine.id).toBe('apple-fm')
  })
})
