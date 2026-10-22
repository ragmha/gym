import type { CoachAvailability } from '@/lib/coach/types'
import type { EvaluationReport } from '@/lib/coach/evaluations'

const mockPlatform = { OS: 'ios', Version: '26.0' }
const mockApplication = {
  nativeApplicationVersion: '1.0.19' as string | null,
  nativeBuildVersion: '2' as string | null,
}
const mockAvailability = jest.fn<Promise<CoachAvailability>, []>()
const mockInsight = jest.fn()
const mockMeal = jest.fn()
const mockNativeModule = jest.fn()

jest.mock('react-native', () => ({ Platform: mockPlatform }))
jest.mock('expo-application', () => ({
  __esModule: true,
  get nativeApplicationVersion() {
    return mockApplication.nativeApplicationVersion
  },
  get nativeBuildVersion() {
    return mockApplication.nativeBuildVersion
  },
}))
jest.mock('expo', () => ({
  requireOptionalNativeModule: mockNativeModule,
}))
jest.mock('@/lib/coach/appleFMAdapter', () => ({
  appleFMCoachEngine: {
    id: 'apple-fm',
    availability: mockAvailability,
    generateDailyInsight: mockInsight,
  },
  generateValidatedJson: mockMeal,
}))

const insight = {
  headline: 'A steady day',
  body: 'Use only the available readings.',
  suggestion: 'Review missing measurements.',
  tone: 'steady',
}
const meal = {
  name: 'Vegetable soup',
  kcal: 350,
  proteinGrams: 12,
  carbsGrams: 45,
  fatGrams: 14,
}
const originalDev = __DEV__
let evaluations: typeof import('../evaluations')
let fixtures: typeof import('../evaluationFixtures').AI_EVALUATION_FIXTURES

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

async function flush() {
  for (let i = 0; i < 15; i += 1) await Promise.resolve()
}

beforeEach(() => {
  jest.resetModules()
  jest.useRealTimers()
  Object.defineProperty(globalThis, '__DEV__', {
    value: true,
    configurable: true,
  })
  mockPlatform.OS = 'ios'
  mockApplication.nativeApplicationVersion = '1.0.19'
  mockApplication.nativeBuildVersion = '2'
  mockAvailability.mockReset().mockResolvedValue('available')
  mockInsight.mockReset().mockResolvedValue(insight)
  mockMeal.mockReset().mockResolvedValue(meal)
  mockNativeModule.mockReset()
  // Isolate the process-lifetime overlap/error fence for each plumbing test.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  evaluations = require('../evaluations')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  fixtures = require('../evaluationFixtures').AI_EVALUATION_FIXTURES
})

afterEach(() => {
  jest.useRealTimers()
  Object.defineProperty(globalThis, '__DEV__', {
    value: originalDev,
    configurable: true,
  })
})

describe('synthetic evaluation plumbing (mocked engine, not model-quality evidence)', () => {
  it('keeps fixed tuning and held-out cases separate and preserves null versus zero', async () => {
    expect(fixtures.filter((item) => item.split === 'tuning')).toHaveLength(2)
    expect(fixtures.filter((item) => item.split === 'held-out')).toHaveLength(5)
    expect(new Set(fixtures.map((item) => item.id)).size).toBe(fixtures.length)

    const report = await evaluations.startSyntheticEvaluation('held-out').done
    const missing = report.cases.find(
      (item) => item.id === 'insight-all-missing',
    )!
    const zero = report.cases.find(
      (item) => item.id === 'insight-observed-zero',
    )!
    const long = report.cases.find((item) => item.id === 'insight-long-input')!
    expect(missing.productionPrompt.prompt).not.toContain('steps:')
    expect(zero.productionPrompt.prompt).toContain('- steps: 0')
    expect(zero.productionPrompt.prompt).not.toMatch(/hrv:|recoveryScore:/)
    expect(long.input.kind).toBe('daily-insight')
    if (long.input.kind === 'daily-insight') {
      expect(
        long.input.context.snapshot.workouts[0].activityName.split(/\s+/)
          .length,
      ).toBeGreaterThan(150)
    }
    expect(
      long.productionPrompt.prompt.replace('Daily metrics:\n', '').split(/\s+/),
    ).toHaveLength(150)
    expect(report.cases.every((item) => item.split === 'held-out')).toBe(true)
    expect(mockInsight).toHaveBeenCalledTimes(4)
    expect(mockMeal).toHaveBeenCalledTimes(1)
    expect(mockNativeModule).not.toHaveBeenCalled()
  })

  it('fails closed in production before probing or generating', async () => {
    Object.defineProperty(globalThis, '__DEV__', { value: false })
    const report = await evaluations.startSyntheticEvaluation('tuning').done
    expect(report.status).toBe('blocked')
    expect(report.reason).toContain('outside development')
    expect(mockAvailability).not.toHaveBeenCalled()
    expect(mockInsight).not.toHaveBeenCalled()
    expect(mockMeal).not.toHaveBeenCalled()
  })

  it.each(['web', 'android'])(
    'blocks %s without probing a native engine or substituting a mock',
    async (platform) => {
      mockPlatform.OS = platform
      const report = await evaluations.startSyntheticEvaluation('tuning').done
      expect(report.status).toBe('blocked')
      expect(report.environment.availability).toBe('platform-unsupported')
      expect(report.cases.every((item) => item.objective === 'not-run')).toBe(
        true,
      )
      expect(mockAvailability).not.toHaveBeenCalled()
      expect(mockInsight).not.toHaveBeenCalled()
      expect(mockMeal).not.toHaveBeenCalled()
    },
  )

  it.each<CoachAvailability>([
    'ai-disabled',
    'device-unsupported',
    'model-not-ready',
    'os-too-old',
    'platform-unsupported',
  ])(
    'blocks unavailable status %s without generation',
    async (availability) => {
      mockAvailability.mockResolvedValue(availability)
      const report = await evaluations.startSyntheticEvaluation('tuning').done
      expect(report.status).toBe('blocked')
      expect(report.environment.availability).toBe(availability)
      expect(report.reason).toBe(
        evaluations.evaluationAvailabilityReason(availability),
      )
      expect(mockInsight).not.toHaveBeenCalled()
      expect(mockMeal).not.toHaveBeenCalled()
    },
  )

  it('reports a failed availability check without an invented success', async () => {
    mockAvailability.mockRejectedValue(new Error('native detail'))
    const report = await evaluations.startSyntheticEvaluation('tuning').done
    expect(report).toMatchObject({
      status: 'blocked',
      environment: { availability: 'check-failed' },
      semanticReview: 'required',
    })
    expect(mockInsight).not.toHaveBeenCalled()
    expect(mockMeal).not.toHaveBeenCalled()
    expect(JSON.stringify(report)).not.toContain('native detail')
  })

  it('serializes requests, rejects double starts, and records actual native metadata and production prompts', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-10-21T12:00:00Z'))
    const pending = deferred<typeof insight>()
    mockInsight.mockReturnValueOnce(pending.promise)
    const job = evaluations.startSyntheticEvaluation('tuning')
    await flush()
    expect(mockInsight).toHaveBeenCalledTimes(1)
    expect(mockMeal).not.toHaveBeenCalled()
    const duplicate =
      await evaluations.startSyntheticEvaluation('held-out').done
    expect(duplicate.status).toBe('blocked')
    expect(duplicate.reason).toContain('still running')
    expect(mockAvailability).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(42)
    pending.resolve(insight)
    const report = await job.done
    expect(report).toMatchObject({
      status: 'completed',
      elapsedMs: 42,
      environment: {
        nativeAppVersion: '1.0.19',
        nativeBuildVersion: '2',
        platform: 'ios',
        osVersion: '26.0',
        engine: 'apple-fm',
        availability: 'available',
        modelVersion: null,
      },
      semanticReview: 'required',
    })
    expect(report.cases[0].elapsedMs).toBe(42)
    expect(report.cases[0].productionPrompt.source).toBe(
      'src/lib/coach/prompts/dailyInsight.ts#buildDailyInsightPrompt',
    )
    expect(report.cases[0].productionPrompt.system).toContain(
      'Never invent numbers',
    )
    const request = mockMeal.mock.calls[0][0]
    expect(report.cases[1].productionPrompt).toMatchObject({
      source: 'src/lib/mealPhoto.ts#buildMealEstimateRequest',
      system: request.system,
      prompt: request.prompt,
    })
    expect(request.label).toBe('meal estimate')
    expect(report.cases.every((item) => item.objective === 'pass')).toBe(true)
    expect(
      report.cases.every((item) => item.semanticReview === 'required'),
    ).toBe(true)
    expect(report).not.toHaveProperty('passed')
    expect(report).not.toHaveProperty('sourceCommit')
  })

  it('does not replace missing native app/build values with a live config version', async () => {
    mockApplication.nativeApplicationVersion = null
    mockApplication.nativeBuildVersion = null
    expect(await evaluations.inspectEvaluationEnvironment()).toMatchObject({
      nativeAppVersion: null,
      nativeBuildVersion: null,
    })
  })

  it('never treats schema success as evidence of factual or medical quality', async () => {
    mockInsight.mockResolvedValue({
      ...insight,
      body: 'Your steps are 999999.',
    })
    const report = await evaluations.startSyntheticEvaluation('tuning').done
    expect(report.cases[0].objective).toBe('pass')
    expect(report.cases[0].semanticReview).toBe('required')
    expect(report.semanticRubric).toContain(
      'Compare every asserted measurement with the synthetic input; unknown is not zero.',
    )
  })

  it('checks only the tone enum for absent recovery, leaving prose and readiness for humans', async () => {
    mockInsight.mockResolvedValueOnce({ ...insight, tone: 'celebrate' })
    const report = await evaluations.startSyntheticEvaluation('held-out').done
    expect(report.cases[0]).toMatchObject({
      objective: 'fail',
      semanticReview: 'required',
    })
    expect(report.cases[0].checks).toContainEqual(
      expect.objectContaining({ id: 'missing-recovery-tone', passed: false }),
    )
    expect(report.cases[2].checks).toContainEqual(
      expect.objectContaining({ id: 'missing-recovery-tone', passed: true }),
    )
  })

  it('fails malformed returned values instead of calling them a full pass', async () => {
    mockInsight.mockResolvedValue({
      headline: 'x'.repeat(81),
      body: '',
      suggestion: '',
      tone: 'ready',
    })
    const report = await evaluations.startSyntheticEvaluation('tuning').done
    expect(report.cases[0].objective).toBe('fail')
    expect(report.cases[0].checks).toContainEqual(
      expect.objectContaining({ id: 'production-schema', passed: false }),
    )
    expect(report.semanticReview).toBe('required')
  })

  it('checks the production zero-energy rejection without claiming nutrition accuracy', async () => {
    mockMeal.mockResolvedValue({ ...meal, kcal: 0 })
    const report = await evaluations.startSyntheticEvaluation('tuning').done
    expect(report.cases[1].objective).toBe('fail')
    expect(report.cases[1].checks).toContainEqual(
      expect.objectContaining({ id: 'positive-meal-energy', passed: false }),
    )
  })

  it('fails out-of-bound returned fields even when reparsing would normalize them', async () => {
    mockMeal.mockResolvedValue({ ...meal, name: 'x'.repeat(61), kcal: 350.4 })
    const report = await evaluations.startSyntheticEvaluation('tuning').done
    expect(report.cases[1].objective).toBe('fail')
    expect(report.cases[1].checks).toContainEqual(
      expect.objectContaining({ id: 'normalized-fields', passed: false }),
    )
  })

  it('bounds output capture and explicitly flags truncation', async () => {
    mockInsight.mockResolvedValue({ ...insight, body: 'x'.repeat(8100) })
    const report = await evaluations.startSyntheticEvaluation('tuning').done
    expect(report.cases[0]).toMatchObject({
      outputTruncated: true,
      objective: 'fail',
    })
    expect(report.cases[0].output).toHaveLength(8000)
  })

  it('stops idempotently between cases and holds the overlap fence until the current request settles', async () => {
    const pending = deferred<typeof insight>()
    mockInsight.mockReturnValueOnce(pending.promise)
    const updates: EvaluationReport[] = []
    const job = evaluations.startSyntheticEvaluation('tuning', (report) =>
      updates.push(report),
    )
    await flush()
    job.stop()
    job.stop()
    expect(
      updates.filter((report) => report.status === 'stopping'),
    ).toHaveLength(1)
    expect(
      (await evaluations.startSyntheticEvaluation('tuning').done).status,
    ).toBe('blocked')
    expect(mockInsight).toHaveBeenCalledTimes(1)
    pending.resolve(insight)
    const report = await job.done
    expect(report.status).toBe('cancelled')
    expect(report.cases[0].status).toBe('completed')
    expect(report.cases[1].status).toBe('not-run')
    expect(mockMeal).not.toHaveBeenCalled()
    expect(
      (await evaluations.startSyntheticEvaluation('tuning').done).status,
    ).toBe('completed')
    expect(mockInsight).toHaveBeenCalledTimes(2)
  })

  it('does not generate when stopped during the availability check', async () => {
    const pending = deferred<CoachAvailability>()
    mockAvailability.mockReturnValueOnce(pending.promise)
    const job = evaluations.startSyntheticEvaluation('tuning')
    job.stop()
    pending.resolve('available')
    expect((await job.done).status).toBe('cancelled')
    expect(mockInsight).not.toHaveBeenCalled()
    expect(mockMeal).not.toHaveBeenCalled()
  })

  it('stops on generation errors and fences new runs until an app restart', async () => {
    mockInsight.mockRejectedValueOnce(new Error('private native error text'))
    const report = await evaluations.startSyntheticEvaluation('tuning').done
    expect(report.status).toBe('error')
    expect(report.cases[0].status).toBe('error')
    expect(report.cases[1].status).toBe('not-run')
    expect(JSON.stringify(report)).not.toContain('private native error text')
    const next = await evaluations.startSyntheticEvaluation('tuning').done
    expect(next.status).toBe('blocked')
    expect(next.reason).toContain('Restart the app')
    expect(mockInsight).toHaveBeenCalledTimes(1)
    expect(mockMeal).not.toHaveBeenCalled()
  })

  it('bounds a hung native operation without pretending a timeout cancels it', async () => {
    jest.useFakeTimers()
    const pending = deferred<typeof insight>()
    mockInsight.mockReturnValueOnce(pending.promise)
    const job = evaluations.startSyntheticEvaluation('tuning')
    await flush()
    await jest.advanceTimersByTimeAsync(65_000)
    const report = await job.done
    expect(report.status).toBe('error')
    expect(report.reason).toContain('native cancellation is unavailable')
    expect(report.cases[0].elapsedMs).toBe(65_000)
    expect(
      (await evaluations.startSyntheticEvaluation('held-out').done).status,
    ).toBe('blocked')
    pending.resolve(insight)
    await flush()
    expect(
      (await evaluations.startSyntheticEvaluation('held-out').done).status,
    ).toBe('blocked')
    expect(mockInsight).toHaveBeenCalledTimes(1)
    expect(mockMeal).not.toHaveBeenCalled()
  })
})
