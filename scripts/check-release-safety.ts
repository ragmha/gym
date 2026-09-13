import { appendFileSync } from 'node:fs'

import { resolveReleaseBaseline } from './release-baseline'
import { evaluateReleaseSafety } from './release-safety'

try {
  const baseline = resolveReleaseBaseline({
    directory: process.cwd(),
    historyCommit: process.env.HISTORY_COMMIT ?? '',
    currentCommit: process.env.CURRENT_COMMIT ?? '',
    event: process.env.RELEASE_EVENT ?? '',
    expectedBaselineCommit: process.env.BASE_COMMIT ?? '',
  })
  const decision = evaluateReleaseSafety({
    ...baseline,
    detector: {
      previousCommit: process.env.FINGERPRINT_BASE_COMMIT,
      currentCommit: process.env.FINGERPRINT_CURRENT_COMMIT,
      previousFingerprint: process.env.PREVIOUS_FINGERPRINT,
      currentFingerprint: process.env.CURRENT_FINGERPRINT,
      diff: process.env.FINGERPRINT_DIFF,
    },
  })
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `action=${decision.action}\nruntime-version=${decision.runtimeVersion}\n`,
    )
  }
  console.log(decision.message)
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Runtime check failed.',
  )
  process.exitCode = 1
}
