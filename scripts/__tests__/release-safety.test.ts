import { evaluateReleaseSafety } from '../release-safety'

const baseCommit = 'a'.repeat(40)
const currentCommit = 'b'.repeat(40)
const beforeSource = {
  type: 'dir',
  filePath: 'node_modules/react-native',
  hash: 'c'.repeat(40),
}
const afterSource = { ...beforeSource, hash: 'd'.repeat(40) }
const nativeDiff = JSON.stringify([
  { op: 'changed', beforeSource, afterSource },
])

function appConfig(version: string) {
  return { expo: { version, runtimeVersion: { policy: 'appVersion' } } }
}

function input({
  nativeChanged = false,
  baseVersion = '1.0.0',
  version = baseVersion,
}: {
  nativeChanged?: boolean
  baseVersion?: string
  version?: string
} = {}): Parameters<typeof evaluateReleaseSafety>[0] {
  return {
    base: {
      commit: baseCommit,
      appConfig: appConfig(baseVersion),
      packageVersion: baseVersion,
    },
    current: {
      commit: currentCommit,
      appConfig: appConfig(version),
      packageVersion: version,
    },
    detector: {
      previousCommit: baseCommit,
      currentCommit,
      previousFingerprint: JSON.stringify({
        hash: beforeSource.hash,
        sources: [beforeSource],
      }),
      currentFingerprint: JSON.stringify({
        hash: nativeChanged ? afterSource.hash : beforeSource.hash,
        sources: [nativeChanged ? afterSource : beforeSource],
      }),
      diff: nativeChanged ? nativeDiff : '[]',
    },
  }
}

describe('release safety', () => {
  it('allows a JS-only update with the same known native fingerprint and runtime', () => {
    const result = evaluateReleaseSafety(input())
    expect(result).toMatchObject({ action: 'update', runtimeVersion: '1.0.0' })
  })

  it('accepts whitespace in a valid empty diff rather than comparing raw strings', () => {
    const release = input()
    release.detector.diff = '[ \n ]'
    expect(evaluateReleaseSafety(release).action).toBe('update')
  })

  it('requires a build and skips OTA for isolated native changes', () => {
    expect(
      evaluateReleaseSafety(input({ nativeChanged: true, version: '1.0.1' })),
    ).toMatchObject({ action: 'build', runtimeVersion: '1.0.1' })
  })

  it.each([
    { op: 'added', addedSource: afterSource },
    { op: 'removed', removedSource: beforeSource },
  ])('requires a build when a native module is $op', (change) => {
    const release = input({ nativeChanged: true, version: '1.0.1' })
    release.detector.diff = JSON.stringify([change])
    expect(evaluateReleaseSafety(release).action).toBe('build')
  })

  it('continues to skip a native-changing PR after another JS-only commit', () => {
    const release = input({ nativeChanged: true, version: '1.0.1' })
    release.current.commit = 'e'.repeat(40)
    release.detector.currentCommit = release.current.commit
    expect(evaluateReleaseSafety(release).action).toBe('build')
  })

  it('keeps subsequent JS-only updates isolated from the old runtime after merge', () => {
    const nativeRelease = evaluateReleaseSafety(
      input({ nativeChanged: true, version: '1.0.1' }),
    )
    const nextUpdate = evaluateReleaseSafety(input({ baseVersion: '1.0.1' }))
    expect(nativeRelease.action).toBe('build')
    expect(nextUpdate.action).toBe('update')
    expect(nextUpdate.runtimeVersion).toBe(nativeRelease.runtimeVersion)
    expect(nextUpdate.runtimeVersion).not.toBe('1.0.0')
  })

  it('requires a new build even for a version-only runtime change', () => {
    expect(evaluateReleaseSafety(input({ version: '1.0.1' })).action).toBe(
      'build',
    )
  })

  it('builds a structurally new namespace even when its anchor is the release itself', () => {
    const release = input()
    release.base.commit = currentCommit
    release.detector.previousCommit = currentCommit
    release.newRuntime = true
    expect(evaluateReleaseSafety(release).action).toBe('build')
    release.newRuntime = false
    expect(() => evaluateReleaseSafety(release)).toThrow(
      'cannot authorize its own',
    )
  })

  it('does not let a new-namespace build decision waive drift from its original anchor', () => {
    const release = input({ nativeChanged: true })
    release.newRuntime = true
    expect(() => evaluateReleaseSafety(release)).toThrow(
      'Native changes require a higher app version',
    )
  })

  it('rejects native changes that reuse the same runtime', () => {
    expect(() => evaluateReleaseSafety(input({ nativeChanged: true }))).toThrow(
      'Native changes require a higher app version',
    )
  })

  it('does not accept higher build numbers instead of runtime isolation', () => {
    const release = input({ nativeChanged: true })
    release.current.appConfig = {
      expo: {
        ...appConfig('1.0.0').expo,
        ios: { buildNumber: '3' },
        android: { versionCode: 3 },
      },
    }
    expect(() => evaluateReleaseSafety(release)).toThrow(
      'Native changes require a higher app version',
    )
  })

  it.each([
    ['1.0.9', '1.0.10'],
    ['1.9.9', '1.10.0'],
    ['1.9.9', '2.0.0'],
  ])(
    'compares version components numerically (%s -> %s)',
    (baseVersion, version) => {
      expect(
        evaluateReleaseSafety(
          input({ nativeChanged: true, baseVersion, version }),
        ).action,
      ).toBe('build')
    },
  )

  it.each([false, true])(
    'rejects a reused older runtime (native changes: %s)',
    (nativeChanged) => {
      expect(() =>
        evaluateReleaseSafety(
          input({ nativeChanged, baseVersion: '1.0.1', version: '1.0.0' }),
        ),
      ).toThrow('older runtime cannot be reused')
    },
  )

  it.each([
    undefined,
    '',
    'null',
    '{}',
    'false',
    'not-json',
    '[null]',
    '[{}]',
    '[{"op":"unknown"}]',
    '[{"op":"changed","beforeSource":{},"afterSource":{}}]',
  ])('blocks missing or unknown detector diffs: %s', (diff) => {
    const release = input({ version: '1.0.1' })
    release.detector.diff = diff
    expect(() => evaluateReleaseSafety(release)).toThrow(/fingerprint diff/i)
  })

  it.each(['previousFingerprint', 'currentFingerprint'] as const)(
    'blocks a missing %s even when the detector reports an empty diff',
    (field) => {
      const release = input()
      delete release.detector[field]
      expect(() => evaluateReleaseSafety(release)).toThrow(/fingerprint/i)
    },
  )

  it.each([
    'null',
    '{}',
    '{"hash":"","sources":[]}',
    '{"hash":"abc","sources":[]}',
    '{"hash":"abc","sources":[null]}',
    '{"hash":"abc","sources":[{"type":"unknown","hash":"abc"}]}',
    '{"hash":"abc","sources":[{"type":"dir","filePath":"ios","hash":null}]}',
  ])('blocks an unknown cached baseline: %s', (previousFingerprint) => {
    const release = input({ nativeChanged: true, version: '1.0.1' })
    release.detector.previousFingerprint = previousFingerprint
    expect(() => evaluateReleaseSafety(release)).toThrow('previous fingerprint')
  })

  it.each([false, true])(
    'blocks contradictory hash/diff evidence (native: %s)',
    (nativeChanged) => {
      const release = input({ nativeChanged, version: '1.0.1' })
      release.detector.diff = nativeChanged ? '[]' : nativeDiff
      expect(() => evaluateReleaseSafety(release)).toThrow(
        'hashes and diff disagree',
      )
    },
  )

  it.each(['previousCommit', 'currentCommit'] as const)(
    'blocks a detector with no %s',
    (field) => {
      const release = input()
      delete release.detector[field]
      expect(() => evaluateReleaseSafety(release)).toThrow(
        'commits do not match',
      )
    },
  )

  it('blocks evidence from another commit range', () => {
    const release = input()
    release.detector.previousCommit = 'f'.repeat(40)
    expect(() => evaluateReleaseSafety(release)).toThrow('commits do not match')
  })

  it.each(['', 'main', 'HEAD^', '0'.repeat(40)])(
    'blocks an unknown base reference: %s',
    (commit) => {
      const release = input()
      release.base.commit = commit
      expect(() => evaluateReleaseSafety(release)).toThrow(
        'known full Git commit',
      )
    },
  )

  it.each(['1.0', 'v1.0.1', '1.0.01', '1.0.1-beta', '1.0.9007199254740992'])(
    'rejects invalid app versions: %s',
    (version) => {
      expect(() => evaluateReleaseSafety(input({ version }))).toThrow(
        /app version/i,
      )
    },
  )

  it.each(['base', 'current'] as const)(
    'rejects mismatched package/app versions in the %s revision',
    (revision) => {
      const release = input()
      release[revision].packageVersion = '2.0.0'
      expect(() => evaluateReleaseSafety(release)).toThrow(
        'versions must match',
      )
    },
  )

  it.each([undefined, '1.0.0', { policy: 'fingerprint' }])(
    'rejects runtime policy drift: %s',
    (runtimeVersion) => {
      const release = input()
      release.current.appConfig = {
        expo: { version: '1.0.0', runtimeVersion },
      }
      expect(() => evaluateReleaseSafety(release)).toThrow('appVersion runtime')
    },
  )

  it.each([
    ['ios', { version: '1.0.0' }],
    ['ios', { runtimeVersion: '1.0.0' }],
    ['android', { version: '1.0.0' }],
    ['android', { runtimeVersion: { policy: 'nativeVersion' } }],
  ])('rejects a platform override for %s', (platform, override) => {
    const release = input({ nativeChanged: true, version: '1.0.1' })
    release.current.appConfig = {
      expo: { ...appConfig('1.0.1').expo, [platform as string]: override },
    }
    expect(() => evaluateReleaseSafety(release)).toThrow('Platform overrides')
  })
})
