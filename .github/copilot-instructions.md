# Copilot Instructions for this Expo Project

These instructions capture Expo team best practices from Expo docs, GitHub issue templates, and maintainer guidance.

## Platform Priority

This project targets **iOS and Web as primary platforms**, with **minimal Android support**.

### Platform hierarchy

1. **iOS** — First-class. HealthKit integration, native feel, App Store distribution.
2. **Web** — First-class. Static output via Metro bundler, responsive layouts.
3. **Android** — Best-effort. Do not break it, but do not block iOS/web work for Android parity.

### Development guidelines

- Test all changes on **iOS simulator + web browser** before merging.
- Android testing is optional unless the change touches shared native modules.
- When a library or API is iOS-only (e.g., HealthKit), gate it with `Platform.OS === 'ios'` and provide a graceful fallback or hidden UI on other platforms.
- For web, ensure components degrade gracefully — avoid `react-native` APIs that have no `react-native-web` support without a web fallback.
- Prefer `Platform.select()` over runtime `if/else` chains for platform-specific values.
- Use `.ios.tsx` / `.web.tsx` / `.native.tsx` file extensions for significant platform divergence instead of inline conditionals.
- Do not add Android-only dependencies or native modules unless they also serve iOS or web.
- EAS builds: prioritize `ios` and `web` build profiles; `android` builds are secondary.

## Dependency and Versioning Policy

- Treat Expo as a versioned stack. Do not manually bump `react` / `react-native` independently from Expo recommendations.
- Prefer `npx expo install --check` and `npx expo install --fix` for dependency alignment.
- Use `npx expo-doctor@latest` after dependency changes and resolve reported issues before merging.
- Avoid broad ecosystem-wide upgrades (`ncu -u`) unless explicitly planned and validated.
- Keep monorepo compatibility fixes conservative; prioritize Expo-supported versions first.

## SDK Upgrade Workflow

- Upgrade Expo SDK incrementally, one SDK version at a time.
- For each SDK jump:
  1. Update `expo` to the target SDK range.
  2. Run `npx expo install --fix`.
  3. Run `npx expo-doctor@latest`.
  4. Review the Expo SDK release notes for required manual steps.
- Do not skip directly across multiple SDK versions unless unavoidable.

## Native Workflow (CNG / Prebuild)

- Prefer Continuous Native Generation (CNG) patterns where practical.
- Use app config + config plugins over hand-editing generated native files.
- If `android/` and `ios/` are generated artifacts in a CNG workflow, regenerate with Prebuild rather than making long-lived manual edits.
- Use `npx expo prebuild --clean` when native generation drift is suspected.

## EAS Update and Runtime Safety

- Use EAS Update for JavaScript/UI/assets changes only.
- Ship a new binary build for native code or native dependency changes.
- Maintain `runtimeVersion` strategy to prevent incompatible over-the-air updates.
- Prefer staged rollouts and preview channels before full production rollout.
- Roll back or republish quickly if update health degrades.

## Build and Testing Expectations

- Use development builds for production-grade app workflows; do not rely solely on Expo Go.
- Run lint and type checks before merge:
  - `bunx eslint .`
  - `bun run typecheck`
- Keep tests passing (`bunx jest`) for changed areas.

## Issue and Debugging Hygiene

When creating upstream Expo issues or internal bug reports, include:

- A minimal reproducible example repository.
- Exact reproduction steps with platform + environment details.
- `npx expo-env-info` output.
- `npx expo-doctor@latest` diagnostics.

Avoid filing feature requests on Expo GitHub issues; use Expo Canny for feature requests and Discord for general questions.

## Linting and Tooling Direction

- Keep ESLint as the source of truth for Expo/React Native lint rules unless a migration is explicitly approved.
- Biome can be considered for formatting only, but do not remove Expo-aligned ESLint coverage without a migration plan and rule parity validation.

## Cross-Agent Rules (Cursor + Claude)

- Keep these files synchronized when updating project guidance:
  - `.github/copilot-instructions.md` (canonical policy)
  - `.cursor/rules/expo-project.mdc` (Cursor project rule)
  - `CLAUDE.md` (Claude Code project memory)
- Prefer short, focused, actionable rules; split large topics into separate rule files.
- Scope rules where possible (path-based in `.claude/rules/*.md` or Cursor frontmatter) instead of one oversized instruction file.
- Avoid duplicating general style-guide content that is already enforced by tooling (ESLint/TypeScript/tests).
- Keep sensitive data out of instruction files; use environment variables and local-only config for secrets.
