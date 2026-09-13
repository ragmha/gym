import type { Fingerprint, Options } from '@expo/fingerprint'
import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import {
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

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

const actualExecFileSync =
  jest.requireActual<typeof import('node:child_process')>(
    'node:child_process',
  ).execFileSync
const command = jest.mocked(execFileSync)
let root: string
let base: { directory: string; commit: string }
let current: { directory: string; commit: string }

function git(directory: string, ...args: string[]): string {
  return actualExecFileSync(
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
      directory,
      ...args,
    ],
    { encoding: 'utf8', stdio: 'pipe' },
  ).trim()
}

function commitCurrent(): void {
  git(current.directory, 'add', '.')
  git(current.directory, 'commit', '--quiet', '-m', 'Update test fixture')
  current.commit = git(current.directory, 'rev-parse', 'HEAD')
}

function fingerprintFixture(
  directory: string,
  _options: Options,
): Promise<Fingerprint> {
  const hash = createHash('sha1')
    .update(readFileSync(path.join(directory, 'native.txt')))
    .digest('hex')
  return Promise.resolve({
    hash,
    sources: [
      {
        type: 'file',
        filePath: 'native.txt',
        reasons: ['fixture native input'],
        hash,
      },
    ],
  })
}

function releaseDecision(
  result: Awaited<ReturnType<typeof compareReleaseFingerprints>>,
) {
  const revision = ({ directory, commit }: typeof current) => ({
    commit,
    appConfig: JSON.parse(
      readFileSync(path.join(directory, 'app.json'), 'utf8'),
    ),
    packageVersion: JSON.parse(
      readFileSync(path.join(directory, 'package.json'), 'utf8'),
    ).version,
  })
  return evaluateReleaseSafety({
    base: revision(base),
    current: revision(current),
    detector: result,
  })
}

beforeEach(() => {
  // All Git writes stay inside a new disposable fixture, never the user checkout.
  root = path.resolve('.expo', `gym-fingerprints-${randomUUID()}`)
  mkdirSync(root, { recursive: true })
  root = realpathSync(root)
  current = { directory: path.join(root, 'current'), commit: '' }
  mkdirSync(current.directory)
  git(current.directory, 'init', '--quiet')
  writeFileSync(
    path.join(current.directory, 'package.json'),
    JSON.stringify({
      name: 'release-fixture',
      version: '1.0.1',
      devDependencies: {
        '@expo/fingerprint': RELEASE_FINGERPRINT_VERSION,
      },
      overrides: { '@expo/fingerprint': RELEASE_FINGERPRINT_VERSION },
    }),
  )
  writeFileSync(
    path.join(current.directory, 'app.json'),
    JSON.stringify({
      expo: { version: '1.0.1', runtimeVersion: { policy: 'appVersion' } },
    }),
  )
  writeFileSync(path.join(current.directory, 'bun.lock'), 'fixture lock\n')
  writeFileSync(path.join(current.directory, 'native.txt'), 'native v1\n')
  commitCurrent()
  base = { directory: path.join(root, 'base'), commit: current.commit }
  git(
    root,
    'clone',
    '--quiet',
    '--no-hardlinks',
    current.directory,
    base.directory,
  )
  writeFileSync(path.join(current.directory, 'screen.js'), 'const ui = 2\n')
  commitCurrent()

  command.mockReset()
  command.mockImplementation((file, args, options) =>
    file === 'bun' ? '' : actualExecFileSync(file, args, options),
  )
})

afterEach(() => {
  jest.restoreAllMocks()
  rmSync(root, { recursive: true, force: true })
})

describe('cache-independent release fingerprints', () => {
  it('reconstructs a missing baseline and allows a verified JS-only update', async () => {
    const fingerprint = jest.fn(fingerprintFixture)

    const result = await compareReleaseFingerprints(
      { base, current },
      fingerprint,
    )

    expect(releaseDecision(result).action).toBe('update')
    expect(result.previousCommit).toBe(base.commit)
    expect(result.currentCommit).toBe(current.commit)
    expect(fingerprint.mock.calls.map(([directory]) => directory)).toEqual([
      base.directory,
      current.directory,
    ])
    expect(fingerprint.mock.calls.map(([, options]) => options)).toEqual([
      expect.objectContaining({
        hashAlgorithm: 'sha1',
        platforms: ['android', 'ios'],
        ignorePaths: ['.expo/**'],
      }),
      fingerprint.mock.calls[0][1],
    ])
    expect(command.mock.calls.filter(([file]) => file === 'bun')).toEqual(
      [base.directory, current.directory].map((directory) => [
        'bun',
        ['install', '--frozen-lockfile'],
        expect.objectContaining({
          cwd: directory,
          env: expect.objectContaining({ CI: '1', HUSKY: '0' }),
        }),
      ]),
    )
  })

  it('recomputes both sides on every run instead of relying on a cached head', async () => {
    const fingerprint = jest.fn(fingerprintFixture)
    const first = await compareReleaseFingerprints(
      { base, current },
      fingerprint,
    )
    const second = await compareReleaseFingerprints(
      { base, current },
      fingerprint,
    )

    expect(second).toEqual(first)
    expect(fingerprint).toHaveBeenCalledTimes(4)
    expect(command.mock.calls.filter(([file]) => file === 'bun')).toHaveLength(
      4,
    )
  })

  it('rejects a native change that reuses the same runtime after cold recovery', async () => {
    writeFileSync(path.join(current.directory, 'native.txt'), 'native v2\n')
    commitCurrent()
    const result = await compareReleaseFingerprints(
      { base, current },
      fingerprintFixture,
    )

    expect(() => releaseDecision(result)).toThrow()
  })

  it('requires a build for an isolated native change after cold recovery', async () => {
    writeFileSync(path.join(current.directory, 'native.txt'), 'native v2\n')
    for (const file of ['package.json', 'app.json']) {
      const filename = path.join(current.directory, file)
      writeFileSync(
        filename,
        readFileSync(filename, 'utf8').replace('1.0.1', '1.0.2'),
      )
    }
    commitCurrent()
    const result = await compareReleaseFingerprints(
      { base, current },
      fingerprintFixture,
    )

    expect(releaseDecision(result).action).toBe('build')
  })

  it('blocks a missing committed lockfile before installing or hashing', async () => {
    unlinkSync(path.join(current.directory, 'bun.lock'))
    commitCurrent()
    const fingerprint = jest.fn(fingerprintFixture)

    await expect(
      compareReleaseFingerprints({ base, current }, fingerprint),
    ).rejects.toThrow()
    expect(fingerprint).not.toHaveBeenCalled()
    expect(command.mock.calls.filter(([file]) => file === 'bun')).toHaveLength(
      0,
    )
  })

  it('blocks dirty checkouts rather than fingerprinting uncommitted inputs', async () => {
    writeFileSync(path.join(base.directory, 'native.txt'), 'uncommitted\n')
    const fingerprint = jest.fn(fingerprintFixture)

    await expect(
      compareReleaseFingerprints({ base, current }, fingerprint),
    ).rejects.toThrow()
    expect(fingerprint).not.toHaveBeenCalled()
  })

  it('rejects a checkout whose HEAD is not the declared commit', async () => {
    const fingerprint = jest.fn(fingerprintFixture)

    await expect(
      compareReleaseFingerprints(
        { base, current: { ...current, commit: 'f'.repeat(40) } },
        fingerprint,
      ),
    ).rejects.toThrow()
    expect(fingerprint).not.toHaveBeenCalled()
  })

  it('requires separate checkouts with verified HEADs even for a new-runtime anchor', async () => {
    await expect(
      compareReleaseFingerprints(
        { base: current, current },
        fingerprintFixture,
      ),
    ).rejects.toThrow('separate checkouts')
    await expect(
      compareReleaseFingerprints(
        { base, current: { ...current, commit: base.commit } },
        fingerprintFixture,
      ),
    ).rejects.toThrow('checkout does not match')
  })

  it('requires the baseline to be an ancestor of the release', async () => {
    await expect(
      compareReleaseFingerprints(
        { base: current, current: base },
        fingerprintFixture,
      ),
    ).rejects.toThrow()
    expect(command.mock.calls.filter(([file]) => file === 'bun')).toHaveLength(
      0,
    )
  })

  it('blocks failed frozen installs without generating fingerprints', async () => {
    command.mockImplementation((file, args, options) => {
      if (file === 'bun') throw new Error('Frozen dependency install failed')
      return actualExecFileSync(file, args, options)
    })
    const fingerprint = jest.fn(fingerprintFixture)

    await expect(
      compareReleaseFingerprints({ base, current }, fingerprint),
    ).rejects.toThrow('Frozen dependency install failed')
    expect(fingerprint).not.toHaveBeenCalled()
  })

  it('blocks an install that mutates a committed input', async () => {
    command.mockImplementation((file, args, options) => {
      if (file === 'bun') {
        writeFileSync(path.join(base.directory, 'bun.lock'), 'changed lock\n')
        return ''
      }
      return actualExecFileSync(file, args, options)
    })
    const fingerprint = jest.fn(fingerprintFixture)

    await expect(
      compareReleaseFingerprints({ base, current }, fingerprint),
    ).rejects.toThrow()
    expect(fingerprint).not.toHaveBeenCalled()
  })

  it('rejects alternate configs before they can be evaluated by the fingerprinter', async () => {
    writeFileSync(
      path.join(base.directory, 'app.config.mts'),
      'throw new Error()',
    )
    const fingerprint = jest.fn(fingerprintFixture)

    await expect(
      compareReleaseFingerprints({ base, current }, fingerprint),
    ).rejects.toThrow('Only app.json')
    expect(fingerprint).not.toHaveBeenCalled()
  })

  it('rejects an alternate config created by an install script', async () => {
    command.mockImplementation((file, args, options) => {
      if (file === 'bun') {
        writeFileSync(path.join(base.directory, 'app.config.json'), '{}')
        return ''
      }
      return actualExecFileSync(file, args, options)
    })
    const fingerprint = jest.fn(fingerprintFixture)

    await expect(
      compareReleaseFingerprints({ base, current }, fingerprint),
    ).rejects.toThrow('Only app.json')
    expect(fingerprint).not.toHaveBeenCalled()
  })

  it('rejects a changed fingerprinter pin', async () => {
    const filename = path.join(current.directory, 'package.json')
    writeFileSync(
      filename,
      readFileSync(filename, 'utf8').replace(
        `"${RELEASE_FINGERPRINT_VERSION}"`,
        `"^${RELEASE_FINGERPRINT_VERSION}"`,
      ),
    )
    commitCurrent()

    await expect(
      compareReleaseFingerprints({ base, current }, fingerprintFixture),
    ).rejects.toThrow('same pinned release fingerprinter')
  })

  it('does not turn a hashing failure into an empty compatible diff', async () => {
    const fingerprint = jest.fn(fingerprintFixture)
    fingerprint.mockRejectedValueOnce(new Error('Fingerprint failed'))

    await expect(
      compareReleaseFingerprints({ base, current }, fingerprint),
    ).rejects.toThrow('Fingerprint failed')
  })

  it('re-verifies inputs after fingerprint generation', async () => {
    const fingerprint = jest.fn((directory: string, options: Options) => {
      if (directory === current.directory) {
        writeFileSync(
          path.join(base.directory, 'native.txt'),
          'changed while hashing\n',
        )
      }
      return fingerprintFixture(directory, options)
    })

    await expect(
      compareReleaseFingerprints({ base, current }, fingerprint),
    ).rejects.toThrow()
  })
})
