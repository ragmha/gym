import { execFileSync } from 'node:child_process'
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
  outputs: z.record(z.string(), z.string()).optional(),
  steps: z.array(stepSchema),
})
const workflowSchema = z.looseObject({
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
  const job = workflow('update.yml').jobs.update
  const guard = step(job, 'Enforce runtime isolation')
  const build = step(job, 'Trigger EAS Build on native changes')
  const publish = step(job, 'Publish update')

  expect(build.if).toBe("steps.runtime.outputs.action == 'build'")
  expect(build.run).toContain('-f platform=ios')
  expect(build.run).not.toContain('-f platform=all')
  expect(build.run).toContain('-f profile=production')
  expect(publish.if).toBe("steps.runtime.outputs.action == 'update'")
  expect(job.steps.indexOf(guard)).toBeLessThan(job.steps.indexOf(build))
  expect(job.steps.indexOf(guard)).toBeLessThan(job.steps.indexOf(publish))
})
