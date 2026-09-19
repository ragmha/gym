import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { z } from 'zod'

const root = path.resolve(__dirname, '../..')
const stepSchema = z.looseObject({
  name: z.string(),
  id: z.string().optional(),
  uses: z.string().optional(),
  run: z.string().optional(),
  if: z.string().optional(),
  with: z
    .record(z.string(), z.union([z.string(), z.boolean(), z.number()]))
    .optional(),
  env: z.record(z.string(), z.string()).optional(),
})
const jobSchema = z.looseObject({
  if: z.string().optional(),
  needs: z.string().optional(),
  uses: z.string().optional(),
  with: z
    .record(z.string(), z.union([z.string(), z.boolean(), z.number()]))
    .optional(),
  secrets: z.record(z.string(), z.string()).optional(),
  outputs: z.record(z.string(), z.string()).optional(),
  steps: z.array(stepSchema).default([]),
})
const workflowSchema = z.looseObject({
  on: z.record(z.string(), z.unknown()),
  permissions: z.record(z.string(), z.string()),
  jobs: z.record(z.string(), jobSchema),
})

function workflow(file: string) {
  const json = execFileSync(
    'bun',
    [
      '-e',
      'console.log(JSON.stringify(Bun.YAML.parse(await Bun.file(process.argv[1]).text())))',
      path.join(root, '.github/workflows', file),
    ],
    { encoding: 'utf8' },
  )
  return workflowSchema.parse(JSON.parse(json))
}

function step(job: z.infer<typeof jobSchema>, name: string) {
  const found = job.steps.find((entry) => entry.name === name)
  if (!found) throw new Error(`Workflow step is missing: ${name}`)
  return found
}

function captureEasArgs(
  command: string | undefined,
  environment: Record<string, string>,
): string[] {
  if (!command) throw new Error('The workflow command is missing')
  return execFileSync(
    'bash',
    [
      '-e',
      '-u',
      '-o',
      'pipefail',
      '-c',
      `eas() { printf '%s\\0' "$@"; }\n${command}`,
    ],
    { cwd: root, encoding: 'utf8', env: { ...process.env, ...environment } },
  )
    .split('\0')
    .slice(0, -1)
}

describe.each([
  {
    file: 'preview.yml',
    jobName: 'test',
    base: '${{ github.event.pull_request.base.sha }}',
    event: 'pull_request',
  },
  {
    file: 'update.yml',
    jobName: 'update',
    base: '${{ github.event.before }}',
    event: 'push',
  },
])('$file fingerprint recovery', ({ file, jobName, base, event }) => {
  it('checks out the resolved anchor, never the event tip or a fingerprint cache', () => {
    const job = workflow(file).jobs[jobName]
    const resolve = step(job, 'Resolve runtime anchor')
    expect(resolve.id).toBe('baseline')
    expect(resolve.run).toBe(
      'bun scripts/fingerprint-release.ts --resolve-baseline',
    )
    expect(resolve.env).toEqual({
      HISTORY_COMMIT: base,
      CURRENT_COMMIT: '${{ github.sha }}',
      RELEASE_EVENT: event,
    })
    const checkout = step(job, 'Checkout fingerprint baseline')
    expect(checkout.uses).toBe('actions/checkout@v6')
    expect(checkout.with).toMatchObject({
      ref: '${{ steps.baseline.outputs.baseline-commit }}',
      path: '.expo/release-baseline',
      'persist-credentials': false,
    })
    expect(step(job, 'Checkout repository').with?.['fetch-depth']).toBe(0)
    expect(step(job, 'Checkout repository').with?.ref).toBe('${{ github.sha }}')
    expect(job.steps.indexOf(resolve)).toBeLessThan(job.steps.indexOf(checkout))
    expect(
      job.steps.some((entry) => entry.uses?.includes('/fingerprint')),
    ).toBe(false)
  })

  it('passes recomputed evidence to the runtime guard before publication', () => {
    const job = workflow(file).jobs[jobName]
    const compare = step(job, 'Compare verified native fingerprints')
    const guard = step(job, 'Enforce runtime isolation')

    expect(compare.id).toBe('fingerprint')
    expect(compare.run).toBe('bun scripts/fingerprint-release.ts')
    expect(compare.env).toMatchObject({
      HISTORY_COMMIT: base,
      BASE_COMMIT: '${{ steps.baseline.outputs.baseline-commit }}',
      CURRENT_COMMIT: '${{ github.sha }}',
      RELEASE_EVENT: event,
      BASE_DIRECTORY: '.expo/release-baseline',
      EXPO_NO_DOTENV: '1',
    })
    expect(guard.id).toBe('runtime')
    expect(guard.run).toBe('bun scripts/check-release-safety.ts')
    expect(guard.env).toMatchObject({
      HISTORY_COMMIT: base,
      BASE_COMMIT: '${{ steps.baseline.outputs.baseline-commit }}',
      CURRENT_COMMIT: '${{ github.sha }}',
      RELEASE_EVENT: event,
      FINGERPRINT_BASE_COMMIT:
        '${{ steps.fingerprint.outputs.previous-git-commit }}',
      FINGERPRINT_CURRENT_COMMIT:
        '${{ steps.fingerprint.outputs.current-git-commit }}',
      PREVIOUS_FINGERPRINT:
        '${{ steps.fingerprint.outputs.previous-fingerprint }}',
      CURRENT_FINGERPRINT:
        '${{ steps.fingerprint.outputs.current-fingerprint }}',
      FINGERPRINT_DIFF: '${{ steps.fingerprint.outputs.fingerprint-diff }}',
    })
    expect(
      job.steps.indexOf(step(job, 'Checkout fingerprint baseline')),
    ).toBeLessThan(job.steps.indexOf(compare))
    expect(job.steps.indexOf(compare)).toBeLessThan(job.steps.indexOf(guard))
  })
})

it('publishes preview updates only for an explicit safe-update decision', () => {
  const jobs = workflow('preview.yml').jobs
  expect(jobs.test.outputs?.['release-action']).toBe(
    '${{ steps.runtime.outputs.action }}',
  )
  expect(jobs.preview.needs).toBe('test')
  expect(jobs.preview.if).toBe(
    "needs.test.outputs.release-action == 'update' && github.event.pull_request.base.ref == 'main' && github.event.pull_request.head.repo.full_name == github.repository",
  )
  expect(step(jobs.preview, 'Checkout repository').with?.ref).toBe(
    '${{ github.sha }}',
  )
})

it('separates production build and update decisions after the runtime guard', () => {
  const release = workflow('update.yml')
  const job = release.jobs.update
  const guard = step(job, 'Enforce runtime isolation')
  const build = release.jobs.build
  const publish = step(job, 'Publish update')

  expect(job.outputs?.['release-action']).toBe(
    '${{ steps.runtime.outputs.action }}',
  )
  expect(build.needs).toBe('update')
  expect(build.if).toBe("needs.update.outputs.release-action == 'build'")
  expect(build.uses).toBe('./.github/workflows/build.yml')
  expect(build.with).toEqual({
    platform: 'ios',
    profile: 'production',
    auto_submit: true,
  })
  expect(build.secrets).toEqual({ EXPO_TOKEN: '${{ secrets.EXPO_TOKEN }}' })
  expect(release.permissions).toEqual({ contents: 'read' })
  expect(release.on).toEqual({ push: { branches: ['main'] } })
  expect(
    step(workflow('build.yml').jobs.build, 'Checkout repository').with,
  ).toEqual({
    ref: '${{ github.sha }}',
  })
  expect(publish.if).toBe("steps.runtime.outputs.action == 'update'")
  expect(job.steps.indexOf(guard)).toBeLessThan(job.steps.indexOf(publish))
})

it('targets the installed production channel with an explicit SDK55 environment', () => {
  const publish = step(workflow('update.yml').jobs.update, 'Publish update')
  expect(
    captureEasArgs(publish.run, { GITHUB_SHA: 'verified-release-sha' }),
  ).toEqual([
    'update',
    '--channel',
    'production',
    '--environment',
    'production',
    '--platform',
    'ios',
    '--message',
    'verified-release-sha',
    '--non-interactive',
  ])
})

it('isolates each PR preview from production and other PRs', () => {
  const publish = step(
    workflow('preview.yml').jobs.preview,
    'Create preview update',
  )
  expect(publish.env).toEqual({
    PR_NUMBER: '${{ github.event.pull_request.number }}',
  })
  expect(
    captureEasArgs(publish.run, { PR_NUMBER: '123', GITHUB_SHA: 'merge-sha' }),
  ).toEqual([
    'update',
    '--branch',
    'pr-123',
    '--environment',
    'preview',
    '--platform',
    'ios',
    '--message',
    'PR #123 merge-sha',
    '--non-interactive',
  ])
})

it('makes auto-submission opt-in for a verified reusable-workflow call', () => {
  const triggers = z
    .object({
      workflow_call: z.looseObject({
        inputs: z.record(z.string(), z.unknown()),
      }),
      workflow_dispatch: z.looseObject({
        inputs: z.record(z.string(), z.unknown()),
      }),
    })
    .parse(workflow('build.yml').on)
  expect(triggers.workflow_call.inputs.auto_submit).toMatchObject({
    type: 'boolean',
    default: false,
  })
  expect(triggers.workflow_dispatch.inputs).not.toHaveProperty('auto_submit')
})

describe('automatic submission caller authorization', () => {
  const trustedCaller = {
    CALLER_WORKFLOW_REF:
      'ragmha/gym/.github/workflows/update.yml@refs/heads/main',
    CALLER_EVENT_NAME: 'push',
    CALLER_REF: 'refs/heads/main',
  }

  it('authenticates the caller before exposing release credentials', () => {
    const job = workflow('build.yml').jobs.build
    const authorize = step(job, 'Authorize automatic submission')
    expect(authorize.if).toBe('inputs.auto_submit')
    expect(authorize.env).toEqual({
      CALLER_WORKFLOW_REF: '${{ github.workflow_ref }}',
      CALLER_EVENT_NAME: '${{ github.event_name }}',
      CALLER_REF: '${{ github.ref }}',
    })
    for (const name of [
      'Check for EXPO_TOKEN',
      'Checkout repository',
      'Setup EAS',
      'Build app',
    ]) {
      expect(job.steps.indexOf(authorize)).toBeLessThan(
        job.steps.indexOf(step(job, name)),
      )
    }
  })

  it('accepts only the guarded main update workflow caller', () => {
    const authorize = step(
      workflow('build.yml').jobs.build,
      'Authorize automatic submission',
    )
    expect(captureEasArgs(authorize.run, trustedCaller)).toEqual([])
  })

  it.each([
    {
      name: 'another workflow on main',
      context: {
        CALLER_WORKFLOW_REF:
          'ragmha/gym/.github/workflows/unverified.yml@refs/heads/main',
      },
    },
    {
      name: 'the standalone build workflow',
      context: {
        CALLER_WORKFLOW_REF:
          'ragmha/gym/.github/workflows/build.yml@refs/heads/main',
      },
    },
    {
      name: 'an update workflow from another repository',
      context: {
        CALLER_WORKFLOW_REF:
          'another-owner/gym/.github/workflows/update.yml@refs/heads/main',
      },
    },
    {
      name: 'an update workflow on a feature branch',
      context: {
        CALLER_WORKFLOW_REF:
          'ragmha/gym/.github/workflows/update.yml@refs/heads/feature',
      },
    },
    {
      name: 'a manual dispatch on main',
      context: { CALLER_EVENT_NAME: 'workflow_dispatch' },
    },
    {
      name: 'a pull request targeting main',
      context: { CALLER_EVENT_NAME: 'pull_request_target' },
    },
    {
      name: 'an ordinary pull request',
      context: { CALLER_EVENT_NAME: 'pull_request' },
    },
    {
      name: 'a tag push',
      context: { CALLER_REF: 'refs/tags/main' },
    },
    {
      name: 'a non-main branch push',
      context: { CALLER_REF: 'refs/heads/feature' },
    },
    {
      name: 'missing caller identity',
      context: { CALLER_WORKFLOW_REF: '' },
    },
  ])('rejects $name even when auto-submit is requested', ({ context }) => {
    const authorize = step(
      workflow('build.yml').jobs.build,
      'Authorize automatic submission',
    )
    expect(() =>
      captureEasArgs(authorize.run, { ...trustedCaller, ...context }),
    ).toThrow(
      'Automatic TestFlight submission requires the guarded main update workflow.',
    )
  })
})

it.each([
  { platform: 'ios', profile: 'production' },
  { platform: 'ios', profile: 'preview' },
  { platform: 'ios', profile: 'development' },
  { platform: 'ios', profile: 'development-device' },
  { platform: 'android', profile: 'production' },
  { platform: 'all', profile: 'production' },
])(
  'keeps an ordinary $platform/$profile build out of TestFlight',
  ({ platform, profile }) => {
    const build = step(workflow('build.yml').jobs.build, 'Build app')
    expect(build.env).toEqual({
      BUILD_PLATFORM: '${{ inputs.platform }}',
      BUILD_PROFILE: '${{ inputs.profile }}',
      AUTO_SUBMIT: '${{ inputs.auto_submit || false }}',
    })
    expect(
      captureEasArgs(build.run, {
        BUILD_PLATFORM: platform,
        BUILD_PROFILE: profile,
        AUTO_SUBMIT: 'false',
      }),
    ).toEqual([
      'build',
      '--platform',
      platform,
      '--profile',
      profile,
      '--non-interactive',
    ])
  },
)

it('auto-submits only the verified production iOS build', () => {
  const build = step(workflow('build.yml').jobs.build, 'Build app')
  expect(
    captureEasArgs(build.run, {
      BUILD_PLATFORM: 'ios',
      BUILD_PROFILE: 'production',
      AUTO_SUBMIT: 'true',
    }),
  ).toEqual([
    'build',
    '--platform',
    'ios',
    '--profile',
    'production',
    '--non-interactive',
    '--auto-submit',
  ])
})

it.each([
  { platform: 'ios', profile: 'preview' },
  { platform: 'ios', profile: 'development' },
  { platform: 'android', profile: 'production' },
  { platform: 'all', profile: 'production' },
])(
  'rejects an auto-submit request for $platform/$profile',
  ({ platform, profile }) => {
    const build = step(workflow('build.yml').jobs.build, 'Build app')
    expect(() =>
      captureEasArgs(build.run, {
        BUILD_PLATFORM: platform,
        BUILD_PROFILE: profile,
        AUTO_SUBMIT: 'true',
      }),
    ).toThrow(
      'Automatic TestFlight submission requires the production iOS profile.',
    )
  },
)

it('passes reusable-workflow input values as arguments, never shell code', () => {
  const profile = 'preview; printf unintended-command'
  const build = step(workflow('build.yml').jobs.build, 'Build app')
  expect(
    captureEasArgs(build.run, {
      BUILD_PLATFORM: 'ios',
      BUILD_PROFILE: profile,
      AUTO_SUBMIT: 'false',
    }),
  ).toEqual([
    'build',
    '--platform',
    'ios',
    '--profile',
    profile,
    '--non-interactive',
  ])
})

it.each([
  {
    file: 'update.yml',
    jobName: 'update',
    condition: undefined,
    command: 'Publish update',
  },
  {
    file: 'build.yml',
    jobName: 'build',
    condition: "inputs.profile == 'production'",
    command: 'Build app',
  },
])(
  'blocks unapproved production releases before credentials and publishing in $file',
  ({ file, jobName, condition, command }) => {
    const job = workflow(file).jobs[jobName]
    const gate = step(job, 'Check production release readiness')
    expect(gate.run).toBe('bun scripts/check-production-release.ts')
    expect(gate.if).toBe(condition)
    expect(job.steps.indexOf(gate)).toBeLessThan(
      job.steps.indexOf(step(job, 'Setup EAS')),
    )
    expect(job.steps.indexOf(gate)).toBeLessThan(
      job.steps.indexOf(step(job, command)),
    )
  },
)

it('uses the verified App Store Connect app for production submission', () => {
  const config = z
    .looseObject({
      submit: z.looseObject({
        production: z.looseObject({
          ios: z.looseObject({ ascAppId: z.string() }),
        }),
      }),
    })
    .parse(JSON.parse(readFileSync(path.join(root, 'eas.json'), 'utf8')))
  expect(config.submit.production.ios.ascAppId).toBe('6742069555')
})
