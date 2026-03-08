# Copilot Instructions for this Expo Project

These instructions capture Expo team best practices from Expo docs, GitHub issue templates, and maintainer guidance.

## Tech Stack Summary

| Layer            | Technology                                       | Version    |
| ---------------- | ------------------------------------------------ | ---------- |
| Framework        | Expo SDK                                         | 54         |
| Runtime          | React Native                                     | 0.81       |
| UI Library       | React                                            | 19.1       |
| Routing          | expo-router (file-based)                         | 6          |
| Language         | TypeScript (strict)                              | 5.9        |
| Package Manager  | Bun                                              | 1.2        |
| Backend / DB     | Supabase (Postgres + Auth)                       | JS SDK 2.x |
| State Management | Zustand                                          | 5.x        |
| Validation       | Zod                                              | 4.x        |
| Charts           | Victory Native + Skia                            | —          |
| Animations       | React Native Reanimated                          | 4.x        |
| Health Data      | react-native-health (HealthKit)                  | —          |
| Testing          | Jest + jest-expo + @testing-library/react-native | —          |
| Linting          | ESLint 9 (flat config) + Prettier                | —          |
| Pre-commit       | Husky + lint-staged                              | —          |
| Builds           | EAS Build + EAS Update                           | —          |

## Project Structure

```
src/
  app/          # expo-router file-based routes
    (tabs)/     # tab navigator group
    details/    # detail screens
  components/   # shared UI components
  constants/    # design tokens (Colors.ts)
  data/         # static data / fetch scripts
  hooks/        # custom React hooks
  lib/          # service clients (supabase.ts, healthkit.ts, env.ts)
  stores/       # Zustand stores
  types/        # TypeScript type definitions (models.ts)
  utils/        # pure utility functions
  shims/        # polyfill shims (ws.js for Supabase realtime)
  assets/       # fonts, images
```

### Import alias

Use the `@/*` path alias (mapped to `src/*` in tsconfig) for all project imports:

```ts
import { supabase } from '@/lib/supabase'
import { Exercise } from '@/types/models'
```

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

## Routing (expo-router)

- All screens live under `src/app/` using file-based routing.
- Typed routes are enabled (`experiments.typedRoutes: true`); use the generated route types.
- Group layouts with `(group)/` folders; use `_layout.tsx` for navigators.
- Dynamic routes use `[param].tsx` convention (e.g., `details/[id].tsx`).

## State Management (Zustand)

- One store per domain in `src/stores/` (e.g., `ExerciseStore.ts`).
- Use `create()` from Zustand; keep stores thin — business logic stays in the store, UI logic stays in components.
- Prefer selectors to avoid unnecessary re-renders: `useExerciseStore(s => s.exercises)`.

## Backend (Supabase)

- Supabase client is initialized in `src/lib/supabase.ts` with SSR-safe AsyncStorage adapter.
- Environment variables: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` resolved via `src/lib/env.ts`.
- Never commit Supabase keys or secrets; use `.env` / EAS secrets for builds.
- Metro config shims `ws` module for Supabase Realtime compatibility (`src/shims/ws.js`).
- Generate DB types with: `bun run generate-types`.

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
- Ship a new binary build for native code or native dependency changes.
- Maintain `runtimeVersion` strategy (`appVersion` policy) to prevent incompatible over-the-air updates.
- Prefer staged rollouts and preview channels before full production rollout.
- Roll back or republish quickly if update health degrades.

## Build and Testing Expectations

- Use development builds for production-grade app workflows; do not rely solely on Expo Go.
- Run lint and type checks before merge:
  - `bunx eslint .`
  - `bun run typecheck`
- Keep tests passing (`bunx jest`) for changed areas.
- Pre-commit hooks (Husky + lint-staged) auto-run ESLint `--fix` on staged `.ts`/`.tsx`/`.js`/`.jsx`/`.mjs` files.

## Issue and Debugging Hygiene

When creating upstream Expo issues or internal bug reports, include:

- A minimal reproducible example repository.
- Exact reproduction steps with platform + environment details.
- `npx expo-env-info` output.
- `npx expo-doctor@latest` diagnostics.

Avoid filing feature requests on Expo GitHub issues; use Expo Canny for feature requests and Discord for general questions.

## Linting and Tooling Direction

- ESLint 9 flat config (`eslint.config.mjs`) extends `expo` + Prettier.
- `eslint-plugin-unused-imports` enforces clean imports (auto-fixable).
- `react-hooks/exhaustive-deps` is enabled with dangerous autofix — review hook dependency changes carefully.
- Keep ESLint as the source of truth for Expo/React Native lint rules unless a migration is explicitly approved.
- Biome can be considered for formatting only, but do not remove Expo-aligned ESLint coverage without a migration plan and rule parity validation.

## Branching and Merge Policy

- This project uses **trunk-based development**. `main` is the trunk.
- **Never push directly to `main`.** All changes must go through a pull request.
- Before making any code changes, **create a feature branch** off `main` (e.g., `feat/`, `fix/`, `chore/`).
- After committing, push the branch and open a PR — do not commit to `main` locally.
- A Husky `pre-push` hook enforces this locally — it blocks any push while on `main`.
- Squash-merge PRs into `main` to keep a linear history.
- Delete feature branches after merge.
- **Copilot / AI agents must also follow this policy.** When making changes, always branch first, push, and create a PR. Never commit or push directly to `main`.

## Cross-Agent Rules

- `.github/copilot-instructions.md` is the **canonical** project policy file.
- Prefer short, focused, actionable rules; split large topics into separate rule files.
- Avoid duplicating general style-guide content that is already enforced by tooling (ESLint/TypeScript/tests).
- Keep sensitive data out of instruction files; use environment variables and local-only config for secrets.
