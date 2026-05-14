---
name: eas-release
description: 'Guides safe Expo EAS releases for this app, choosing OTA updates versus native builds and GitHub workflows. Use when preparing an Expo release, publishing EAS Update, running build.yml, or checking runtimeVersion safety.'
---

# EAS Release

## Quick start

For JavaScript, UI, or asset-only changes, keep `app.json` on `runtimeVersion` policy `appVersion`, validate locally, then publish through `.github/workflows/update.yml` or run:

```bash
eas update --auto
```

For native changes, skip OTA and trigger the production build workflow:

```bash
gh workflow run build.yml --ref main -f platform=ios -f profile=production
```

## Workflow

1. Classify the change: JS/assets can use EAS Update; native dependencies, config plugins, `app.json` native fields, or generated native projects require EAS Build.
2. Confirm `runtimeVersion` still prevents incompatible OTA updates; this repo uses the `appVersion` policy.
3. For OTA, merge through PR to `main` and let `update.yml` publish after the native fingerprint check, or run `eas update --auto` only with a valid `EXPO_TOKEN`.
4. For native releases, use `build.yml` with `profile=production`; prioritize iOS, keep web unaffected, and treat Android as best-effort.
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
