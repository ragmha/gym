---
name: eas-release
description: 'Guides safe Expo EAS releases for this app, choosing OTA updates versus native builds and GitHub workflows. Use when preparing an Expo release, publishing EAS Update, running build.yml, or checking runtimeVersion safety.'
---

# EAS Release

## Quick start

For status-only questions use `ship-status`; do not publish to answer them.
For an authorized release, inspect the PR to `main` and the `preview` workflow's
**PR Quality Gates** job. It fingerprints the native layer with
`@expo/fingerprint` and reports **Release path: OTA update** or
**Release path: native build**. Missing/failed detector evidence blocks release.

- **OTA update:** eligible same-repository PRs get an iOS preview on
  `pr-<number>`; guarded `update.yml` publishes to `production` after merge.
- **Native build:** bump `version` in both `app.json` and `package.json`.
  Skip preview OTA; guarded `update.yml` calls `build.yml` for a new iOS binary
  and automatic submission. Submission does not prove TestFlight availability.

Use installed global `eas-update` / `eas-app-stores` for generic API mechanics,
but retain Gym's guarded workflow ownership; do not vendor those skills.

## Workflow

1. Expect a new binary for native code/dependencies/config, including patches
   and removals. Verify candidate/baseline SHAs, fingerprints, and runtime
   isolation in the actual run, not a hand-classified list or another green run.
2. Keep `runtimeVersion` on the `appVersion` policy with a higher, matching app
   version for native changes. Build numbers alone do not isolate runtimes.
   JS-only follow-ups still require that compatible binary to be installed.
3. Publish only through fingerprint-gated workflows; do not run `eas update`
   by hand. Honor production-readiness/distribution restrictions, signing,
   entitlements, and `build.yml`'s guarded automatic-submission path.
4. Before promotion, record the known-good commit/update group, channel,
   runtime, and native build. For a regression, stop further promotion and
   recover through the approved release path to a compatible known-good update
   or native fix. An OTA rollback cannot undo native incompatibility.
5. Verify update IDs/runtime/channel, build completion, submission, processing,
   and tester availability separately. Report installed version/build/running
   update only from device evidence; a workflow's intent is not delivery.

## Validation

Wrap pre-merge checks with global `stay-sharp`'s `run_silent`:

```bash
run_silent "lint" "bun run lint"
run_silent "typecheck" "bun run typecheck"
run_silent "Expo Doctor" "bunx expo-doctor@latest"
```

Verify the release path against exact run evidence and secret presence without
printing tokens. Keep releases behind reviewed PRs, never direct pushes to
`main`, and never commit credentials. Prioritize iOS, keep web unaffected, and
treat Android as best-effort. Keep Bun/Expo SDK 55 and existing workflows aligned.
Follow `evals/README.md` for synthetic release/status cases; structural skill
validation and simulator smoke tests do not prove installed-binary delivery.
