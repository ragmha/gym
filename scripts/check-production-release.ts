import { readdirSync, readFileSync } from 'node:fs'

import {
  assertProductionReleaseReady,
  assertStaticAppConfig,
} from './release-config'

try {
  assertStaticAppConfig(readdirSync(process.cwd()), 'the production checkout')
  assertProductionReleaseReady(JSON.parse(readFileSync('app.json', 'utf8')))
  console.log('Production release readiness confirmed.')
} catch (error: unknown) {
  console.error(
    error instanceof Error
      ? error.message
      : 'Unable to verify production release readiness.',
  )
  process.exitCode = 1
}
