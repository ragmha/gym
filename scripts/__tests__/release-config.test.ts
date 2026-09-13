const baseCommit = 'a'.repeat(40)
const currentCommit = 'b'.repeat(40)
const fingerprint = JSON.stringify({
  hash: 'c'.repeat(40),
  sources: [
    {
      type: 'dir',
      filePath: 'node_modules/react-native',
      hash: 'c'.repeat(40),
    },
  ],
})
const appConfig = JSON.stringify({
  expo: { version: '1.0.1', runtimeVersion: { policy: 'appVersion' } },
})
const packageConfig = JSON.stringify({ version: '1.0.1' })
const alternateConfigs = [
  'app.config.ts',
  'app.config.mts',
  'app.config.cts',
  'app.config.mjs',
  'app.config.cjs',
  'app.config.js',
  'app.config.json',
]

const originalEnvironment = process.env
const originalExitCode = process.exitCode
let files: Record<'base' | 'current' | 'worktree', string[]>
const writeOutput = jest.fn()

beforeEach(() => {
  jest.resetModules()
  writeOutput.mockClear()
  files = {
    base: ['app.json', 'package.json'],
    current: ['app.json', 'package.json'],
    worktree: ['app.json', 'package.json'],
  }
  process.env = {
    ...originalEnvironment,
    HISTORY_COMMIT: baseCommit,
    BASE_COMMIT: baseCommit,
    CURRENT_COMMIT: currentCommit,
    RELEASE_EVENT: 'push',
    FINGERPRINT_BASE_COMMIT: baseCommit,
    FINGERPRINT_CURRENT_COMMIT: currentCommit,
    PREVIOUS_FINGERPRINT: fingerprint,
    CURRENT_FINGERPRINT: fingerprint,
    FINGERPRINT_DIFF: '[]',
    GITHUB_OUTPUT: 'release-output',
  }
  process.exitCode = 0
  jest.spyOn(console, 'log').mockImplementation()
  jest.spyOn(console, 'error').mockImplementation()
  jest.doMock('node:child_process', () => ({
    execFileSync: (_command: string, commandArgs: string[]) => {
      const args = commandArgs.slice(4)
      switch (args[0]) {
        case 'rev-parse':
          if (args[1] === '--show-toplevel') return process.cwd()
          if (args[1] === '--is-shallow-repository') return 'false'
          return currentCommit
        case 'rev-list':
          return `${baseCommit}\n${currentCommit}`
        case 'merge-base':
        case 'diff':
          return ''
        case 'ls-tree':
          return (args[2] === baseCommit ? files.base : files.current)
            .map((file) => `100644 blob ${'c'.repeat(40)}\t${file}\0`)
            .join('')
        case 'show':
          if (args[1].endsWith(':app.json')) return appConfig
          if (args[1].endsWith(':package.json')) return packageConfig
          break
      }
      throw new Error(`Unexpected Git operation: ${args.join(' ')}`)
    },
  }))
  jest.doMock('node:fs', () => ({
    appendFileSync: writeOutput,
    existsSync: (file: string) => files.worktree.includes(file),
    realpathSync: (file: string) => file,
    readdirSync: () => files.worktree,
    readFileSync: (file: string) => {
      if (file.endsWith('/app.json')) return appConfig
      if (file.endsWith('/package.json')) return packageConfig
      throw new Error(`Unexpected config read: ${file}`)
    },
  }))
})

afterEach(() => {
  process.env = originalEnvironment
  process.exitCode = originalExitCode
  jest.restoreAllMocks()
  jest.resetModules()
})

function runCheck() {
  jest.isolateModules(() => {
    jest.requireActual('../check-release-safety')
  })
}

function expectBlocked() {
  runCheck()
  expect(process.exitCode).toBe(1)
  expect(writeOutput).not.toHaveBeenCalled()
  expect(console.error).toHaveBeenCalledWith(
    expect.stringContaining('Only app.json'),
  )
}

describe('release CLI configuration boundary', () => {
  it('allows a verified static app.json-only release', () => {
    runCheck()

    expect(process.exitCode).toBe(0)
    expect(writeOutput).toHaveBeenCalledWith(
      'release-output',
      'action=update\nruntime-version=1.0.1\n',
    )
    expect(console.error).not.toHaveBeenCalled()
  })

  it.each(alternateConfigs)('rejects %s in the base revision', (alternate) => {
    files.base.push(alternate)
    expectBlocked()
  })

  it.each(alternateConfigs)(
    'rejects %s in the release revision even when absent from disk',
    (alternate) => {
      files.current.push(alternate)
      expectBlocked()
    },
  )

  it.each(alternateConfigs)(
    'rejects untracked %s in the working directory',
    (alternate) => {
      files.worktree.push(alternate)
      expectBlocked()
    },
  )

  it('reserves the alternate config namespace across casing and new formats', () => {
    files.worktree.push('APP.CONFIG.future')
    expectBlocked()
  })
})
