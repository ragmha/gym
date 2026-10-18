---
name: eas-release
description: 'Guides safe Expo EAS releases for this app, choosing OTA updates versus native builds and GitHub workflows. Use when preparing an Expo release, publishing EAS Update, running build.yml, or checking runtimeVersion safety.'
---

# EAS Release

## Quick start

Don't classify changes by hand. Open a PR to `main`. The `preview` workflow's **PR Quality Gates** job fingerprints the native layer with `@expo/fingerprint`. Its run summary shows **Release path: OTA update** or **Release path: native build**.

- **OTA update:** the PR gets an iOS preview update on branch `pr-<number>`. When merged, `update.yml` publishes to the `production` channel.
- **Native build:** bump `version` in both `app.json` and `package.json` (the job fails without it). When merged, `update.yml` calls `build.yml` and auto-submits to TestFlight.

## Workflow

1. Expect a native build for native dependencies, config plugins, or native `app.json` fields. JS, UI, and assets ship as OTA. The fingerprint job is the authority, not this list.
2. Keep `runtimeVersion` on the `appVersion` policy so OTA updates never reach incompatible binaries.
3. Publish only through the fingerprint-gated workflows. Do not run `eas update` by hand; it bypasses the guard.
4. Batch native changes to keep most merges on the fast OTA path. Prioritize iOS, keep web unaffected, and treat Android as best-effort.
5. Monitor EAS build/update output and roll back or republish if production health regresses.

## Validation

Run before release changes merge:

```bash
bun run lint
bun run typecheck
bunx expo-doctor@latest
```

Verify the release path matches the change type and that required workflow secrets are present without printing token values.

## Guardrails

- Never ship native dependency or config-plugin changes with OTA only.
- Do not push directly to `main`; releases must come from reviewed PRs.
- Do not commit EAS, Apple, Google, or Supabase secrets.
- Keep release automation aligned with Bun, Expo SDK 55, and the existing GitHub workflow files.
