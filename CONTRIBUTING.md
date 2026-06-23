# Contributing to gym

Welcome! This document is a single-page reference for new and existing contributors. Read **§1 First-time setup** before opening a PR. Skim **§4 Coding standards** and **§5 Branch & PR flow** every time.

---

## 1. First-time setup

```bash
# Prerequisites
brew install bun                 # JS runtime + package manager
brew install --cask cursor       # or your preferred editor
brew install gh                  # GitHub CLI for PRs

# Clone + install
git clone git@github.com:ragmha/gym.git
cd gym
bun install
cp .env.example .env.local       # fill in EXPO_PUBLIC_SUPABASE_* values

# Verify the toolchain
bun run lint
bun run typecheck
bunx jest --no-watchman
bunx expo-doctor@latest          # 18/18 should pass
```

If any of those four don't pass on a clean clone, **stop and ask** — something on the trunk is broken.

---

## 2. Tech stack

| Layer       | Tool                                             | Notes                                                        |
| ----------- | ------------------------------------------------ | ------------------------------------------------------------ |
| Framework   | Expo SDK 55 + React Native 0.83                  | Pinned via `expo install`; never bump RN/React independently |
| Routing     | expo-router (typed)                              | File-based under `src/app/`                                  |
| State       | Zustand v5 + persist                             | One store per domain in `src/stores/`                        |
| Backend     | Supabase (Postgres + Auth)                       | JS SDK 2.x, anon key only today                              |
| Validation  | Zod v4                                           | Top-level schemas (`z.email()` not `.string().email()`)      |
| AI Coach    | react-native-apple-llm                           | On-device Apple Foundation Models (iOS only)                 |
| Tests       | Jest (jest-expo) + @testing-library/react-native | Co-located in `__tests__/`                                   |
| Lint/format | ESLint 9 (flat config) + Prettier                | `eslint --fix` runs on staged files                          |
| Hooks       | Husky + lint-staged                              | Pre-commit auto-formats                                      |

Platform priority: **iOS first**, **web first-class**, **Android best-effort**.

---

## 3. Day-to-day commands

| Command                                  | When                                                |
| ---------------------------------------- | --------------------------------------------------- |
| `bun run start`                          | Start Metro for `bun run ios` / dev build           |
| `bun run ios`                            | Build + run on iOS simulator                        |
| `bun run web`                            | Open Expo Web in browser                            |
| `bun run lint`                           | ESLint over `**/*.{ts,tsx,js,mjs}`                  |
| `bun run typecheck`                      | `tsc --noEmit`                                      |
| `bun run test`                           | Jest unit/component tests                           |
| `bun run build:web`                      | Static export → `dist/` (also the web smoke check)  |
| `bun run db:migrate`                     | `supabase db push` (requires `bunx supabase login`) |
| `bun run generate-types`                 | Regenerate `src/lib/database.types.ts`              |
| `bunx knip` or `bun run check:dead-code` | Find unused files / deps / exports                  |
| `bunx expo-doctor@latest`                | Verify SDK alignment (must stay 18/18)              |

---

## 4. Coding standards

### TypeScript

- **Strict mode**, no `any` (use `unknown` or proper generics). `@ts-expect-error` with explanation only.
- `@/*` import alias for everything in `src/` — no `../../../`.
- Zod is the single source of truth for any data shape that crosses a boundary (Supabase, AI parser, API responses).

### Architecture vocabulary

We use the language from `.github/skills/improve-codebase-architecture/`:

- **Module / Interface / Implementation / Depth / Seam / Adapter / Leverage / Locality**
- Avoid: "component", "service", "API", "boundary" (overloaded with DDD bounded context).
- Each domain Module exposes **one** Interface; adapters at seams stay swappable (see `src/lib/aiParser/`, `src/lib/healthSnapshot/`, `src/lib/coach/`, `src/lib/offlineFirstQuery/`).

### State

- One Zustand store per domain in `src/stores/` (`MealStore`, `WeightStore`, `HydrationStore`, `WorkoutSessionStore`, `ExerciseStore`).
- Store actions own logic; UI files own rendering. If a screen reaches into a store's internal shape, the store is too shallow — deepen the Module.
- Use `useShallow` for selecting multiple fields.

### Tests

- New stores must have a `__tests__/StoreName-test.ts`.
- New presenters / parsers / pure utils must have a unit test.
- Wrap store mutations in `act(...)` and add `afterEach(cleanup)` if you use `renderHook`.
- Tests assert on **observable behavior through the interface**, not internal state. If a test breaks on a refactor that didn't change behavior, the test is asserting past the seam.

### React Native

- Platform-gate native APIs: `if (Platform.OS === 'ios') ...` for HealthKit and similar.
- Prefer `Platform.select()` for static values; use `.ios.tsx` / `.web.tsx` extensions for divergent layouts.
- No deprecated APIs (see `.github/skills/no-deprecated-code/`).

### Supabase

- **Never expose the service-role key in the client.** Only `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ships with the app.
- Migrations live in `supabase/migrations/` with `YYYYMMDDHHMMSS_description.sql` naming.
- After applying a migration to remote DB, run `bun run generate-types` and commit the regenerated `src/lib/database.types.ts`.
- RLS is currently permissive (single-tenant). Tighten when user auth lands.

---

## 5. Branch & PR flow

1. **Trunk-based**: `main` is the trunk. Never push to `main` directly — Husky pre-push enforces this.
2. **Branch naming**: `<type>/<scope>` — e.g. `feat/nutrition-tracker`, `chore/cleanup-deps`, `fix/ci-build-env`.
3. **Conventional commits**: `<type>(<scope>): <description>`. Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `ci`.
4. **One PR = one logical change**. Don't bundle a refactor with a bugfix.
5. **PR template**: include a Summary, Verification (commands + results), Out-of-scope, and (optional) screenshots.
6. **Co-author trailer** for AI-assisted commits:
   ```
   Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
   ```
7. **Squash-merge** to keep history linear. Delete the branch on merge.
8. **Worktrees over branch-switching** — see `.github/skills/git-worktree/SKILL.md`.

---

## 6. CI workflows

| Workflow                 | Trigger         | What it does                                                  |
| ------------------------ | --------------- | ------------------------------------------------------------- |
| **PR Quality Gates**     | Every PR        | `expo:check`, `expo:doctor`, `lint`, `typecheck`, `test:unit` |
| **EAS Update (preview)** | Every PR        | Publishes a preview channel for hot-swap testing              |
| **CodeQL**               | Every PR        | Security scan                                                 |
| **anti-slop**            | Every PR        | Generated-code quality gate                                   |
| **update**               | Push to `main`  | EAS Update production (aborts on native changes)              |
| **build**                | Manual dispatch | EAS Build for iOS/Android                                     |

If a PR is blocked by a check that's red on `main`, fix `main` first.

---

## 7. Native builds (EAS)

```bash
# Simulator dev build (fast, uses local ios/ folder)
bun run ios

# Physical iOS device with Metro hot reload (10–30 min on EAS)
bunx eas-cli build --platform ios --profile development-device

# Production build for App Store
bunx eas-cli build --platform ios --profile production
```

Native dependency added (e.g. `expo-camera`, `expo-image-picker`)? **Re-run a dev build** — EAS Updates only ship JS/asset changes.

---

## 8. Where to find things

| Topic                                                 | Location                                                         |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| Domain glossary                                       | `CONTEXT.md`                                                     |
| Architecture decisions (ADRs)                         | `docs/adr/` (if present)                                         |
| Skills (project conventions encoded as agent recipes) | `.github/skills/`                                                |
| Workflow definitions                                  | `.github/workflows/`                                             |
| Maestro flows (native E2E)                            | `.maestro/flows/`                                                |
| Playwright tests (web visual)                         | `e2e/`                                                           |
| Supabase schema                                       | `supabase/migrations/`, `supabase/seed.sql`                      |
| Generated types                                       | `src/lib/database.types.ts` (regen via `bun run generate-types`) |

---

## 9. Asking for help

- **Build/run problem on a clean clone** → check `.github/skills/expo-cicd-workflows/`, then ask in the team chat.
- **Architecture question** → invoke the `improve-codebase-architecture` skill; we use it for reviews.
- **Bug** → file an issue with reproduction steps, `bunx expo-env-info`, and `bunx expo-doctor` output.
- **Idea or feature request** → discuss in chat first; large changes need an ADR before implementation.

Welcome aboard.
