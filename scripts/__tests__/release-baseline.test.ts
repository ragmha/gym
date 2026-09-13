import type { Fingerprint } from '@expo/fingerprint'
import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

import { resolveReleaseBaseline } from '../release-baseline'
import {
  compareReleaseFingerprints,
  RELEASE_FINGERPRINT_VERSION,
} from '../release-fingerprints'
import { evaluateReleaseSafety } from '../release-safety'

jest.mock('node:child_process', () => {
  const actual =
    jest.requireActual<typeof import('node:child_process')>(
      'node:child_process',
    )
  return { ...actual, execFileSync: jest.fn(actual.execFileSync) }
})

const actualExec =
  jest.requireActual<typeof import('node:child_process')>(
    'node:child_process',
  ).execFileSync
const command = jest.mocked(execFileSync)
let root: string
let directory: string
let legacy: string
let accepted: string

function git(cwd: string, ...args: string[]): string {
  return actualExec(
    'git',
    [
      '-c',
      'core.hooksPath=/dev/null',
      '-c',
      'commit.gpgsign=false',
      '-c',
      'user.name=Release fixture',
      '-c',
      'user.email=release-fixture@example.invalid',
      '-C',
      cwd,
      ...args,
    ],
    { encoding: 'utf8', stdio: 'pipe' },
  ).trim()
}

function write(file: string, contents: string): void {
  writeFileSync(path.join(directory, file), contents)
}

function version(value: string, preOTA = false): void {
  write(
    'app.json',
    JSON.stringify({
      expo: {
        version: value,
        ...(preOTA ? {} : { runtimeVersion: { policy: 'appVersion' } }),
      },
    }),
  )
  write(
    'package.json',
    JSON.stringify({
      name: 'release-fixture',
      version: value,
      devDependencies: { '@expo/fingerprint': RELEASE_FINGERPRINT_VERSION },
      overrides: { '@expo/fingerprint': RELEASE_FINGERPRINT_VERSION },
    }),
  )
}

function commit(): string {
  git(directory, 'add', '.')
  git(directory, 'commit', '--quiet', '-m', 'Release fixture')
  return git(directory, 'rev-parse', 'HEAD')
}

function select(
  historyCommit: string,
  event = 'push',
  expectedBaselineCommit?: string,
) {
  return resolveReleaseBaseline({
    directory,
    historyCommit,
    currentCommit: git(directory, 'rev-parse', 'HEAD'),
    event,
    expectedBaselineCommit,
  })
}

function fingerprint(cwd: string): Promise<Fingerprint> {
  const hash = createHash('sha1')
    .update(readFileSync(path.join(cwd, 'native.txt')))
    .digest('hex')
  return Promise.resolve({
    hash,
    sources: [
      { type: 'file', filePath: 'native.txt', reasons: ['fixture'], hash },
    ],
  })
}

async function release(historyCommit: string, event = 'push') {
  const baseline = select(historyCommit, event)
  const baseDirectory = path.join(root, `baseline-${randomUUID()}`)
  git(root, 'clone', '--quiet', '--no-hardlinks', directory, baseDirectory)
  git(baseDirectory, 'checkout', '--quiet', '--detach', baseline.base.commit)
  const detector = await compareReleaseFingerprints(
    {
      base: { directory: baseDirectory, commit: baseline.base.commit },
      current: { directory, commit: baseline.current.commit },
    },
    fingerprint,
  )
  return {
    ...baseline,
    detector,
    decide: () => evaluateReleaseSafety({ ...baseline, detector }),
  }
}

function merge(base: string, branch: string): string {
  const tree = git(directory, 'rev-parse', `${branch}^{tree}`)
  const sha = git(
    directory,
    'commit-tree',
    tree,
    '-p',
    base,
    '-p',
    branch,
    '-m',
    'PR merge fixture',
  )
  git(directory, 'checkout', '--quiet', '--detach', sha)
  return sha
}

beforeEach(() => {
  root = path.resolve('.expo', `release-history-${randomUUID()}`)
  mkdirSync(root, { recursive: true })
  root = realpathSync(root)
  directory = path.join(root, 'current')
  mkdirSync(directory)
  git(directory, 'init', '--quiet', '--initial-branch=main')
  version('1.0.0', true)
  write('bun.lock', 'fixture lock\n')
  write('native.txt', 'native v0\n')
  legacy = commit()
  version('1.0.1')
  write('native.txt', 'native v1\n')
  accepted = commit()
  command
    .mockReset()
    .mockImplementation((file, args, options) =>
      file === 'bun' ? '' : actualExec(file, args, options),
    )
})

afterEach(() => {
  jest.restoreAllMocks()
  rmSync(root, { recursive: true, force: true })
})

describe('immutable runtime namespace anchors', () => {
  it('builds the first isolated runtime, then allows JS updates without a completed build or cache', async () => {
    const initial = await release(legacy)
    expect(initial.base.commit).toBe(accepted)
    expect(initial.newRuntime).toBe(true)
    expect(initial.decide().action).toBe('build')

    write('screen.js', 'const ui = 1\n')
    commit()
    const update = await release(accepted)
    expect(update.base.commit).toBe(accepted)
    expect(update.newRuntime).toBe(false)
    expect(update.decide().action).toBe('update')
    expect(command.mock.calls.filter(([file]) => file === 'bun')).toHaveLength(
      4,
    )
  })

  it.each(['push', 'pull_request'])(
    'does not launder rejected A -> B native changes through a B -> C JS-only %s',
    async (event) => {
      write('native.txt', 'native v2\n')
      const rejected = commit()
      const first = await release(accepted)
      expect(first.base.commit).toBe(accepted)
      expect(() => first.decide()).toThrow(
        'Native changes require a higher app version',
      )

      write('screen.js', 'const ui = 2\n')
      const js = commit()
      if (event === 'pull_request') merge(rejected, js)
      const followup = await release(rejected, event)
      expect(followup.base.commit).toBe(accepted)
      expect(followup.base.commit).not.toBe(rejected)
      expect(() => followup.decide()).toThrow(
        'Native changes require a higher app version',
      )
      expect(() => select(rejected, event, rejected)).toThrow(
        'immutable runtime anchor',
      )
    },
  )

  it('recovers a rejected native merge with a genuinely fresh version and preserves its anchor', async () => {
    write('native.txt', 'native v2\n')
    const rejected = commit()
    version('1.0.2')
    const corrected = commit()
    const initial = await release(rejected)
    expect(initial.base.commit).toBe(corrected)
    expect(initial.decide().action).toBe('build')

    write('screen.js', 'const ui = 3\n')
    commit()
    const followup = await release(corrected)
    expect(followup.base.commit).toBe(corrected)
    expect(followup.decide().action).toBe('update')
  })

  it('allows an intentional native revert only when it restores the original anchor fingerprint', async () => {
    write('native.txt', 'rejected native\n')
    const rejected = commit()
    write('native.txt', 'native v1\n')
    commit()

    const restored = await release(rejected)
    expect(restored.base.commit).toBe(accepted)
    expect(restored.decide().action).toBe('update')
  })

  it('keeps the version high-water across rejected rollbacks and later re-increases', async () => {
    version('1.0.3')
    write('native.txt', 'native v3\n')
    const highest = commit()
    expect((await release(accepted)).decide().action).toBe('build')
    version('1.0.1')
    const rollback = commit()
    expect(() => select(highest)).toThrow('historical high-water 1.0.3')
    write('screen.js', 'const ui = 4\n')
    const js = commit()
    expect(() => select(rollback)).toThrow('historical high-water 1.0.3')
    version('1.0.2')
    const reused = commit()
    expect(() => select(js)).toThrow('historical high-water 1.0.3')
    write('screen.js', 'const ui = 5\n')
    const later = commit()
    expect(() => select(reused)).toThrow('historical high-water 1.0.3')
    version('1.0.3')
    write('native.txt', 'incompatible reuse of v3\n')
    const sameMax = commit()
    const restoredVersion = await release(later)
    expect(restoredVersion.base.commit).toBe(highest)
    expect(() => restoredVersion.decide()).toThrow(
      'Native changes require a higher app version',
    )
    version('1.0.4')
    commit()
    expect((await release(sameMax)).decide().action).toBe('build')
  })

  it.each([false, true])(
    'uses the first introduction inside a multi-commit push (later native drift: %s)',
    async (nativeDrift) => {
      version('1.0.2')
      write('native.txt', 'native v2\n')
      const anchor = commit()
      write('screen.js', 'const ui = 2\n')
      if (nativeDrift) write('native.txt', 'native v3\n')
      commit()

      const pushed = await release(accepted)
      expect(pushed.base.commit).toBe(anchor)
      expect(pushed.newRuntime).toBe(true)
      if (nativeDrift) {
        expect(() => pushed.decide()).toThrow(
          'Native changes require a higher app version',
        )
      } else {
        expect(pushed.decide().action).toBe('build')
        expect((await release(anchor)).decide().action).toBe('update')
      }
    },
  )

  it('never trusts a concurrent feature branch version bump as the main/PR-base anchor', async () => {
    git(directory, 'checkout', '--quiet', '-b', 'second-pr')
    version('1.0.2')
    write('native.txt', 'second PR native\n')
    const secondPR = commit()
    merge(accepted, secondPR)
    const freshPreview = await release(accepted, 'pull_request')
    expect(freshPreview.base.commit).toBe(freshPreview.current.commit)
    expect(freshPreview.decide().action).toBe('build')

    git(directory, 'checkout', '--quiet', 'main')
    version('1.0.2')
    write('native.txt', 'first PR native\n')
    const mainAnchor = commit()
    expect((await release(accepted)).decide().action).toBe('build')
    const merged = merge(mainAnchor, secondPR)

    for (const event of ['pull_request', 'push']) {
      const concurrent = await release(mainAnchor, event)
      expect(concurrent.base.commit).toBe(mainAnchor)
      expect(concurrent.base.commit).not.toBe(secondPR)
      expect(() => concurrent.decide()).toThrow(
        'Native changes require a higher app version',
      )
    }
    expect(() => select(accepted, 'pull_request')).toThrow(
      'event base as its first parent',
    )
    expect(() => select(secondPR)).toThrow('first-parent history')
    write('screen.js', 'const ui = 6\n')
    commit()
    const later = await release(merged)
    expect(later.base.commit).toBe(mainAnchor)
    expect(() => later.decide()).toThrow(
      'Native changes require a higher app version',
    )
  })

  it('does not promote a legacy version into an anchor when appVersion policy is first enabled', () => {
    git(directory, 'checkout', '--quiet', '--detach', legacy)
    version('1.0.0')
    const reused = commit()
    expect(() => select(legacy)).toThrow('No isolated anchor')
    write('screen.js', 'const ui = 7\n')
    commit()
    expect(() => select(reused)).toThrow('No isolated anchor')
  })
})

describe('unprovable history fails closed', () => {
  it.each(['', 'main', '0'.repeat(40), 'f'.repeat(40)])(
    'blocks an invalid or missing event reference: %s',
    (ref) => expect(() => select(ref)).toThrow(),
  )

  it('blocks an unsupported release event or a PR head instead of its tested merge', () => {
    write('screen.js', 'const ui = 8\n')
    commit()
    expect(() => select(accepted, 'workflow_dispatch')).toThrow(
      'Only main pushes',
    )
    expect(() => select(accepted, 'pull_request')).toThrow('PR merge revision')
  })

  it('blocks a shallow checkout even when the requested commits are present', () => {
    write('screen.js', 'const ui = 9\n')
    commit()
    writeFileSync(path.join(directory, '.git/shallow'), `${accepted}\n`)
    expect(() => select(accepted)).toThrow('Complete first-parent history')
  })

  it('blocks dirty manifests and a wrong release checkout', () => {
    version('1.0.2')
    expect(() => select(legacy)).toThrow()
    expect(() =>
      resolveReleaseBaseline({
        directory,
        historyCommit: legacy,
        currentCommit: legacy,
        event: 'push',
      }),
    ).toThrow('checkout must match')
  })

  it.each([
    ['missing app.json', () => unlinkSync(path.join(directory, 'app.json'))],
    ['malformed JSON', () => write('app.json', '{')],
    [
      'package version mismatch',
      () => write('package.json', '{"version":"9.0.0"}'),
    ],
    ['missing runtime policy after adoption', () => version('1.0.2', true)],
    [
      'unknown runtime policy',
      () =>
        write(
          'app.json',
          '{"expo":{"version":"1.0.2","runtimeVersion":{"policy":"fingerprint"}}}',
        ),
    ],
    [
      'platform override',
      () =>
        write(
          'app.json',
          '{"expo":{"version":"1.0.2","runtimeVersion":{"policy":"appVersion"},"ios":{"runtimeVersion":"8.0.0"}}}',
        ),
    ],
    [
      'alternate config',
      () =>
        write(
          'APP.CONFIG.future',
          'throw new Error("must not execute historical config")',
        ),
    ],
  ] as const)(
    'does not hide %s in older history behind a new version',
    (_name, corrupt) => {
      corrupt()
      const invalid = commit()
      version('10.0.0')
      if (existsSync(path.join(directory, 'APP.CONFIG.future')))
        unlinkSync(path.join(directory, 'APP.CONFIG.future'))
      commit()

      expect(() => select(invalid)).toThrow()
      expect(
        command.mock.calls.filter(([file]) => file === 'bun'),
      ).toHaveLength(0)
    },
  )

  it('reserves only the explicit pre-OTA legacy prefix, not alternate legacy runtime settings', () => {
    git(directory, 'checkout', '--quiet', '--detach', legacy)
    write('app.json', '{"expo":{"version":"1.0.0","sdkVersion":"1.0.2"}}')
    const unknown = commit()
    version('1.0.2')
    commit()
    expect(() => select(unknown)).toThrow('appVersion runtime')
  })

  it('rejects an untracked alternate config before computing any baseline', () => {
    write('screen.js', 'const ui = 10\n')
    commit()
    write('app.config.mts', 'throw new Error("must not execute config")')
    expect(() => select(accepted)).toThrow('Only app.json')
  })
})

it('the real selection and decision CLIs bind evidence to the anchor, not a rejected event tip', async () => {
  write('native.txt', 'rejected native\n')
  const rejected = commit()
  write('screen.js', 'const ui = 11\n')
  const current = commit()
  const candidate = await release(rejected)
  const environment = {
    ...process.env,
    HISTORY_COMMIT: rejected,
    CURRENT_COMMIT: current,
    RELEASE_EVENT: 'push',
    BASE_COMMIT: accepted,
    FINGERPRINT_BASE_COMMIT: candidate.detector.previousCommit,
    FINGERPRINT_CURRENT_COMMIT: candidate.detector.currentCommit,
    PREVIOUS_FINGERPRINT: candidate.detector.previousFingerprint,
    CURRENT_FINGERPRINT: candidate.detector.currentFingerprint,
    FINGERPRINT_DIFF: candidate.detector.diff,
    GITHUB_OUTPUT: path.join(root, 'cli-output'),
  }
  actualExec(
    'bun',
    [
      path.resolve(__dirname, '../fingerprint-release.ts'),
      '--resolve-baseline',
    ],
    {
      cwd: directory,
      env: environment,
      stdio: 'pipe',
    },
  )
  expect(readFileSync(environment.GITHUB_OUTPUT, 'utf8')).toBe(
    `baseline-commit=${accepted}\n`,
  )
  unlinkSync(environment.GITHUB_OUTPUT)

  const check = (env: typeof environment) =>
    actualExec('bun', [path.resolve(__dirname, '../check-release-safety.ts')], {
      cwd: directory,
      env,
      stdio: 'pipe',
    })
  expect(() => check(environment)).toThrow(
    'Native changes require a higher app version',
  )
  expect(existsSync(environment.GITHUB_OUTPUT)).toBe(false)
  expect(() =>
    check({
      ...environment,
      BASE_COMMIT: rejected,
      FINGERPRINT_BASE_COMMIT: rejected,
      PREVIOUS_FINGERPRINT: candidate.detector.currentFingerprint,
      FINGERPRINT_DIFF: '[]',
    }),
  ).toThrow('immutable runtime anchor')
  expect(existsSync(environment.GITHUB_OUTPUT)).toBe(false)

  version('1.0.2')
  const corrected = commit()
  const safe = await release(current)
  check({
    ...environment,
    HISTORY_COMMIT: current,
    CURRENT_COMMIT: corrected,
    BASE_COMMIT: corrected,
    FINGERPRINT_BASE_COMMIT: corrected,
    FINGERPRINT_CURRENT_COMMIT: corrected,
    PREVIOUS_FINGERPRINT: safe.detector.previousFingerprint,
    CURRENT_FINGERPRINT: safe.detector.currentFingerprint,
    FINGERPRINT_DIFF: safe.detector.diff,
  })
  expect(readFileSync(environment.GITHUB_OUTPUT, 'utf8')).toBe(
    'action=build\nruntime-version=1.0.2\n',
  )
})
