import type { compareReleaseFingerprints } from '../release-fingerprints'

const compare = jest.fn<
  ReturnType<typeof compareReleaseFingerprints>,
  Parameters<typeof compareReleaseFingerprints>
>()
const writeOutput = jest.fn()
const resolveBaseline = jest.fn()
const originalEnvironment = process.env
const originalExitCode = process.exitCode
const originalArgv = process.argv
const result = {
  previousCommit: 'a'.repeat(40),
  currentCommit: 'b'.repeat(40),
  previousFingerprint: '{"hash":"base"}',
  currentFingerprint: '{"hash":"head"}',
  diff: '[]',
}

beforeEach(() => {
  jest.resetModules()
  compare.mockReset().mockResolvedValue(result)
  resolveBaseline.mockReset().mockReturnValue({
    base: { commit: result.previousCommit },
    current: { commit: result.currentCommit },
    newRuntime: false,
  })
  writeOutput.mockReset()
  process.exitCode = 0
  process.argv = ['bun', 'scripts/fingerprint-release.ts']
  process.env = {
    ...originalEnvironment,
    BASE_DIRECTORY: '/verified/base',
    BASE_COMMIT: result.previousCommit,
    HISTORY_COMMIT: 'c'.repeat(40),
    CURRENT_COMMIT: result.currentCommit,
    RELEASE_EVENT: 'push',
    GITHUB_OUTPUT: 'fingerprint-output',
  }
  jest.spyOn(console, 'log').mockImplementation()
  jest.spyOn(console, 'error').mockImplementation()
  jest.doMock('../release-fingerprints', () => ({
    compareReleaseFingerprints: compare,
  }))
  jest.doMock('../release-baseline', () => ({
    resolveReleaseBaseline: resolveBaseline,
  }))
  jest.doMock('node:fs', () => ({ appendFileSync: writeOutput }))
})

afterEach(() => {
  process.env = originalEnvironment
  process.exitCode = originalExitCode
  process.argv = originalArgv
  jest.restoreAllMocks()
  jest.resetModules()
})

async function runCli() {
  jest.isolateModules(() => {
    jest.requireActual('../fingerprint-release')
  })
  await new Promise<void>((resolve) => setImmediate(resolve))
}

it('writes the complete detector interface only after comparison succeeds', async () => {
  await runCli()

  expect(resolveBaseline).toHaveBeenCalledWith({
    directory: process.cwd(),
    historyCommit: 'c'.repeat(40),
    currentCommit: result.currentCommit,
    event: 'push',
    expectedBaselineCommit: result.previousCommit,
  })
  expect(compare).toHaveBeenCalledWith({
    base: { directory: '/verified/base', commit: result.previousCommit },
    current: { directory: process.cwd(), commit: result.currentCommit },
  })
  expect(writeOutput).toHaveBeenCalledWith(
    'fingerprint-output',
    `previous-git-commit=${result.previousCommit}\n` +
      `current-git-commit=${result.currentCommit}\n` +
      `previous-fingerprint=${result.previousFingerprint}\n` +
      `current-fingerprint=${result.currentFingerprint}\n` +
      `fingerprint-diff=${result.diff}\n`,
  )
  expect(process.exitCode).toBe(0)
  expect(console.error).not.toHaveBeenCalled()
})

it('resolves the immutable anchor before the workflow checks it out', async () => {
  process.argv.push('--resolve-baseline')
  delete process.env.BASE_COMMIT

  await runCli()

  expect(resolveBaseline).toHaveBeenCalledWith(
    expect.objectContaining({ expectedBaselineCommit: undefined }),
  )
  expect(compare).not.toHaveBeenCalled()
  expect(writeOutput).toHaveBeenCalledWith(
    'fingerprint-output',
    `baseline-commit=${result.previousCommit}\n`,
  )
  expect(process.exitCode).toBe(0)
})

it('never fingerprints or emits outputs for an unverified anchor', async () => {
  resolveBaseline.mockImplementation(() => {
    throw new Error(
      'The fingerprint baseline does not match the immutable runtime anchor.',
    )
  })

  await runCli()

  expect(compare).not.toHaveBeenCalled()
  expect(writeOutput).not.toHaveBeenCalled()
  expect(process.exitCode).toBe(1)
})

it('emits no compatibility output or success message when comparison fails', async () => {
  compare.mockRejectedValue(new Error('Frozen baseline cannot be verified'))

  await runCli()

  expect(writeOutput).not.toHaveBeenCalled()
  expect(console.log).not.toHaveBeenCalled()
  expect(console.error).toHaveBeenCalledWith(
    'Frozen baseline cannot be verified',
  )
  expect(process.exitCode).toBe(1)
})

it('fails visibly if the detector output cannot be written', async () => {
  writeOutput.mockImplementation(() => {
    throw new Error('Output file is not writable')
  })

  await runCli()

  expect(console.log).not.toHaveBeenCalled()
  expect(console.error).toHaveBeenCalledWith('Output file is not writable')
  expect(process.exitCode).toBe(1)
})
