# Copilot Instructions for this Expo Project

These instructions capture Expo team best practices from Expo docs, GitHub issue templates, and maintainer guidance.

## What this app is

A read-only daily health dashboard. Every number on screen is read from Apple
HealthKit. There is no backend, no login, and no manual data entry.

This is the single most important constraint in the repo. The app previously
carried a second, competing architecture — manual CRUD screens on a Supabase
backend that duplicated data HealthKit already had — and that is what made it
unmaintainable. Do not reintroduce it.

Before adding a feature, check whether the data already exists in HealthKit. If
it does, read it. If it does not, adding a form, a store that persists user
input, or a network backend is a scope decision that needs explicit sign-off —
not an implementation detail to decide while coding.

The on-device AI coach (`src/lib/coach/`) inherits the same constraint. It reads
the daily HealthKit snapshot and the recovery score, and nothing else. Do not
give it persistence, a profile, or a server — its context is built solely by
`buildDailyContext`, and prompts must stay within the on-device token budget.

The opt-in Phone rest prototype is a separate Screen Time report, not a new
HealthKit sleep source. Its activity data and derived inactivity estimate stay
inside the native DeviceActivity report extension: no JS bridge, persistence,
App Group, Health writes, or coach input. Keep distribution blocked while
`expo.extra.phoneRest.distributionApproved` is false.

## Tech Stack Summary

| Layer            | Technology                                       | Version    |
| ---------------- | ------------------------------------------------ | ---------- |
| Framework        | Expo SDK                                         | 55         |
| Runtime          | React Native                                     | 0.83       |
| UI Library       | React                                            | 19.2       |
| Routing          | expo-router (file-based)                         | 55.x       |
| Language         | TypeScript (strict)                              | 5.9        |
| Package Manager  | Bun                                              | 1.2        |
| Backend / DB     | None — HealthKit is the only data source         | —          |
| State Management | Zustand (theme preference only)                  | 5.x        |
| Charts           | react-native-svg                                 | —          |
| Animations       | React Native Reanimated                          | 4.x        |
| Health Data      | @kingstinct/react-native-healthkit               | 13.x       |
| On-device AI     | react-native-apple-llm (Apple Foundation Models) | 1.x        |
| Validation       | Zod (coach output only)                          | 4.x        |
| Testing          | Jest + jest-expo + @testing-library/react-native | —          |
| Linting          | ESLint 9 (flat config) + Prettier                | —          |
| Pre-commit       | Husky + lint-staged                              | —          |
| Builds           | EAS Build + EAS Update                           | —          |

## Project Structure

```
src/
  app/                  # expo-router file-based routes
    index.tsx           #   the dashboard (root route)
    settings.tsx        #   pushed from the dashboard header
    coach.tsx           #   streaming coach chat
  components/
    dashboard/          #   dashboard sections + the ring builder
    charts/             #   heatmap and ring primitives
    health/             #   health cards (coach insight)
    common/             #   shared primitives
    themed/             #   theme-aware Text/View
  constants/            # design tokens (Colors.ts, DesignSystem.ts)
  hooks/                # custom React hooks
  lib/
    healthSnapshot/     #   the only data source
    fitnessMetrics/     #   snapshot -> presentable metric mapping
    coach/              #   on-device AI coach engines and prompts
    validators/         #   zod schemas for coach output
  stores/               # ThemeStore only
  utils/                # recovery scoring and pure helpers
  assets/               # fonts, images
```

### Import alias

Use the `@/*` path alias (mapped to `src/*` in tsconfig) for all project imports:

```ts
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
```

## Platform Priority

This project targets **iOS as the primary platform**.

### Platform hierarchy

1. **iOS** — First-class. HealthKit integration, native feel, App Store distribution.
2. **Web** — Best-effort. HealthKit has no web equivalent, so web renders
   deterministic mock data. It is a layout and design surface, not a way to see
   real health data.
3. **Android** — Best-effort. Mock data only. Do not break it, do not chase it.

### Development guidelines

- Test all changes on **iOS simulator + web browser** before merging.
- Android testing is optional unless the change touches shared native modules.
- When a library or API is iOS-only (e.g., HealthKit), gate it with `Platform.OS === 'ios'` and provide a graceful fallback or hidden UI on other platforms.
- For web, ensure components degrade gracefully — avoid `react-native` APIs that have no `react-native-web` support without a web fallback.
- Prefer `Platform.select()` over runtime `if/else` chains for platform-specific values.
- Use `.ios.tsx` / `.web.tsx` / `.native.tsx` file extensions for significant platform divergence instead of inline conditionals.
- Do not add Android-only dependencies or native modules unless they also serve iOS or web.
- EAS builds: prioritize `ios` and `web` build profiles; `android` builds are secondary.

## Routing (expo-router)

- All screens live under `src/app/` using file-based routing.
- Typed routes are enabled (`experiments.typedRoutes: true`); use the generated route types.
- The dashboard is the root route (`index.tsx`); everything else is pushed on
  top of it via the root Stack in `_layout.tsx`. There is no tab bar.
- Dynamic routes use the `[param].tsx` convention.

## State Management

- `ThemeStore` is the only Zustand store, and it holds one thing: the user's
  theme preference, persisted through AsyncStorage.
- Health data is not state to be managed. It is read per-day through
  `useHealthSnapshot(date)` and rendered. Do not cache it into a store.
- If you find yourself adding a store, first check that you are not
  reintroducing manual data entry.

## Data (HealthKit)

- `src/lib/healthSnapshot/` is the only data source. `HealthSnapshotSource` is
  the interface every screen codes against.
- `DailyHealthSnapshot` in `types.ts` is the contract. Every metric is nullable:
  missing or inaccessible measurements render `--`, never an invented `0`.
  Preserve observed zeroes. Body mass uses the latest available weigh-in.
- `iosAdapter.ts` reads real HealthKit data; `mockAdapter.ts` serves every other
  platform with deterministic seeded values.
- New metrics are added in three places: `types.ts`, `iosAdapter.ts`, and
  `mockAdapter.ts` — plus a matching read permission in `READ_PERMISSIONS`.
- The app requests **read** permissions only and never writes to Health.
  Fetch readiness and authorization-request completion do not prove read
  permission; HealthKit keeps read grants private.
- Recovery is unavailable without its required valid measurements. Display
  `--` and omit the assessment from coach context rather than substituting zeroes.
- There are no environment variables. The app runs with no configuration.

## Dependency and Versioning Policy

- Treat Expo as a versioned stack. Do not manually bump `react` / `react-native` independently from Expo recommendations.
- Always use **Bun** as the package manager (`bun install`, `bun add`, `bunx`).
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
- Use `npx expo prebuild --clean` (or `bun run native:reset`) when native generation drift is suspected.

## EAS Update and Runtime Safety

- Use EAS Update for JavaScript/UI/assets changes only.
- Any native code, dependency, or native configuration change requires a higher app version in `app.json` and `package.json` plus a new native binary, including native patch-package updates and module removals.
- Keep `runtimeVersion: { "policy": "appVersion" }`. Build numbers alone do not isolate runtimes; never reuse an old app version for incompatible native code.
- Publish through the fingerprint-gated GitHub workflows. Native changes skip preview OTA and require runtime isolation before production can dispatch a build; missing or failed detector evidence blocks release.
- Subsequent JS-only updates use the isolated runtime and cannot reach older binaries. They need a compatible new binary to be usable; passing JavaScript tests or simulator smoke checks is not proof of compatibility with an installed binary.
- Prefer staged rollouts and preview channels before full production rollout.
- Roll back or republish quickly if update health degrades.

## Build and Testing Expectations

- Use development builds for production-grade app workflows; do not rely solely on Expo Go.
- Treat testing tools as explicit Modules with CLI Interfaces:
  - PR quality gate: `bun run quality:pr`
  - Expo compatibility: `bun run expo:check` and `bun run expo:doctor`
  - Unit/component Implementation: `bun run test:unit`
  - Web compatibility check: `bun run build:web` (the static export itself is the smoke test)
  - Native smoke Adapter (iOS only): `bun run test:e2e:maestro:ios`
- Keep PR CI focused on high-Leverage, high-Locality checks: Expo compatibility, lint, typecheck, and unit/component tests.
- Browser-level E2E tests (Playwright, Cypress, etc.) and visual-regression screenshot tests are intentionally not part of the stack — they were dropped as high-noise, low-signal for an iOS-first solo project. If web ever becomes load-bearing, add browser tests that exercise behaviour, not existence.
- Keep Maestro as an iOS-only native simulator/device Adapter for local, release, or dedicated native CI. Android Maestro flows are not maintained (Android is best-effort).
- Pre-commit hooks (Husky + lint-staged) auto-run ESLint `--fix` on staged `.ts`/`.tsx`/`.js`/`.jsx`/`.mjs` files.

## Issue and Debugging Hygiene

When creating upstream Expo issues or internal bug reports, include:

- A minimal reproducible example repository.
- Exact reproduction steps with platform + environment details.
- `npx expo-env-info` output.
- `npx expo-doctor@latest` diagnostics.

Avoid filing feature requests on Expo GitHub issues; use Expo Canny for feature requests and Discord for general questions.

## Deprecated Code Policy

- **Never generate or commit code that uses deprecated APIs.** This is a hard rule.
- Before calling any library method, verify it is not deprecated in the installed version.
- When editing a file, fix any deprecated calls in lines you touch.
- Use the `no-deprecated-code` skill (`.github/skills/no-deprecated-code/SKILL.md`) for the full deprecation lookup tables and verification workflow.
- Run `bun run typecheck` and check for TS6385/TS6387 deprecation warnings before committing.

## Post-Task Code Review (Mandatory)

- **Every coding task must end with a multi-model code review before committing.** This is a hard rule.
- After completing any task, review all changed files through 5 passes: security, correctness, performance, deprecated APIs, and style.
- Fix all **CRITICAL** and **HIGH** severity issues before committing.
- When sub-agents are available, launch parallel reviewers for independent passes to maximize coverage.
- Use the `post-task-code-review` skill (`.github/skills/post-task-code-review/SKILL.md`) for the full checklist and multi-model workflow.
- Re-run `bun run lint`, `bun run typecheck`, and `bunx jest` after applying fixes to confirm a clean state.

## Linting and Tooling Direction

- ESLint 9 flat config (`eslint.config.mjs`) extends `expo` + Prettier.
- `eslint-plugin-unused-imports` enforces clean imports (auto-fixable).
- `react-hooks/exhaustive-deps` is enabled with dangerous autofix — review hook dependency changes carefully.
- Keep ESLint as the source of truth for Expo/React Native lint rules unless a migration is explicitly approved.
- Biome can be considered for formatting only, but do not remove Expo-aligned ESLint coverage without a migration plan and rule parity validation.

## Branching and Merge Policy

- This project uses **trunk-based development**. `main` is the trunk.
- **Never push directly to `main`.** All changes must go through a pull request.
- **Prefer `git worktree`** over branch switching to keep the main checkout on `main` at all times.
- Squash-merge PRs into `main` to keep a linear history.
- **Copilot / AI agents must also follow this policy.** Never commit or push directly to `main`.
- Use the `trunk-based-development` skill for the full workflow (branching, worktrees, conventional commits).

## Cross-Agent Rules

- `.github/copilot-instructions.md` is the **canonical** project policy file.
- Prefer short, focused, actionable rules; split large topics into separate rule files.
- Avoid duplicating general style-guide content that is already enforced by tooling (ESLint/TypeScript/tests).
- Keep sensitive data out of instruction files; use environment variables and local-only config for secrets.
