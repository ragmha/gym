import {
  createFingerprintAsync,
  diffFingerprints,
  type Fingerprint,
  type Options,
} from '@expo/fingerprint'
import { version as installedFingerprintVersion } from '@expo/fingerprint/package.json'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, realpathSync } from 'node:fs'
import path from 'node:path'

import { assertStaticAppConfig } from './release-config'
import { assertCommit } from './release-safety'

export const RELEASE_FINGERPRINT_VERSION = '0.16.8'

interface Revision {
  directory: string
  commit: string
}

interface ComparisonInput {
  base: Revision
  current: Revision
}

function git(directory: string, ...args: string[]): string {
  return execFileSync(
    'git',
    ['--no-replace-objects', '--no-optional-locks', '-C', directory, ...args],
    {
      encoding: 'utf8',
      stdio: 'pipe',
    },
  ).trim()
}

function verifyCheckout({ directory, commit }: Revision): void {
  assertCommit(commit)
  if (
    realpathSync(git(directory, 'rev-parse', '--show-toplevel')) !==
      directory ||
    git(directory, 'rev-parse', 'HEAD') !== commit
  ) {
    throw new Error('Fingerprint checkout does not match its verified commit.')
  }
  git(directory, 'diff', '--quiet', commit, '--')
  assertStaticAppConfig(readdirSync(directory), 'the fingerprint checkout')
  for (const file of ['package.json', 'bun.lock']) {
    const committed = git(directory, 'show', `${commit}:${file}`)
    if (
      !committed ||
      readFileSync(path.join(directory, file), 'utf8').trim() !== committed
    ) {
      throw new Error(
        `A committed, unchanged ${file} is required for fingerprinting.`,
      )
    }
  }
}

function installFrozenDependencies(revision: Revision): void {
  verifyCheckout(revision)
  execFileSync('bun', ['install', '--frozen-lockfile'], {
    cwd: revision.directory,
    env: { ...process.env, CI: '1', HUSKY: '0' },
    stdio: 'pipe',
  })
  verifyCheckout(revision)
}

export async function compareReleaseFingerprints(
  input: ComparisonInput,
  fingerprint: (
    directory: string,
    options: Options,
  ) => Promise<Fingerprint> = createFingerprintAsync,
) {
  const base = { ...input.base, directory: realpathSync(input.base.directory) }
  const current = {
    ...input.current,
    directory: realpathSync(input.current.directory),
  }
  if (base.directory === current.directory) {
    throw new Error('Base and release fingerprints need separate checkouts.')
  }
  verifyCheckout(base)
  verifyCheckout(current)
  git(
    current.directory,
    'merge-base',
    '--is-ancestor',
    base.commit,
    current.commit,
  )
  const manifest = JSON.parse(
    readFileSync(path.join(current.directory, 'package.json'), 'utf8'),
  )
  if (
    installedFingerprintVersion !== RELEASE_FINGERPRINT_VERSION ||
    manifest.devDependencies?.['@expo/fingerprint'] !==
      RELEASE_FINGERPRINT_VERSION ||
    manifest.overrides?.['@expo/fingerprint'] !== RELEASE_FINGERPRINT_VERSION
  ) {
    throw new Error(
      'Both revisions must use the same pinned release fingerprinter.',
    )
  }
  installFrozenDependencies(base)
  installFrozenDependencies(current)
  const options: Options = {
    hashAlgorithm: 'sha1',
    platforms: ['android', 'ios'],
    ignorePaths: ['.expo/**'],
    silent: true,
  }
  const previousFingerprint = await fingerprint(base.directory, options)
  const currentFingerprint = await fingerprint(current.directory, options)
  verifyCheckout(base)
  verifyCheckout(current)
  return {
    previousCommit: base.commit,
    currentCommit: current.commit,
    previousFingerprint: JSON.stringify(previousFingerprint),
    currentFingerprint: JSON.stringify(currentFingerprint),
    diff: JSON.stringify(
      diffFingerprints(previousFingerprint, currentFingerprint),
    ),
  }
}
