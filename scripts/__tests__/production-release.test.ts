import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { assertProductionReleaseReady } from '../release-config'

const plugin = './modules/phone-rest/app.plugin.js'

function config(plugins: unknown, distributionApproved?: unknown) {
  return {
    expo: {
      plugins,
      extra: { phoneRest: { distributionApproved } },
    },
  }
}

function runProductionCheck(appConfig: unknown, alternateConfig?: string) {
  const directory = mkdtempSync(path.join(tmpdir(), 'gym-production-release-'))
  try {
    writeFileSync(path.join(directory, 'app.json'), JSON.stringify(appConfig))
    if (alternateConfig) {
      writeFileSync(
        path.join(directory, alternateConfig),
        'throw new Error("Alternate config must never execute")',
      )
    }
    return spawnSync(
      'bun',
      [path.resolve(__dirname, '../check-production-release.ts')],
      { cwd: directory, encoding: 'utf8' },
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

describe('production release readiness', () => {
  it('does not require Family Controls approval without the Phone rest plugin', () => {
    expect(() =>
      assertProductionReleaseReady({
        expo: {
          plugins: ['expo-router', ['@kingstinct/react-native-healthkit', {}]],
        },
      }),
    ).not.toThrow()
  })

  it.each([{ entry: plugin }, { entry: [plugin, {}] }])(
    'blocks a Phone rest plugin entry without explicit approval: $entry',
    ({ entry }) => {
      expect(() =>
        assertProductionReleaseReady({ expo: { plugins: [entry] } }),
      ).toThrow('Phone rest production releases are blocked')
    },
  )

  it.each([undefined, false, null, 'true', 1])(
    'does not interpret %j as distribution approval',
    (approval) => {
      expect(() =>
        assertProductionReleaseReady(config([plugin], approval)),
      ).toThrow()
    },
  )

  it('does not accept a plugin option as approval of both signed app identifiers', () => {
    expect(() =>
      assertProductionReleaseReady(
        config([[plugin, { distributionApproved: true }]], false),
      ),
    ).toThrow('io.raghib.gym and io.raghib.gym.PhoneRestReport')
  })

  it.each([{ entry: plugin }, { entry: [plugin, {}] }])(
    'allows explicit distribution approval for a Phone rest entry: $entry',
    ({ entry }) => {
      expect(() =>
        assertProductionReleaseReady(config([entry], true)),
      ).not.toThrow()
    },
  )

  it.each([null, {}, { expo: null }, { expo: { plugins: plugin } }])(
    'fails closed for malformed app configuration: %j',
    (appConfig) => {
      expect(() => assertProductionReleaseReady(appConfig)).toThrow()
    },
  )

  it.each([false, true])(
    'propagates approval=%s through the production CLI exit status',
    (approval) => {
      const result = runProductionCheck(config([plugin], approval))
      expect(result.error).toBeUndefined()
      expect(result.status).toBe(approval ? 0 : 1)
      if (approval) {
        expect(result.stdout).toContain(
          'Production release readiness confirmed.',
        )
      } else {
        expect(result.stdout).not.toContain('readiness confirmed')
        expect(result.stderr).toContain(
          'Phone rest production releases are blocked',
        )
        expect(result.stderr).toContain(
          'A simulator build is not distribution approval.',
        )
      }
    },
  )

  it('allows a static dashboard-only config through the production CLI', () => {
    const result = runProductionCheck({ expo: { plugins: ['expo-router'] } })
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('Production release readiness confirmed.')
  })

  it.each([
    'app.config.js',
    'app.config.ts',
    'app.config.mjs',
    'app.config.cjs',
    'app.config.mts',
    'app.config.cts',
    'app.config.json',
    'APP.CONFIG.future',
    'app.config',
  ])('rejects alternate %s before declaring readiness', (alternate) => {
    const result = runProductionCheck(
      { expo: { plugins: ['expo-router'] } },
      alternate,
    )
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(1)
    expect(result.stdout).not.toContain('readiness confirmed')
    expect(result.stderr).toContain(
      'Only app.json is supported for runtime safety',
    )
    expect(result.stderr).not.toContain('Alternate config must never execute')
  })
})
