import { appendFileSync } from 'node:fs'

import { resolveReleaseBaseline } from './release-baseline'
import { compareReleaseFingerprints } from './release-fingerprints'

async function main(): Promise<void> {
  const selectOnly = process.argv.includes('--resolve-baseline')
  const baseline = resolveReleaseBaseline({
    directory: process.cwd(),
    historyCommit: process.env.HISTORY_COMMIT ?? '',
    currentCommit: process.env.CURRENT_COMMIT ?? '',
    event: process.env.RELEASE_EVENT ?? '',
    expectedBaselineCommit: selectOnly
      ? undefined
      : (process.env.BASE_COMMIT ?? ''),
  })
  if (selectOnly) {
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `baseline-commit=${baseline.base.commit}\n`,
      )
    }
    console.log(
      `Resolved immutable runtime anchor ${baseline.base.commit}; nothing published.`,
    )
    return
  }
  const result = await compareReleaseFingerprints({
    base: {
      directory: process.env.BASE_DIRECTORY ?? '.expo/release-baseline',
      commit: baseline.base.commit,
    },
    current: {
      directory: process.cwd(),
      commit: baseline.current.commit,
    },
  })
  if (process.env.GITHUB_OUTPUT) {
    const outputs = {
      'previous-git-commit': result.previousCommit,
      'current-git-commit': result.currentCommit,
      'previous-fingerprint': result.previousFingerprint,
      'current-fingerprint': result.currentFingerprint,
      'fingerprint-diff': result.diff,
    }
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      Object.entries(outputs)
        .map(([key, value]) => `${key}=${value}\n`)
        .join(''),
    )
  }
  console.log(
    'Compared verified base and release commits with frozen dependencies; nothing published.',
  )
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Fingerprint comparison failed.',
  )
  process.exitCode = 1
})
