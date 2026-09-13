import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, realpathSync } from 'node:fs'
import path from 'node:path'

import { assertStaticAppConfig } from './release-config'
import {
  assertCommit,
  compareVersions,
  readVersion,
  type Revision,
} from './release-safety'

interface BaselineInput {
  directory: string
  historyCommit: string
  currentCommit: string
  event: string
  expectedBaselineCommit?: string
}

export function resolveReleaseBaseline(input: BaselineInput): {
  base: Revision
  current: Revision
  newRuntime: boolean
} {
  const directory = realpathSync(input.directory)
  const git = (...args: string[]) =>
    execFileSync(
      'git',
      ['--no-replace-objects', '--no-optional-locks', '-C', directory, ...args],
      { encoding: 'utf8', stdio: 'pipe' },
    ).trim()
  assertCommit(input.historyCommit)
  assertCommit(input.currentCommit)
  if (input.event !== 'push' && input.event !== 'pull_request') {
    throw new Error(
      'Only main pushes and PR merge revisions can establish a release baseline.',
    )
  }
  if (
    realpathSync(git('rev-parse', '--show-toplevel')) !== directory ||
    git('rev-parse', 'HEAD') !== input.currentCommit
  ) {
    throw new Error('The checkout must match the fingerprinted release commit.')
  }
  if (git('rev-parse', '--is-shallow-repository') !== 'false') {
    throw new Error(
      'Complete first-parent history is required; fetch the full history and rerun.',
    )
  }
  git('merge-base', '--is-ancestor', input.historyCommit, input.currentCommit)
  git('diff', '--quiet', input.currentCommit, '--')
  assertStaticAppConfig(readdirSync(directory), 'the working directory')
  for (const file of ['app.json', 'package.json']) {
    if (
      readFileSync(path.join(directory, file), 'utf8').trim() !==
      git('show', `${input.currentCommit}:${file}`)
    ) {
      throw new Error(
        'The release manifests must match the checked Git revision.',
      )
    }
  }

  const readRevision = (commit: string): Revision => {
    const entries = git('ls-tree', '-z', commit).split('\0').filter(Boolean)
    assertStaticAppConfig(
      entries.map((entry) => entry.slice(entry.indexOf('\t') + 1)),
      `history revision ${commit}`,
    )
    for (const file of ['app.json', 'package.json']) {
      if (
        !entries.some(
          (entry) =>
            /^100(644|755) blob /.test(entry) && entry.endsWith(`\t${file}`),
        )
      ) {
        throw new Error(
          `History revision ${commit} needs a regular, committed ${file}.`,
        )
      }
    }
    return {
      commit,
      appConfig: JSON.parse(git('show', `${commit}:app.json`)),
      packageVersion: JSON.parse(git('show', `${commit}:package.json`)).version,
    }
  }

  const current = readRevision(input.currentCommit)
  const currentVersion = readVersion(current)
  const preview = input.event === 'pull_request'
  if (preview) {
    const parents = git(
      'show',
      '--no-patch',
      '--format=%P',
      input.currentCommit,
    ).split(' ')
    if (parents.length !== 2 || parents[0] !== input.historyCommit) {
      throw new Error(
        'Preview requires the PR merge revision with the event base as its first parent.',
      )
    }
  }
  const history = git(
    'rev-list',
    '--first-parent',
    '--reverse',
    preview ? input.historyCommit : input.currentCommit,
  ).split('\n')
  if (
    !history.includes(input.historyCommit) ||
    input.historyCommit === input.currentCommit
  ) {
    throw new Error(
      'The event base must precede the release on its first-parent history.',
    )
  }

  let highWater: number[] | undefined
  let eventHighWater: number[] | undefined
  let anchor: Revision | undefined
  let sawRuntime = false
  for (const commit of history) {
    const revision = commit === current.commit ? current : readRevision(commit)
    let version: number[]
    let legacy = false
    try {
      version = readVersion(revision)
    } catch (error) {
      if (sawRuntime) throw error
      version = readVersion(revision, true)
      legacy = true
    }
    sawRuntime ||= !legacy
    if (!highWater || compareVersions(version, highWater) > 0) {
      highWater = version
      anchor = legacy ? undefined : revision
    }
    if (commit === input.historyCommit) eventHighWater = highWater
  }
  if (!highWater || !eventHighWater) {
    throw new Error(
      'Unable to establish the runtime history; restore a complete trusted checkout.',
    )
  }
  if (compareVersions(currentVersion, highWater) < 0) {
    throw new Error(
      `Runtime ${currentVersion.join('.')} is below historical high-water ${highWater.join('.')}; use a higher, never-used app version.`,
    )
  }
  const newRuntime = compareVersions(currentVersion, eventHighWater) > 0
  if (preview && newRuntime) {
    // PR branch commits are not accepted main history. A fresh candidate only authorizes a build.
    anchor = current
  }
  if (!anchor || compareVersions(readVersion(anchor), currentVersion) !== 0) {
    throw new Error(
      `No isolated anchor exists for this runtime; use an app version higher than historical high-water ${highWater.join('.')}.`,
    )
  }
  if (input.expectedBaselineCommit !== undefined) {
    assertCommit(input.expectedBaselineCommit)
    if (input.expectedBaselineCommit !== anchor.commit) {
      throw new Error(
        'The fingerprint baseline does not match the immutable runtime anchor.',
      )
    }
  }
  git('merge-base', '--is-ancestor', anchor.commit, current.commit)
  return { base: anchor, current, newRuntime }
}
