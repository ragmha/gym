import * as Application from 'expo-application'
import { Platform } from 'react-native'

import {
  appleFMCoachEngine,
  generateValidatedJson,
} from '@/lib/coach/appleFMAdapter'
import {
  AI_EVALUATION_FIXTURES,
  type EvaluationFixture,
  type EvaluationSplit,
} from '@/lib/coach/evaluationFixtures'
import { buildDailyInsightPrompt } from '@/lib/coach/prompts/dailyInsight'
import type { CoachAvailability } from '@/lib/coach/types'
import { buildMealEstimateRequest, mealEstimateSchema } from '@/lib/mealPhoto'
import { coachInsightSchema } from '@/lib/validators'

export const SEMANTIC_REVIEW_RUBRIC = [
  'Compare every asserted measurement with the synthetic input; unknown is not zero.',
  'Without recovery, check acknowledgement of missing data and no training-readiness assessment.',
  'Review helpfulness, concision, and supportive wording in context.',
  'Check for unsupported health claims or medically authoritative advice.',
  'Meal nutrition accuracy needs measured ground truth; these label fixtures cannot establish it.',
] as const

const OUTPUT_CAPTURE_LIMIT = 8000
// Production already has two bounded 30s attempts. This outer deadline also
// bounds a stalled configure call; it does NOT cancel the native request.
const REQUEST_DEADLINE_MS = 65_000
let evaluationActive = false
let restartRequired = false

export interface EvaluationEnvironment {
  platform: string
  osVersion: string | null
  nativeAppVersion: string | null
  nativeBuildVersion: string | null
  engine: 'apple-fm'
  availability: CoachAvailability | 'not-checked' | 'check-failed'
  modelVersion: null
}

export interface ObjectiveCheck {
  id: string
  passed: boolean
  detail: string
}

export interface EvaluationCaseResult {
  id: string
  split: EvaluationSplit
  input: EvaluationFixture
  productionPrompt: {
    source: string
    schemaSource: string
    system: string
    prompt: string
  }
  status: 'not-run' | 'running' | 'completed' | 'error'
  output: string | null
  outputTruncated: boolean
  objective: 'not-run' | 'pass' | 'fail'
  checks: ObjectiveCheck[]
  elapsedMs: number
  semanticReview: 'required'
}

export interface EvaluationReport {
  format: 'gym-synthetic-ai-eval-v1'
  syntheticOnly: true
  split: EvaluationSplit
  status:
    | 'checking'
    | 'running'
    | 'stopping'
    | 'completed'
    | 'cancelled'
    | 'blocked'
    | 'error'
  reason: string | null
  startedAt: string
  finishedAt: string | null
  elapsedMs: number
  environment: EvaluationEnvironment
  cases: EvaluationCaseResult[]
  semanticReview: 'required'
  semanticRubric: typeof SEMANTIC_REVIEW_RUBRIC
}

export interface EvaluationJob {
  done: Promise<EvaluationReport>
  stop: () => void
}

function environment(): EvaluationEnvironment {
  return {
    platform: Platform.OS,
    osVersion: Platform.Version == null ? null : String(Platform.Version),
    nativeAppVersion: Application.nativeApplicationVersion,
    nativeBuildVersion: Application.nativeBuildVersion,
    engine: 'apple-fm',
    availability: 'not-checked',
    modelVersion: null,
  }
}

export async function inspectEvaluationEnvironment(): Promise<EvaluationEnvironment> {
  const info = environment()
  if (!__DEV__) return info
  if (Platform.OS !== 'ios') {
    return { ...info, availability: 'platform-unsupported' }
  }
  try {
    return {
      ...info,
      availability: await withDeadline(appleFMCoachEngine.availability()),
    }
  } catch {
    return { ...info, availability: 'check-failed' }
  }
}

export function evaluationAvailabilityReason(
  availability: EvaluationEnvironment['availability'],
): string {
  switch (availability) {
    case 'available':
      return 'Apple Foundation Models reports available.'
    case 'platform-unsupported':
      return 'Apple Foundation Models requires a compatible iOS device. No mock engine is used.'
    case 'ai-disabled':
      return 'Enable Apple Intelligence in iOS Settings before evaluating.'
    case 'model-not-ready':
      return 'The on-device model is not ready. Wait for Apple Intelligence setup to finish.'
    case 'device-unsupported':
      return 'This device does not support Apple Foundation Models.'
    case 'os-too-old':
      return 'This OS or native build cannot load Apple Foundation Models.'
    case 'check-failed':
      return 'The engine availability check failed or timed out.'
    default:
      return 'Engine availability has not been established.'
  }
}

function prepareCase(fixture: EvaluationFixture): EvaluationCaseResult {
  const insight = fixture.kind === 'daily-insight'
  const request = insight
    ? buildDailyInsightPrompt(fixture.context)
    : buildMealEstimateRequest(fixture.labels)
  return {
    id: fixture.id,
    split: fixture.split,
    input: fixture,
    productionPrompt: {
      source: insight
        ? 'src/lib/coach/prompts/dailyInsight.ts#buildDailyInsightPrompt'
        : 'src/lib/mealPhoto.ts#buildMealEstimateRequest',
      schemaSource: insight
        ? 'src/lib/validators/coach.ts#coachInsightSchema'
        : 'src/lib/mealPhoto.ts#mealEstimateSchema',
      system: request.system,
      prompt: request.prompt,
    },
    status: 'not-run',
    output: null,
    outputTruncated: false,
    objective: 'not-run',
    checks: [],
    elapsedMs: 0,
    semanticReview: 'required',
  }
}

function gradeOutput(
  fixture: EvaluationFixture,
  output: unknown,
): Pick<
  EvaluationCaseResult,
  'output' | 'outputTruncated' | 'checks' | 'objective'
> {
  const text = JSON.stringify(output, null, 2) ?? String(output)
  const parsed =
    fixture.kind === 'daily-insight'
      ? coachInsightSchema.safeParse(output)
      : mealEstimateSchema.safeParse(output)
  const checks: ObjectiveCheck[] = [
    {
      id: 'production-schema',
      passed: parsed.success,
      detail:
        'Returned value satisfies the production schema, including its field bounds and normalization. Not a semantic grade.',
    },
    {
      id: 'normalized-fields',
      passed:
        parsed.success &&
        Object.entries(parsed.data).every(
          ([key, value]) => (output as Record<string, unknown>)[key] === value,
        ),
      detail:
        'Returned fields already match production normalization and bounds; this checks the captured values, not just reparsed values.',
    },
    {
      id: 'capture-bound',
      passed: text.length <= OUTPUT_CAPTURE_LIMIT,
      detail: `Captured response JSON is at most ${OUTPUT_CAPTURE_LIMIT} characters.`,
    },
  ]
  if (fixture.kind === 'daily-insight' && fixture.context.recovery === null) {
    checks.push({
      id: 'missing-recovery-tone',
      passed:
        parsed.success &&
        'tone' in parsed.data &&
        parsed.data.tone === 'steady',
      detail:
        'Only checks tone === steady. Missing-data acknowledgement and readiness claims need human review.',
    })
  }
  if (fixture.kind === 'meal-estimate') {
    checks.push({
      id: 'positive-meal-energy',
      passed: parsed.success && 'kcal' in parsed.data && parsed.data.kcal >= 1,
      detail:
        'Matches the production rejection of zero-energy meals; not evidence of nutrition accuracy.',
    })
  }
  return {
    output: text.slice(0, OUTPUT_CAPTURE_LIMIT),
    outputTruncated: text.length > OUTPUT_CAPTURE_LIMIT,
    checks,
    objective: checks.every((check) => check.passed) ? 'pass' : 'fail',
  }
}

export function startSyntheticEvaluation(
  split: EvaluationSplit,
  onProgress?: (report: EvaluationReport) => void,
): EvaluationJob {
  const started = Date.now()
  let stopped = false
  let report: EvaluationReport = {
    format: 'gym-synthetic-ai-eval-v1',
    syntheticOnly: true,
    split,
    status: 'checking',
    reason: null,
    startedAt: new Date(started).toISOString(),
    finishedAt: null,
    elapsedMs: 0,
    environment: environment(),
    cases: AI_EVALUATION_FIXTURES.filter((item) => item.split === split).map(
      prepareCase,
    ),
    semanticReview: 'required',
    semanticRubric: SEMANTIC_REVIEW_RUBRIC,
  }
  const publish = () => onProgress?.(report)
  const finish = (
    status: EvaluationReport['status'],
    reason: string | null = null,
  ) => {
    report = {
      ...report,
      status,
      reason:
        reason ??
        (status === 'cancelled'
          ? 'Stopped scheduling cases after awaiting in-flight work. No native cancellation was attempted.'
          : null),
      finishedAt: new Date().toISOString(),
      elapsedMs: Math.max(0, Date.now() - started),
    }
    publish()
    return report
  }

  const blocked = !__DEV__
    ? 'Evaluations are disabled outside development builds.'
    : evaluationActive
      ? 'Another evaluation is still running or stopping. Wait for it to settle.'
      : restartRequired
        ? 'Restart the app before evaluating again; native completion after the last error cannot be confirmed.'
        : null
  if (blocked) {
    return { done: Promise.resolve(finish('blocked', blocked)), stop: () => {} }
  }

  evaluationActive = true
  async function run(): Promise<EvaluationReport> {
    try {
      report = {
        ...report,
        environment: await inspectEvaluationEnvironment(),
      }
      if (stopped) return finish('cancelled')
      if (report.environment.availability !== 'available') {
        return finish(
          'blocked',
          evaluationAvailabilityReason(report.environment.availability),
        )
      }
      for (let index = 0; index < report.cases.length; index += 1) {
        if (stopped) return finish('cancelled')
        const item = report.cases[index]
        const fixture = item.input
        const caseStarted = Date.now()
        report = {
          ...report,
          status: 'running',
          cases: report.cases.map((entry, i) =>
            i === index ? { ...entry, status: 'running' } : entry,
          ),
        }
        publish()
        try {
          const output = await withDeadline<unknown>(
            fixture.kind === 'daily-insight'
              ? appleFMCoachEngine.generateDailyInsight(fixture.context)
              : generateValidatedJson(buildMealEstimateRequest(fixture.labels)),
          )
          report = {
            ...report,
            cases: report.cases.map((entry, i) =>
              i === index
                ? {
                    ...entry,
                    ...gradeOutput(fixture, output),
                    status: 'completed',
                    elapsedMs: Math.max(0, Date.now() - caseStarted),
                  }
                : entry,
            ),
          }
          publish()
        } catch {
          // The native library has no cancel API. Even a rejected JS timeout
          // cannot prove native completion, so never open another eval session.
          restartRequired = true
          report = {
            ...report,
            cases: report.cases.map((entry, i) =>
              i === index
                ? {
                    ...entry,
                    status: 'error',
                    elapsedMs: Math.max(0, Date.now() - caseStarted),
                  }
                : entry,
            ),
          }
          return finish(
            'error',
            'Generation failed, timed out, or exhausted production validation retries. Remaining cases were not run. Restart the app before another evaluation; native cancellation is unavailable.',
          )
        }
      }
      return finish(stopped ? 'cancelled' : 'completed')
    } finally {
      evaluationActive = false
    }
  }
  return {
    done: run(),
    stop: () => {
      if (report.finishedAt || stopped) return
      stopped = true
      report = {
        ...report,
        status: 'stopping',
        reason:
          'Waiting for the current request; stopping does not cancel native generation. No later cases will start.',
      }
      publish()
    },
  }
}

function withDeadline<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('Evaluation deadline')),
      REQUEST_DEADLINE_MS,
    )
  })
  return Promise.race([operation, deadline]).finally(() => clearTimeout(timer))
}
