import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { z } from 'zod'

const text = z.string().trim().min(1)
const identifier = text.regex(/^[a-z][a-z0-9-]*$/)
const splitSchema = z.enum(['tuning', 'held-out', 'all'])
const metricKeys = ['toolCalls', 'durationMs', 'attempts'] as const
const metricsSchema = z.strictObject({
  toolCalls: z.int().nonnegative(),
  durationMs: z.int().nonnegative(),
  attempts: z.int().nonnegative(),
})
const datasetSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: identifier,
  revision: z.int().positive(),
  rubricRevision: z.int().positive(),
  synthetic: z.literal(true),
  description: text,
  cases: z
    .array(
      z.strictObject({
        id: identifier,
        split: z.enum(['tuning', 'held-out']),
        skills: z.array(identifier).min(1),
        task: text,
        prerequisites: z.array(text).min(1),
        expectedOutcome: text,
        stopConditions: z.array(text).min(1),
        budget: metricsSchema.extend({ attempts: z.int().positive() }),
        rubric: z
          .array(
            z.strictObject({
              id: identifier,
              requirement: text,
              safety: z.boolean(),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
})
const reportSchema = z.strictObject({
  schemaVersion: z.literal(1),
  dataset: z.strictObject({
    id: identifier,
    revision: z.int().positive(),
    rubricRevision: z.int().positive(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  sourceCommit: z
    .string()
    .regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/)
    .refine((value) => !/^0+$/.test(value), 'Use a known full Git commit')
    .nullable(),
  agent: z.strictObject({
    id: text.nullable(),
    model: text.nullable(),
    config: z
      .record(
        z.string().regex(/^\S+$/, 'Config keys must not contain whitespace'),
        z.union([z.string(), z.number(), z.boolean(), z.null()]),
      )
      .nullable(),
  }),
  split: splitSchema,
  results: z.array(
    z.strictObject({
      caseId: identifier,
      status: z.enum(['pending', 'blocked', 'completed']),
      reason: text.nullable(),
      metrics: metricsSchema.nullable(),
      review: z
        .strictObject({
          reviewer: text,
          reviewedAt: z.iso.datetime({ offset: true }),
        })
        .nullable(),
      rubric: z.array(
        z.strictObject({
          criterionId: identifier,
          verdict: z.enum(['pending', 'pass', 'fail']),
          observation: text.nullable(),
          evidenceRefs: z.array(
            text.regex(
              /^(?:artifact|run):\S+$/,
              'Use an artifact:<local-reference> or run:<id> reference',
            ),
          ),
        }),
      ),
    }),
  ),
})

export type WorkflowDataset = z.infer<typeof datasetSchema>
export type WorkflowReport = z.infer<typeof reportSchema>
type Split = z.infer<typeof splitSchema>
type Metrics = z.infer<typeof metricsSchema>
type CaseStatus =
  | 'passed'
  | 'failed'
  | 'blocked'
  | 'pending'
  | 'unreviewed'
  | 'missing'

const notice =
  'Scores manually reviewed observations only. Does not run agents, replay tools, ' +
  'verify evidence references, or independently prove behavior. A correct refusal ' +
  'does not prove a native smoke, release, or installation succeeded.'

function parse<T>(schema: z.ZodType<T>, input: unknown, label: string): T {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    throw new Error(
      `${label}: ${parsed.error.issues
        .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
        .join('; ')}`,
    )
  }
  return parsed.data
}

function unique(values: string[], label: string): void {
  const seen = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) throw new Error(`${label}: duplicate ${value}`)
    seen.add(value)
  }
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export function parseDataset(input: unknown): WorkflowDataset {
  const dataset = parse(datasetSchema, input, 'Invalid dataset')
  unique(
    dataset.cases.map((item) => item.id),
    'Dataset cases',
  )
  for (const item of dataset.cases) {
    unique(item.skills, `${item.id} skills`)
    unique(
      item.rubric.map((criterion) => criterion.id),
      `${item.id} rubric`,
    )
  }
  for (const split of ['tuning', 'held-out']) {
    if (!dataset.cases.some((item) => item.split === split)) {
      throw new Error(`Dataset needs a nonempty ${split} split`)
    }
  }
  return dataset
}

export function datasetIdentity(dataset: WorkflowDataset) {
  return {
    id: dataset.id,
    revision: dataset.revision,
    rubricRevision: dataset.rubricRevision,
    sha256: createHash('sha256').update(canonical(dataset)).digest('hex'),
  }
}

function selectedCases(dataset: WorkflowDataset, split: Split) {
  return dataset.cases.filter((item) => split === 'all' || item.split === split)
}

export function createReportTemplate(
  dataset: WorkflowDataset,
  split: Split = 'tuning',
): WorkflowReport {
  return {
    schemaVersion: 1,
    dataset: datasetIdentity(dataset),
    sourceCommit: null,
    agent: { id: null, model: null, config: null },
    split,
    results: selectedCases(dataset, split).map((item) => ({
      caseId: item.id,
      status: 'pending',
      reason: null,
      metrics: null,
      review: null,
      rubric: item.rubric.map((criterion) => ({
        criterionId: criterion.id,
        verdict: 'pending',
        observation: null,
        evidenceRefs: [],
      })),
    })),
  }
}

function missingProvenance(report: WorkflowReport): string[] {
  return [
    ...(report.sourceCommit === null ? ['sourceCommit'] : []),
    ...(['id', 'model', 'config'] as const)
      .filter((key) => report.agent[key] === null)
      .map((key) => `agent.${key}`),
  ]
}

export function validateReport(
  dataset: WorkflowDataset,
  input: unknown,
): WorkflowReport {
  const report = parse(reportSchema, input, 'Invalid report')
  if (canonical(report.dataset) !== canonical(datasetIdentity(dataset))) {
    throw new Error(
      'Dataset identity/revision/rubric/hash mismatch; use the same Git-versioned fixture',
    )
  }
  unique(
    report.results.map((item) => item.caseId),
    'Report cases',
  )
  const selected = selectedCases(dataset, report.split)
  for (const result of report.results) {
    const item = selected.find((entry) => entry.id === result.caseId)
    if (!item) {
      throw new Error(
        `Unknown or out-of-split case ${result.caseId} (${report.split})`,
      )
    }
    unique(
      result.rubric.map((criterion) => criterion.criterionId),
      `${item.id} reported rubric`,
    )
    const expected = new Set(item.rubric.map((criterion) => criterion.id))
    for (const criterion of result.rubric) {
      if (!expected.delete(criterion.criterionId)) {
        throw new Error(
          `${item.id}: unknown criterion ${criterion.criterionId}`,
        )
      }
      if (
        criterion.verdict !== 'pending' &&
        (!criterion.observation || criterion.evidenceRefs.length === 0)
      ) {
        throw new Error(
          `${item.id}/${criterion.criterionId}: a verdict needs an observation and evidence references`,
        )
      }
    }
    if (expected.size > 0) {
      throw new Error(
        `${item.id}: missing criteria ${[...expected].join(', ')}`,
      )
    }
    if (result.status === 'blocked' && !result.reason) {
      throw new Error(`${item.id}: blocked results need a reason`)
    }
    if (result.status === 'completed') {
      const missing = missingProvenance(report)
      if (missing.length > 0) {
        throw new Error(`Completed results need ${missing.join(', ')}`)
      }
      if (!result.metrics || result.metrics.attempts === 0) {
        throw new Error(
          `${item.id}: completed results need observed metrics and at least one attempt`,
        )
      }
      if (result.rubric.some((criterion) => criterion.verdict === 'pending')) {
        throw new Error(`${item.id}: completed results have pending criteria`)
      }
    }
  }
  return report
}

function sumMetrics(metrics: Metrics[]): Metrics | null {
  if (metrics.length === 0) return null
  const total = { toolCalls: 0, durationMs: 0, attempts: 0 }
  for (const item of metrics) {
    for (const key of metricKeys) {
      total[key] += item[key]
      if (!Number.isSafeInteger(total[key])) {
        throw new Error(`Observed ${key} total exceeds safe integer range`)
      }
    }
  }
  return total
}

export function gradeReport(dataset: WorkflowDataset, input: unknown) {
  const report = validateReport(dataset, input)
  const cases = selectedCases(dataset, report.split).map((item) => {
    const result = report.results.find((entry) => entry.caseId === item.id)
    const reviewed = result?.review != null
    const passedCriteria = reviewed
      ? result.rubric
          .filter((criterion) => criterion.verdict === 'pass')
          .map((criterion) => criterion.criterionId)
      : []
    const failedCriteria = reviewed
      ? result.rubric
          .filter((criterion) => criterion.verdict === 'fail')
          .map((criterion) => criterion.criterionId)
      : []
    const safetyFailures = item.rubric
      .filter(
        (criterion) =>
          criterion.safety && failedCriteria.includes(criterion.id),
      )
      .map((criterion) => criterion.id)
    const exceededBudgets = metricKeys.flatMap((key) =>
      result?.metrics && result.metrics[key] > item.budget[key]
        ? [
            {
              metric: key,
              observed: result.metrics[key],
              limit: item.budget[key],
            },
          ]
        : [],
    )
    let status: CaseStatus
    if (!result) status = 'missing'
    else if (result.status === 'blocked') status = 'blocked'
    else if (result.status === 'pending') status = 'pending'
    else if (!reviewed) status = 'unreviewed'
    else if (failedCriteria.length || exceededBudgets.length) status = 'failed'
    else status = 'passed'
    return {
      caseId: item.id,
      status,
      reason: result?.reason ?? null,
      metrics: result?.metrics ?? null,
      passedCriteria,
      failedCriteria,
      totalCriteria: item.rubric.length,
      safetyFailures,
      exceededBudgets,
    }
  })
  const counts: Record<CaseStatus | 'total', number> = {
    total: cases.length,
    passed: 0,
    failed: 0,
    blocked: 0,
    pending: 0,
    unreviewed: 0,
    missing: 0,
  }
  for (const item of cases) counts[item.status]++
  const metrics = report.results.flatMap((item) =>
    item.metrics ? [item.metrics] : [],
  )
  const missingMetadata = missingProvenance(report)
  return {
    notice,
    dataset: report.dataset,
    sourceCommit: report.sourceCommit,
    agent: report.agent,
    split: report.split,
    ok: counts.passed === counts.total && missingMetadata.length === 0,
    missingMetadata,
    counts,
    safetyFailures: cases.flatMap((item) =>
      item.safetyFailures.map((criterionId) => ({
        caseId: item.caseId,
        criterionId,
      })),
    ),
    metrics: {
      reportedCases: metrics.length,
      totalCases: cases.length,
      totals: sumMetrics(metrics),
    },
    cases,
  }
}

function metricDelta(before: Metrics, after: Metrics): Metrics {
  return {
    toolCalls: after.toolCalls - before.toolCalls,
    durationMs: after.durationMs - before.durationMs,
    attempts: after.attempts - before.attempts,
  }
}

export function compareReports(
  dataset: WorkflowDataset,
  baselineInput: unknown,
  candidateInput: unknown,
) {
  const baseline = gradeReport(dataset, baselineInput)
  const candidate = gradeReport(dataset, candidateInput)
  if (baseline.split !== candidate.split) {
    throw new Error('Incomparable reports: split/case selection must match')
  }
  if (canonical(baseline.agent) !== canonical(candidate.agent)) {
    throw new Error(
      'Incomparable reports: agent, model, and model config must match',
    )
  }
  for (const [label, grade] of [
    ['baseline', baseline],
    ['candidate', candidate],
  ] as const) {
    if (
      grade.missingMetadata.length > 0 ||
      grade.cases.some(
        (item) => item.status !== 'passed' && item.status !== 'failed',
      )
    ) {
      throw new Error(
        `Incomparable ${label}: complete reviewed coverage is required (missing, blocked, pending, or unreviewed cases cannot be compared)`,
      )
    }
  }
  const changes = baseline.cases.map((before, index) => {
    const after = candidate.cases[index]
    if (!before.metrics || !after.metrics) {
      throw new Error('Incomparable reports: observed metrics are required')
    }
    return {
      caseId: before.caseId,
      before: before.status,
      after: after.status,
      lostCriteria: before.passedCriteria.filter(
        (id) => !after.passedCriteria.includes(id),
      ),
      gainedCriteria: after.passedCriteria.filter(
        (id) => !before.passedCriteria.includes(id),
      ),
      metricDelta: metricDelta(before.metrics, after.metrics),
    }
  })
  const beforeMetrics = baseline.metrics.totals
  const afterMetrics = candidate.metrics.totals
  if (!beforeMetrics || !afterMetrics) {
    throw new Error('Incomparable reports: observed metrics are required')
  }
  return {
    notice,
    ok: candidate.ok,
    baseline,
    candidate,
    changes,
    regressions: changes.filter(
      (item) =>
        item.lostCriteria.length > 0 ||
        (item.before === 'passed' && item.after === 'failed'),
    ),
    metricDelta: metricDelta(beforeMetrics, afterMetrics),
  }
}

const usage = `Usage: bun scripts/evaluate-workflows.ts <command>
  list [--split tuning|held-out|all] [--dataset path]
  template [--split tuning|held-out|all] [--dataset path]
  grade <report.json|-> [--dataset path]
  compare <baseline.json> <candidate.json> [--dataset path]

list defaults to all; template defaults to tuning and contains no graded results.
Reports go to stdout only; keep observations/private artifacts out of Git.
Fill sourceCommit, agent.id/model/config, observed metrics, per-criterion evidence,
and manual review before grading. config={} explicitly records default settings.
All cases in the declared split are required; comparison rejects incomplete coverage.
Exit 0: listing/template or fully passing candidate. Exit 1: failed/incomplete grade.
Exit 2: invalid input or incomparable reports. Metric deltas are descriptive, not benchmarks.
${notice}`

function readJson(path: string): unknown {
  let content: string
  try {
    content = readFileSync(path === '-' ? 0 : path, 'utf8')
  } catch {
    throw new Error(`Cannot read JSON: ${path}`)
  }
  try {
    return JSON.parse(content)
  } catch {
    throw new Error(`Invalid JSON: ${path}`)
  }
}

export function runCli(args: string[]): number {
  try {
    if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
      console.log(usage)
      return 0
    }
    const [command, ...rest] = args
    if (!['list', 'template', 'grade', 'compare'].includes(command)) {
      throw new Error(usage)
    }
    const files: string[] = []
    const options = new Map<string, string>()
    for (let index = 0; index < rest.length; index++) {
      const arg = rest[index]
      if (arg.startsWith('--')) {
        if (
          !['--split', '--dataset'].includes(arg) ||
          options.has(arg) ||
          !rest[index + 1] ||
          rest[index + 1].startsWith('--')
        ) {
          throw new Error(`Unknown, duplicate, or missing option: ${arg}`)
        }
        options.set(arg, rest[++index])
      } else {
        files.push(arg)
      }
    }
    const expectedFiles =
      command === 'grade' ? 1 : command === 'compare' ? 2 : 0
    if (
      files.length !== expectedFiles ||
      (options.has('--split') && !['list', 'template'].includes(command)) ||
      files.filter((file) => file === '-').length > 1
    ) {
      throw new Error(`Invalid arguments for ${command}\n${usage}`)
    }
    const dataset = parseDataset(
      readJson(options.get('--dataset') ?? 'evals/workflows.json'),
    )
    if (command === 'list' || command === 'template') {
      const split = parse(
        splitSchema,
        options.get('--split') ?? (command === 'list' ? 'all' : 'tuning'),
        'Invalid split',
      )
      console.log(
        JSON.stringify(
          command === 'list'
            ? {
                notice,
                dataset: datasetIdentity(dataset),
                split,
                cases: selectedCases(dataset, split),
              }
            : createReportTemplate(dataset, split),
          null,
          2,
        ),
      )
      return 0
    }
    const result =
      command === 'grade'
        ? gradeReport(dataset, readJson(files[0]))
        : compareReports(dataset, readJson(files[0]), readJson(files[1]))
    console.log(JSON.stringify(result, null, 2))
    return result.ok ? 0 : 1
  } catch (error) {
    console.error(
      `Workflow evaluation: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
    return 2
  }
}

if (require.main === module) {
  process.exitCode = runCli(process.argv.slice(2))
}
