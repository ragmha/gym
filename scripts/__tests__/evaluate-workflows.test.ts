import fs from 'node:fs'
import { resolve } from 'node:path'

import {
  compareReports,
  createReportTemplate,
  datasetIdentity,
  gradeReport,
  parseDataset,
  runCli,
  validateReport,
  type WorkflowReport,
} from '../evaluate-workflows'

const fixture = JSON.parse(
  fs.readFileSync(resolve(__dirname, '../../evals/workflows.json'), 'utf8'),
)
const dataset = parseDataset(fixture)

// These invented observations test scorer mechanics, not actual agent performance.
function observedReport(
  split: WorkflowReport['split'] = 'all',
): WorkflowReport {
  const report = createReportTemplate(dataset, split)
  report.sourceCommit = 'a'.repeat(40)
  report.agent = {
    id: 'scorer-unit-test',
    model: 'synthetic-not-a-model',
    config: { temperature: 0, reasoningEffort: 'test-only' },
  }
  report.results = report.results.map((result) => ({
    ...result,
    status: 'completed',
    metrics: { toolCalls: 1, durationMs: 2, attempts: 1 },
    review: {
      reviewer: 'synthetic-unit-test-reviewer',
      reviewedAt: '2026-10-21T20:00:00Z',
    },
    rubric: result.rubric.map((criterion) => ({
      ...criterion,
      verdict: 'pass',
      observation: 'Synthetic assertion used only to exercise the scorer.',
      evidenceRefs: ['run:scorer-unit-test-not-an-agent-run'],
    })),
  }))
  return report
}

describe('versioned synthetic workflow dataset', () => {
  it('has eight stable cases and separate tuning/held-out coverage', () => {
    expect(dataset.synthetic).toBe(true)
    expect(dataset.cases).toHaveLength(8)
    expect(
      dataset.cases.filter((item) => item.split === 'tuning'),
    ).toHaveLength(5)
    expect(
      dataset.cases.filter((item) => item.split === 'held-out'),
    ).toHaveLength(3)
    expect(new Set(dataset.cases.flatMap((item) => item.skills))).toEqual(
      new Set([
        'ship-status',
        'native-feature',
        'platform-gate',
        'scope-exception',
        'healthkit-data',
        'ios-dev-loop',
        'e2e-smoke',
        'ui-change',
      ]),
    )
  })

  it('emits only pending templates, with no invented metrics or provenance', () => {
    const report = createReportTemplate(dataset)
    expect(report.split).toBe('tuning')
    expect(report.sourceCommit).toBeNull()
    expect(report.agent).toEqual({ id: null, model: null, config: null })
    for (const result of report.results) {
      expect(result.status).toBe('pending')
      expect(result.metrics).toBeNull()
      expect(result.review).toBeNull()
      for (const criterion of result.rubric) {
        expect(criterion).toMatchObject({
          verdict: 'pending',
          observation: null,
          evidenceRefs: [],
        })
      }
    }
  })

  it('hashes semantic fixture contents, not JSON key order or whitespace', () => {
    const reordered = Object.fromEntries(Object.entries(fixture).reverse())
    expect(datasetIdentity(parseDataset(reordered))).toEqual(
      datasetIdentity(dataset),
    )
    const changed = structuredClone(dataset)
    changed.cases[0].rubric[0].requirement += ' Changed criterion.'
    expect(datasetIdentity(changed).sha256).not.toBe(
      datasetIdentity(dataset).sha256,
    )
  })

  it('rejects duplicate dataset case and rubric identifiers', () => {
    const duplicateCase = structuredClone(dataset)
    duplicateCase.cases.push(duplicateCase.cases[0])
    expect(() => parseDataset(duplicateCase)).toThrow(/duplicate/)
    const duplicateRubric = structuredClone(dataset)
    duplicateRubric.cases[0].rubric.push(duplicateRubric.cases[0].rubric[0])
    expect(() => parseDataset(duplicateRubric)).toThrow(/duplicate/)
  })

  it('rejects a dataset with no held-out split or a non-synthetic label', () => {
    expect(() =>
      parseDataset({
        ...dataset,
        cases: dataset.cases.filter((item) => item.split === 'tuning'),
      }),
    ).toThrow(/nonempty held-out/)
    expect(() => parseDataset({ ...dataset, synthetic: false })).toThrow(
      /synthetic/,
    )
  })
})

describe('reviewed workflow grading', () => {
  it('requires every selected case and criterion, with explicit metric coverage', () => {
    const grade = gradeReport(dataset, observedReport())
    expect(grade.ok).toBe(true)
    expect(grade.counts).toEqual({
      total: 8,
      passed: 8,
      failed: 0,
      missing: 0,
      pending: 0,
      blocked: 0,
      unreviewed: 0,
    })
    expect(grade.metrics).toEqual({
      reportedCases: 8,
      totalCases: 8,
      totals: { toolCalls: 8, durationMs: 16, attempts: 8 },
    })
    expect(grade.notice).toContain('Does not run agents')
  })

  it('does not turn an ordinary rubric failure into a passing average', () => {
    const report = observedReport()
    report.results[0].rubric[0].verdict = 'fail'
    const grade = gradeReport(dataset, report)
    expect(grade.ok).toBe(false)
    expect(grade.counts).toMatchObject({ total: 8, passed: 7, failed: 1 })
    expect(grade.cases[0].failedCriteria).toEqual(['separate-shipping-stages'])
    expect(grade.safetyFailures).toEqual([])
  })

  it('vetoes a single safety/permission failure regardless of other passes', () => {
    const report = observedReport()
    report.results[0].rubric[1].verdict = 'fail'
    const grade = gradeReport(dataset, report)
    expect(grade.ok).toBe(false)
    expect(grade.safetyFailures).toEqual([
      {
        caseId: 'merged-is-not-installed',
        criterionId: 'no-invented-install',
      },
    ])
  })

  it('keeps missing cases in the denominator instead of averaging them away', () => {
    const report = observedReport()
    report.results.pop()
    const grade = gradeReport(dataset, report)
    expect(grade.ok).toBe(false)
    expect(grade.counts).toMatchObject({ total: 8, passed: 7, missing: 1 })
    expect(grade.metrics).toMatchObject({ reportedCases: 7, totalCases: 8 })
  })

  it('keeps blocked coverage nonpassing even with reviewed passing criteria', () => {
    const report = observedReport()
    report.results[0].status = 'blocked'
    report.results[0].reason =
      'The required observation artifact is unavailable.'
    const grade = gradeReport(dataset, report)
    expect(grade.ok).toBe(false)
    expect(grade.counts).toMatchObject({ total: 8, passed: 7, blocked: 1 })
    expect(grade.cases[0].status).toBe('blocked')
  })

  it('keeps unreviewed self-assessments nonpassing', () => {
    const report = observedReport()
    report.results[0].review = null
    const grade = gradeReport(dataset, report)
    expect(grade.ok).toBe(false)
    expect(grade.counts.unreviewed).toBe(1)
    expect(grade.cases[0].passedCriteria).toEqual([])
  })

  it('keeps pending templates explicitly incomplete, without fabricated zero metrics', () => {
    const grade = gradeReport(dataset, createReportTemplate(dataset, 'all'))
    expect(grade.ok).toBe(false)
    expect(grade.counts).toMatchObject({ total: 8, passed: 0, pending: 8 })
    expect(grade.metrics.totals).toBeNull()
    expect(grade.missingMetadata).toEqual([
      'sourceCommit',
      'agent.id',
      'agent.model',
      'agent.config',
    ])
  })

  it.each(['toolCalls', 'durationMs', 'attempts'] as const)(
    'enforces the %s budget without excluding unsuccessful attempts',
    (metric) => {
      const report = observedReport()
      report.results[0].metrics = { ...dataset.cases[0].budget }
      expect(gradeReport(dataset, report).ok).toBe(true)
      report.results[0].metrics[metric]++
      const grade = gradeReport(dataset, report)
      expect(grade.ok).toBe(false)
      expect(grade.cases[0].exceededBudgets).toEqual([
        {
          metric,
          observed: dataset.cases[0].budget[metric] + 1,
          limit: dataset.cases[0].budget[metric],
        },
      ])
    },
  )
})

describe('fail-closed report validation', () => {
  it.each([
    -1,
    0.5,
    NaN,
    Infinity,
    -Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    '1',
  ])('rejects invalid tool metrics (%s)', (value) => {
    const report = observedReport()
    const input = {
      ...report,
      results: [
        {
          ...report.results[0],
          metrics: { toolCalls: value, durationMs: 2, attempts: 1 },
        },
        ...report.results.slice(1),
      ],
    }
    expect(() => gradeReport(dataset, input)).toThrow(/toolCalls/)
  })

  it('rejects overflowing totals instead of emitting misleading metrics', () => {
    const report = observedReport()
    report.results[0].metrics = {
      toolCalls: Number.MAX_SAFE_INTEGER,
      durationMs: 1,
      attempts: 1,
    }
    expect(() => gradeReport(dataset, report)).toThrow(/safe integer range/)
  })

  it('rejects unknown, duplicate, and out-of-split cases', () => {
    const unknown = observedReport()
    unknown.results[0].caseId = 'unknown-case'
    expect(() => validateReport(dataset, unknown)).toThrow(/Unknown/)
    const duplicate = observedReport()
    duplicate.results.push(duplicate.results[0])
    expect(() => validateReport(dataset, duplicate)).toThrow(/duplicate/)
    const wrongSplit = observedReport('held-out')
    wrongSplit.results.push(observedReport('tuning').results[0])
    expect(() => validateReport(dataset, wrongSplit)).toThrow(/out-of-split/)
  })

  it('rejects unknown, duplicate, and omitted rubric criteria', () => {
    const unknown = observedReport()
    unknown.results[0].rubric[0].criterionId = 'unknown-criterion'
    expect(() => validateReport(dataset, unknown)).toThrow(/unknown criterion/)
    const duplicate = observedReport()
    duplicate.results[0].rubric.push(duplicate.results[0].rubric[0])
    expect(() => validateReport(dataset, duplicate)).toThrow(/duplicate/)
    const missing = observedReport()
    missing.results[0].rubric.pop()
    expect(() => validateReport(dataset, missing)).toThrow(/missing criteria/)
  })

  it('rejects verdicts without both an observation and evidence reference', () => {
    const report = observedReport()
    report.results[0].rubric[0].evidenceRefs = []
    expect(() => validateReport(dataset, report)).toThrow(/evidence references/)
    report.results[0].rubric[0].evidenceRefs = ['run:test-only']
    report.results[0].rubric[0].observation = null
    expect(() => validateReport(dataset, report)).toThrow(/observation/)
  })

  it('rejects extra self-reported success flags and empty manual review identities', () => {
    expect(() =>
      validateReport(dataset, { ...observedReport(), success: true }),
    ).toThrow(/Unrecognized key/)
    const report = observedReport()
    report.results[0].review = {
      reviewer: ' ',
      reviewedAt: '2026-10-21T20:00:00Z',
    }
    expect(() => validateReport(dataset, report)).toThrow(/reviewer/)
    report.results[0].review = {
      reviewer: 'synthetic',
      reviewedAt: 'not-a-timestamp',
    }
    expect(() => validateReport(dataset, report)).toThrow(/reviewedAt/)
  })

  it('rejects invalid commit/config provenance and completed rows without provenance', () => {
    const report = observedReport()
    report.sourceCommit = 'HEAD'
    expect(() => validateReport(dataset, report)).toThrow(/sourceCommit/)
    report.sourceCommit = '0'.repeat(40)
    expect(() => validateReport(dataset, report)).toThrow(/full Git commit/)
    report.sourceCommit = null
    expect(() => validateReport(dataset, report)).toThrow(/need sourceCommit/)
    report.sourceCommit = 'a'.repeat(40)
    report.agent.config = { temperature: Infinity }
    expect(() => validateReport(dataset, report)).toThrow(/config/)
    report.agent.config = { ' temperature': 0 }
    expect(() => validateReport(dataset, report)).toThrow(/config/)
    report.agent.config = null
    expect(() => validateReport(dataset, report)).toThrow(/need agent.config/)
  })

  it('rejects incomplete completed rows and blockers with no reason', () => {
    const report = observedReport()
    report.results[0].metrics = null
    expect(() => validateReport(dataset, report)).toThrow(/observed metrics/)
    report.results[0].metrics = { toolCalls: 1, durationMs: 1, attempts: 0 }
    expect(() => validateReport(dataset, report)).toThrow(
      /at least one attempt/,
    )
    report.results[0].metrics.attempts = 1
    report.results[0].rubric[0].verdict = 'pending'
    expect(() => validateReport(dataset, report)).toThrow(/pending criteria/)
    report.results[0].status = 'blocked'
    expect(() => validateReport(dataset, report)).toThrow(/need a reason/)
  })

  it('rejects stale fixture revisions and silent rubric edits', () => {
    const report = observedReport()
    report.dataset.revision++
    expect(() => validateReport(dataset, report)).toThrow(/mismatch/)
    const changed = structuredClone(dataset)
    changed.cases[0].rubric[0].safety = true
    expect(() => validateReport(changed, observedReport())).toThrow(/mismatch/)
  })
})

describe('matched before/after comparisons', () => {
  it('compares different source commits on identical cases/config and shows actual deltas', () => {
    const baseline = observedReport()
    baseline.results[0].rubric[0].verdict = 'fail'
    baseline.results[0].metrics = { toolCalls: 2, durationMs: 4, attempts: 1 }
    const candidate = observedReport()
    candidate.sourceCommit = 'b'.repeat(40)
    candidate.agent.config = { reasoningEffort: 'test-only', temperature: 0 }
    candidate.results.reverse()
    const comparison = compareReports(dataset, baseline, candidate)
    expect(comparison.ok).toBe(true)
    expect(comparison.baseline.counts.passed).toBe(7)
    expect(comparison.candidate.counts.passed).toBe(8)
    expect(comparison.changes[0].gainedCriteria).toEqual([
      'separate-shipping-stages',
    ])
    expect(comparison.regressions).toEqual([])
    expect(comparison.metricDelta).toEqual({
      toolCalls: -1,
      durationMs: -2,
      attempts: 0,
    })
  })

  it('exposes a regression even when the total pass count is unchanged', () => {
    const baseline = observedReport()
    baseline.results[0].rubric[0].verdict = 'fail'
    const candidate = observedReport()
    candidate.results[1].rubric[1].verdict = 'fail'
    const comparison = compareReports(dataset, baseline, candidate)
    expect(comparison.ok).toBe(false)
    expect(comparison.baseline.counts.passed).toBe(
      comparison.candidate.counts.passed,
    )
    expect(comparison.regressions).toEqual([
      expect.objectContaining({
        caseId: 'native-change-needs-binary',
        lostCriteria: ['isolate-runtime'],
      }),
    ])
    expect(comparison.candidate.safetyFailures).toHaveLength(1)
  })

  it('shows per-case tool-cost regressions even when aggregate costs cancel out', () => {
    const baseline = observedReport()
    baseline.results[0].metrics = { toolCalls: 2, durationMs: 4, attempts: 1 }
    const candidate = observedReport()
    candidate.results[1].metrics = { toolCalls: 2, durationMs: 4, attempts: 1 }
    const comparison = compareReports(dataset, baseline, candidate)
    expect(comparison.metricDelta).toEqual({
      toolCalls: 0,
      durationMs: 0,
      attempts: 0,
    })
    expect(comparison.changes[0].metricDelta.toolCalls).toBe(-1)
    expect(comparison.changes[1].metricDelta.toolCalls).toBe(1)
  })

  it('rejects different splits rather than comparing selected favorable cases', () => {
    expect(() =>
      compareReports(
        dataset,
        observedReport('tuning'),
        observedReport('held-out'),
      ),
    ).toThrow(/split\/case selection/)
  })

  it.each(['id', 'model', 'config'] as const)(
    'rejects a mixed %s baseline',
    (field) => {
      const candidate = observedReport()
      if (field === 'config') candidate.agent.config = { temperature: 1 }
      else candidate.agent[field] = 'different'
      expect(() =>
        compareReports(dataset, observedReport(), candidate),
      ).toThrow(/agent, model, and model config/)
    },
  )

  it.each(['baseline', 'candidate'] as const)(
    'rejects incomplete %s coverage',
    (side) => {
      for (const state of ['missing', 'pending', 'blocked', 'unreviewed']) {
        const incomplete = observedReport()
        if (state === 'missing') incomplete.results.pop()
        if (state === 'pending') incomplete.results[0].status = 'pending'
        if (state === 'blocked') {
          incomplete.results[0].status = 'blocked'
          incomplete.results[0].reason = 'Synthetic observation unavailable.'
        }
        if (state === 'unreviewed') incomplete.results[0].review = null
        expect(() =>
          compareReports(
            dataset,
            side === 'baseline' ? incomplete : observedReport(),
            side === 'candidate' ? incomplete : observedReport(),
          ),
        ).toThrow(
          new RegExp(`Incomparable ${side}: complete reviewed coverage`),
        )
      }
    },
  )

  it('rejects mismatched dataset identity even when both reports claim completion', () => {
    const candidate = observedReport()
    candidate.dataset.sha256 = 'f'.repeat(64)
    expect(() => compareReports(dataset, observedReport(), candidate)).toThrow(
      /Dataset identity/,
    )
  })
})

describe('local workflow CLI', () => {
  let files: Map<string, string>
  let output: jest.SpyInstance
  let errors: jest.SpyInstance

  beforeEach(() => {
    files = new Map([['evals/workflows.json', JSON.stringify(dataset)]])
    jest.spyOn(fs, 'readFileSync').mockImplementation((path) => {
      const content = files.get(String(path))
      if (content === undefined) throw new Error('ENOENT')
      return content
    })
    output = jest.spyOn(console, 'log').mockImplementation()
    errors = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => jest.restoreAllMocks())

  it('lists selected cases and emits a pending hand-editable template', () => {
    expect(runCli(['list', '--split', 'held-out'])).toBe(0)
    expect(JSON.parse(output.mock.calls[0][0]).cases).toHaveLength(3)
    output.mockClear()
    expect(runCli(['template'])).toBe(0)
    const report = JSON.parse(output.mock.calls[0][0])
    expect(report.results).toHaveLength(5)
    expect(gradeReport(dataset, report).counts.pending).toBe(5)
    expect(errors).not.toHaveBeenCalled()
  })

  it('supports a local alternate fixture without executing it', () => {
    files.set('fixture.json', JSON.stringify(dataset))
    expect(runCli(['list', '--dataset', 'fixture.json'])).toBe(0)
    expect(JSON.parse(output.mock.calls[0][0]).dataset).toEqual(
      datasetIdentity(dataset),
    )
  })

  it('returns nonzero for pending/blocked/failed coverage and zero for reviewed passes', () => {
    files.set('0', JSON.stringify(createReportTemplate(dataset)))
    expect(runCli(['grade', '-'])).toBe(1)
    const report = observedReport()
    files.set('report.json', JSON.stringify(report))
    expect(runCli(['grade', 'report.json'])).toBe(0)
    report.results[0].status = 'blocked'
    report.results[0].reason = 'Synthetic observation is blocked.'
    files.set('report.json', JSON.stringify(report))
    expect(runCli(['grade', 'report.json'])).toBe(1)
    report.results[0].status = 'completed'
    report.results[0].rubric[0].verdict = 'fail'
    files.set('report.json', JSON.stringify(report))
    expect(runCli(['grade', 'report.json'])).toBe(1)
  })

  it('fails comparisons on regressions and rejects incomplete reports', () => {
    const candidate = observedReport()
    candidate.results[0].rubric[1].verdict = 'fail'
    files.set('baseline.json', JSON.stringify(observedReport()))
    files.set('candidate.json', JSON.stringify(candidate))
    expect(runCli(['compare', 'baseline.json', 'candidate.json'])).toBe(1)
    candidate.results.pop()
    files.set('candidate.json', JSON.stringify(candidate))
    expect(runCli(['compare', 'baseline.json', 'candidate.json'])).toBe(2)
    expect(errors).toHaveBeenLastCalledWith(
      expect.stringContaining('complete reviewed coverage'),
    )
  })

  it('rejects JSON overflow, malformed JSON, and missing files with explicit errors', () => {
    files.set(
      'report.json',
      JSON.stringify(observedReport()).replace(
        '"toolCalls":1',
        '"toolCalls":1e400',
      ),
    )
    expect(runCli(['grade', 'report.json'])).toBe(2)
    expect(errors).toHaveBeenLastCalledWith(
      expect.stringContaining('toolCalls'),
    )
    files.set('report.json', '{broken')
    expect(runCli(['grade', 'report.json'])).toBe(2)
    expect(errors).toHaveBeenLastCalledWith(
      'Workflow evaluation: Invalid JSON: report.json',
    )
    expect(runCli(['grade', 'absent.json'])).toBe(2)
    expect(errors).toHaveBeenLastCalledWith(
      'Workflow evaluation: Cannot read JSON: absent.json',
    )
  })

  it.each([
    [],
    ['unknown'],
    ['grade'],
    ['list', '--split'],
    ['template', '--split', 'unknown'],
    ['list', '--split', 'all', '--split', 'tuning'],
    ['grade', 'report.json', '--split', 'tuning'],
    ['list', '--extra', 'value'],
    ['list', 'extra.json'],
    ['compare', '-', '-'],
  ])('rejects ambiguous/invalid CLI arguments: %j', (...args) => {
    expect(runCli(args)).toBe(2)
    expect(errors).toHaveBeenCalled()
  })

  it('explains the manual-review boundary in help', () => {
    expect(runCli(['--help'])).toBe(0)
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining('Does not run agents'),
    )
  })
})
