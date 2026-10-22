---
name: ship-status
description: 'Checks Gym delivery using read-only release evidence. Use when asking whether a change is merged, published, in TestFlight, or actually running on an installed binary.'
---

# Ship Status

## Quick start

Answer delivery questions without publishing, building, merging, installing, or
rerunning workflows. Read `.github/workflows/{preview,update,build}.yml` and use
`eas-release` to interpret the existing release path, not to trigger it.

```bash
git --no-pager status --short
git rev-parse HEAD
gh pr view --json number,state,headRefOid,mergeCommit,statusCheckRollup,url
```

## Workflow

1. Resolve the requested repository, PR, and revision. Distinguish local dirty
   changes, the PR head, the tested merge ref, and the actual merged commit.
2. Set `sha` to the revision being checked. Use read-only
   `gh run list --commit "$sha" --limit 10` and `gh run view "$run_id"` to
   inspect the matching run, jobs, and fingerprint/runtime-isolation evidence.
   A newer green run or a successful unrelated job is not evidence for this SHA.
3. Build a small evidence table; never collapse these stages into “shipped”:

   | Stage            | Required evidence                                                           |
   | ---------------- | --------------------------------------------------------------------------- |
   | Branch / PR      | Head SHA, dirty state, PR state and URL                                     |
   | CI               | Tested SHA, run/job IDs, conclusions, fingerprint release decision          |
   | Merged commit    | Actual merge commit and merge time, not just PR approval                    |
   | EAS Update       | Published update/group ID, platform, branch/channel, runtime, source SHA    |
   | Runtime          | Compatible native fingerprint and isolated app version                      |
   | Native build     | EAS build ID, source SHA, profile, version/build number, final status       |
   | TestFlight       | Submission result, processing status, tester availability                   |
   | Installed binary | Observed device, bundle/version/build, running update ID or embedded bundle |

4. Reuse existing workflow summaries and linked EAS/submission records. A build
   dispatch is not build completion; submission is not TestFlight availability;
   publication is not download or launch on a particular phone.
5. Label each conclusion **verified** (direct matching evidence), **blocked**
   (a known failed prerequisite or incompatible binary), or **unknown** (missing,
   inaccessible, or uninspected evidence). Record observation time and links.
6. Report `stage → state → revision/evidence → gap → next safe step`.
   Stop when evidence runs out; do not poll indefinitely or mutate delivery
   state to make a status answer true. Never expose tokens or Health data.

## Validation

Check a merged-but-unpublished change, a published update with an older installed
runtime, and a successful build still processing in TestFlight. Each must retain
its distinct unknown/blocked downstream stage rather than imply delivery.

For skill behavior, follow `evals/README.md` and `bun run eval:workflows` with
reviewed synthetic evidence. Wrap checks with global `stay-sharp`'s `run_silent`.
`bun run validate:ai-artifacts` checks structure, not truthful status reasoning.
