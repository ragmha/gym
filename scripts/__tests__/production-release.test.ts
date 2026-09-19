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

  it.each([
    './modules/phone-rest/app.plugin.js',
    'modules/phone-rest/app.plugin.js',
    '.\\modules\\phone-rest\\app.plugin.js',
  ])(
    'blocks equivalent Phone rest plugin paths without explicit approval: %s',
    (entry) => {
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
      const directory = mkdtempSync(
        path.join(tmpdir(), 'gym-production-release-'),
      )
      try {
        writeFileSync(
          path.join(directory, 'app.json'),
          JSON.stringify(config([plugin], approval)),
        )
        const result = spawnSync(
          'bun',
          [path.resolve(__dirname, '../check-production-release.ts')],
          { cwd: directory, encoding: 'utf8' },
        )
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
      } finally {
        rmSync(directory, { recursive: true, force: true })
      }
    },
  )
})
