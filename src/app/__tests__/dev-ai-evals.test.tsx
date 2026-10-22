import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import { Redirect } from 'expo-router'
import { AppState, Platform, Share } from 'react-native'

import DevAiEvalsRoute from '@/app/dev-ai-evals'
import { AI_EVALUATION_FIXTURES } from '@/lib/coach/evaluationFixtures'
import {
  inspectEvaluationEnvironment,
  startSyntheticEvaluation,
  type EvaluationEnvironment,
  type EvaluationReport,
} from '@/lib/coach/evaluations'

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
}))
jest.mock('@react-navigation/native', () => ({
  useTheme: () => ({ dark: false }),
}))
jest.mock('@/lib/coach/evaluations', () => ({
  inspectEvaluationEnvironment: jest.fn(),
  startSyntheticEvaluation: jest.fn(),
  evaluationAvailabilityReason: (availability: string) =>
    availability === 'available'
      ? 'Apple Foundation Models reports available.'
      : 'This platform or device is blocked. No mock engine is used.',
  SEMANTIC_REVIEW_RUBRIC: [
    'Human review of factual and health claims is required.',
  ],
}))

const inspect = jest.mocked(inspectEvaluationEnvironment)
const start = jest.mocked(startSyntheticEvaluation)
const originalPlatform = Platform.OS
const originalDev = __DEV__
const info: EvaluationEnvironment = {
  platform: 'ios',
  osVersion: '26.0',
  nativeAppVersion: '1.0.19',
  nativeBuildVersion: '2',
  engine: 'apple-fm',
  availability: 'available',
  modelVersion: null,
}

function completedReport(): EvaluationReport {
  return {
    format: 'gym-synthetic-ai-eval-v1',
    syntheticOnly: true,
    split: 'tuning',
    status: 'completed',
    reason: null,
    startedAt: '2026-10-21T12:00:00.000Z',
    finishedAt: '2026-10-21T12:00:01.000Z',
    elapsedMs: 1000,
    environment: info,
    semanticReview: 'required',
    semanticRubric: [
      'Compare every asserted measurement with the synthetic input; unknown is not zero.',
      'Without recovery, check acknowledgement of missing data and no training-readiness assessment.',
      'Review helpfulness, concision, and supportive wording in context.',
      'Check for unsupported health claims or medically authoritative advice.',
      'Meal nutrition accuracy needs measured ground truth; these label fixtures cannot establish it.',
    ],
    cases: [
      {
        id: 'insight-populated',
        split: 'tuning',
        input: AI_EVALUATION_FIXTURES[0],
        productionPrompt: {
          source:
            'src/lib/coach/prompts/dailyInsight.ts#buildDailyInsightPrompt',
          schemaSource: 'src/lib/validators/coach.ts#coachInsightSchema',
          system: 'Plumbing test prompt, not a model evaluation.',
          prompt: 'Synthetic metrics',
        },
        status: 'completed',
        output:
          '{"headline":"A steady day","body":"Synthetic output","suggestion":"Review inputs","tone":"steady"}',
        outputTruncated: false,
        objective: 'pass',
        checks: [
          {
            id: 'production-schema',
            passed: true,
            detail: 'Mechanical schema check only.',
          },
        ],
        elapsedMs: 1000,
        semanticReview: 'required',
      },
    ],
  }
}

function pendingJob() {
  let resolve!: (report: EvaluationReport) => void
  const done = new Promise<EvaluationReport>((settle) => {
    resolve = settle
  })
  const stop = jest.fn()
  return { done, stop, resolve }
}

beforeEach(() => {
  jest.clearAllMocks()
  Object.defineProperty(globalThis, '__DEV__', {
    value: true,
    configurable: true,
  })
  Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true })
  inspect.mockReset().mockResolvedValue(info)
  start.mockReset().mockImplementation(() => ({
    done: Promise.resolve(completedReport()),
    stop: jest.fn(),
  }))
  jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction })
})

afterEach(() => {
  jest.restoreAllMocks()
  Object.defineProperty(globalThis, '__DEV__', {
    value: originalDev,
    configurable: true,
  })
  Object.defineProperty(Platform, 'OS', {
    value: originalPlatform,
    configurable: true,
  })
})

describe('hidden dev AI evaluation route (plumbing only)', () => {
  it('redirects in production without mounting the panel or probing the engine', () => {
    Object.defineProperty(globalThis, '__DEV__', { value: false })
    const screen = render(<DevAiEvalsRoute />)
    expect(Redirect).toHaveBeenCalledWith({ href: '/' }, undefined)
    expect(screen.queryByText('Synthetic AI evaluations')).toBeNull()
    expect(inspect).not.toHaveBeenCalled()
    expect(start).not.toHaveBeenCalled()
  })

  it.each(['web', 'android', 'ios'] as const)(
    'shows an honest blocked state on unavailable %s, with no generation',
    async (platform) => {
      Object.defineProperty(Platform, 'OS', { value: platform })
      inspect.mockResolvedValue({
        ...info,
        platform,
        availability:
          platform === 'ios' ? 'device-unsupported' : 'platform-unsupported',
      })
      const screen = render(<DevAiEvalsRoute />)
      await waitFor(() => expect(screen.getByText('BLOCKED')).toBeTruthy())
      expect(
        screen.getByText(
          'This platform or device is blocked. No mock engine is used.',
        ),
      ).toBeTruthy()
      const run = screen.getByRole('button', { name: 'Run tuning evaluations' })
      expect(run).toBeDisabled()
      expect(
        screen.queryByRole('button', { name: 'Check availability again' }),
      ).toBeNull()
      fireEvent.press(run)
      expect(start).not.toHaveBeenCalled()
      expect(Share.share).not.toHaveBeenCalled()
    },
  )

  it.each(['ai-disabled', 'model-not-ready', 'check-failed'] as const)(
    'rechecks %s on an explicit tap and enables Run without generating',
    async (availability) => {
      inspect.mockResolvedValueOnce({ ...info, availability })
      const screen = render(<DevAiEvalsRoute />)
      await waitFor(() => expect(screen.getByText('BLOCKED')).toBeTruthy())
      expect(
        screen.getByRole('button', { name: 'Run tuning evaluations' }),
      ).toBeDisabled()

      fireEvent.press(
        screen.getByRole('button', { name: 'Check availability again' }),
      )
      await waitFor(() => expect(screen.getByText('READY')).toBeTruthy())
      expect(inspect).toHaveBeenCalledTimes(2)
      expect(
        screen.getByRole('button', { name: 'Run tuning evaluations' }),
      ).toBeEnabled()
      expect(
        screen.queryByRole('button', { name: 'Check availability again' }),
      ).toBeNull()
      expect(start).not.toHaveBeenCalled()
    },
  )

  it('rechecks availability when the app returns to the foreground', async () => {
    const remove = jest.fn()
    const listen = jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({ remove })
    inspect.mockResolvedValueOnce({ ...info, availability: 'ai-disabled' })
    const screen = render(<DevAiEvalsRoute />)
    await waitFor(() => expect(screen.getByText('BLOCKED')).toBeTruthy())
    const onChange = listen.mock.calls[0][1]

    act(() => onChange('background'))
    expect(inspect).toHaveBeenCalledTimes(1)
    act(() => onChange('active'))
    await waitFor(() => expect(screen.getByText('READY')).toBeTruthy())
    expect(inspect).toHaveBeenCalledTimes(2)
    expect(start).not.toHaveBeenCalled()

    screen.unmount()
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('does not recheck availability while an evaluation is running', async () => {
    const pending = pendingJob()
    start.mockReturnValue(pending)
    const listen = jest.spyOn(AppState, 'addEventListener')
    const screen = render(<DevAiEvalsRoute />)
    await waitFor(() => expect(screen.getByText('READY')).toBeTruthy())
    fireEvent.press(
      screen.getByRole('button', { name: 'Run tuning evaluations' }),
    )
    act(() => listen.mock.calls[0][1]('active'))
    expect(inspect).toHaveBeenCalledTimes(1)
    await act(async () => {
      pending.resolve(completedReport())
      await pending.done
    })
  })

  it('probes availability without generating, then runs the explicitly selected split with a double-start guard', async () => {
    const pending = pendingJob()
    start.mockReturnValue(pending)
    const screen = render(<DevAiEvalsRoute />)
    await waitFor(() => expect(screen.getByText('READY')).toBeTruthy())
    expect(start).not.toHaveBeenCalled()
    expect(screen.getByText(/Native app 1.0.19/)).toBeTruthy()
    fireEvent.press(screen.getByRole('radio', { name: 'held-out cases' }))
    const run = screen.getByRole('button', { name: 'Run held-out evaluations' })
    act(() => {
      fireEvent.press(run)
      fireEvent.press(run)
    })
    expect(start).toHaveBeenCalledTimes(1)
    expect(start).toHaveBeenCalledWith('held-out', expect.any(Function))
    expect(
      screen.getByRole('button', { name: 'Run held-out evaluations' }),
    ).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'tuning cases' })).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: 'Share synthetic JSON' }),
    ).toBeNull()
    fireEvent.press(
      screen.getByRole('button', { name: 'Stop after current request' }),
    )
    expect(pending.stop).toHaveBeenCalledTimes(1)
    await act(async () => {
      pending.resolve({
        ...completedReport(),
        split: 'held-out',
        status: 'cancelled',
      })
      await pending.done
    })
    expect(screen.getByText('CANCELLED')).toBeTruthy()
  })

  it('shows case, split, output, objective result, elapsed time, and mandatory human review', async () => {
    const screen = render(<DevAiEvalsRoute />)
    await waitFor(() => expect(screen.getByText('READY')).toBeTruthy())
    fireEvent.press(
      screen.getByRole('button', { name: 'Run tuning evaluations' }),
    )
    await waitFor(() => expect(screen.getByText('COMPLETED')).toBeTruthy())
    expect(screen.getByText('insight-populated')).toBeTruthy()
    expect(screen.getByText('tuning · completed · 1000 ms')).toBeTruthy()
    expect(
      screen.getByText('Objective checks: PASS · Semantic review: REQUIRED'),
    ).toBeTruthy()
    expect(screen.getByText(/"headline":"A steady day"/)).toBeTruthy()
    expect(screen.getByText('Semantic review needed — always')).toBeTruthy()
    expect(
      screen.getByText(/never a full model-quality or health-safety pass/),
    ).toBeTruthy()
    expect(Share.share).not.toHaveBeenCalled()

    fireEvent.press(screen.getByRole('button', { name: 'Show JSON' }))
    expect(
      screen.getByText(/"format": "gym-synthetic-ai-eval-v1"/),
    ).toBeTruthy()
    expect(Share.share).not.toHaveBeenCalled()
    fireEvent.press(
      screen.getByRole('button', { name: 'Share synthetic JSON' }),
    )
    await waitFor(() =>
      expect(Share.share).toHaveBeenCalledWith({
        title: 'Synthetic AI evaluation',
        message: JSON.stringify(completedReport(), null, 2),
      }),
    )
  })

  it('handles share failure without auto-exporting or losing the inspectable report', async () => {
    jest.mocked(Share.share).mockRejectedValue(new Error('share failure'))
    const screen = render(<DevAiEvalsRoute />)
    await waitFor(() => expect(screen.getByText('READY')).toBeTruthy())
    fireEvent.press(
      screen.getByRole('button', { name: 'Run tuning evaluations' }),
    )
    await waitFor(() => expect(screen.getByText('COMPLETED')).toBeTruthy())
    fireEvent.press(
      screen.getByRole('button', { name: 'Share synthetic JSON' }),
    )
    await waitFor(() =>
      expect(screen.getByText(/The share sheet could not open/)).toBeTruthy(),
    )
    expect(screen.getByRole('button', { name: 'Show JSON' })).toBeEnabled()
    expect(Share.share).toHaveBeenCalledTimes(1)
  })

  it('shows generation errors and unrun cases without presenting a success', async () => {
    const failed = completedReport()
    failed.status = 'error'
    failed.reason =
      'Generation failed. Restart the app before another evaluation.'
    failed.cases[0] = {
      ...failed.cases[0],
      status: 'error',
      objective: 'not-run',
      output: null,
      checks: [],
    }
    start.mockReturnValue({ done: Promise.resolve(failed), stop: jest.fn() })
    const screen = render(<DevAiEvalsRoute />)
    await waitFor(() => expect(screen.getByText('READY')).toBeTruthy())
    fireEvent.press(
      screen.getByRole('button', { name: 'Run tuning evaluations' }),
    )
    await waitFor(() => expect(screen.getByText('ERROR')).toBeTruthy())
    expect(screen.getByText(failed.reason)).toBeTruthy()
    expect(screen.getByText('No output.')).toBeTruthy()
    expect(
      screen.getByText('Objective checks: NOT-RUN · Semantic review: REQUIRED'),
    ).toBeTruthy()
    expect(screen.queryByText('COMPLETED')).toBeNull()
  })

  it('allows retry after a previous screen is still draining without inventing an availability check', async () => {
    const blocked = {
      ...completedReport(),
      status: 'blocked' as const,
      environment: { ...info, availability: 'not-checked' as const },
      reason: 'Another evaluation is still running or stopping.',
      cases: [],
    }
    start.mockReturnValueOnce({
      done: Promise.resolve(blocked),
      stop: jest.fn(),
    })
    const screen = render(<DevAiEvalsRoute />)
    await waitFor(() => expect(screen.getByText('READY')).toBeTruthy())
    fireEvent.press(
      screen.getByRole('button', { name: 'Run tuning evaluations' }),
    )
    await waitFor(() => expect(screen.getByText('BLOCKED')).toBeTruthy())
    expect(
      screen.getByRole('button', { name: 'Run tuning evaluations' }),
    ).toBeEnabled()
    expect(screen.getByText(blocked.reason)).toBeTruthy()
  })

  it('stops on unmount without claiming native cancellation or starting another case', async () => {
    const pending = pendingJob()
    start.mockReturnValue(pending)
    const screen = render(<DevAiEvalsRoute />)
    await waitFor(() => expect(screen.getByText('READY')).toBeTruthy())
    fireEvent.press(
      screen.getByRole('button', { name: 'Run tuning evaluations' }),
    )
    screen.unmount()
    expect(pending.stop).toHaveBeenCalledTimes(1)
    await act(async () => {
      pending.resolve(completedReport())
      await pending.done
    })
    expect(start).toHaveBeenCalledTimes(1)
    expect(Share.share).not.toHaveBeenCalled()
  })
})
