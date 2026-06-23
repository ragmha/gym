# gym

Expo React Native gym tracker with Supabase backend.

## 1) Quick Start

### Prerequisites

- [Bun](https://bun.sh/) 1.2+ (`bun --version`)
- Node.js 20+ (required by some Expo CLI tooling)
- Expo Go on phone, **or** Xcode for iOS simulator / Android Studio for emulator

### Install

```bash
bun install
```

### Configure Environment

Create `.env.local` in the project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-anon-key>
```

The app resolves these via `src/lib/env.ts` → `src/lib/supabaseEnv.ts`, which validates values with Zod. Missing vars are gracefully handled in development (falls back to mock data).

### Verify DB Connectivity

```bash
bun run db:debug
```

### Run the App

```bash
bun run start          # Expo dev server (QR code)
bun run ios            # iOS simulator
bun run android        # Android emulator
bun run web            # Web browser (Metro bundler)
```

## 2) Day-to-Day Commands

| Command                        | Description                                       |
| ------------------------------ | ------------------------------------------------- |
| `bun run quality:pr`           | PR gate: Expo checks, lint, typecheck, unit tests |
| `bun run expo:check`           | Verify Expo SDK dependency alignment              |
| `bun run expo:doctor`          | Run Expo Doctor diagnostics                       |
| `bun run lint`                 | ESLint (flat config + Prettier)                   |
| `bun run typecheck`            | TypeScript `--noEmit`                             |
| `bun run test`                 | Jest via jest-expo                                |
| `bun run test:unit`            | Explicit Jest unit/component Interface            |
| `bun run test:e2e:maestro:ios` | Maestro iOS native smoke flows                    |
| `bun run test:watch`           | Jest in watch mode                                |
| `bun run db:debug`             | Verify Supabase connectivity                      |
| `bun run generate-types`       | Regenerate Supabase DB types                      |
| `bun run db:migrate`           | Push Supabase migrations                          |
| `bun run db:reset`             | Reset Supabase DB                                 |
| `bun run prebuild:clean`       | Regenerate native projects (CNG)                  |
| `bun run native:reset`         | Full native reset (rm + prebuild)                 |

## 3) Project Structure

Source code lives under `src/`, grouped by responsibility. Components are
organised by **domain** rather than alphabetically — when a feature changes,
its surface area is contained inside a single subfolder.

```text
src/
  app/                          # expo-router file-based routes
    _layout.tsx                 #   root Stack: registers tabs + modal screens
    +html.tsx                   #   web HTML shell
    +not-found.tsx
    (tabs)/                     #   tab navigator (home, workouts, nutrition, settings)
      _layout.tsx
      index.tsx                 #     home / dashboard
      workouts.tsx
      nutrition.tsx
      settings.tsx
      __tests__/
    details/[id].tsx            #   workout detail screen
    nutrition/                  #   meal scan + edit screens (router.push targets)
      scan.tsx
      edit/[id].tsx
    exercise-edit.tsx           #   modal screens registered in root _layout
    fitness-metrics.tsx
    hydration.tsx
    steps.tsx
    weight.tsx
    coach.tsx                   #   AI coach conversational interface

  components/                   # UI components, grouped by domain
    common/                     #   cross-domain primitives (CircularProgress, ProgressCard, Header, ErrorBoundary)
    themed/                     #   theme-aware base components (ThemedText, ThemedView)
    ui/                         #   visual primitives (Chip, SegmentedTabs)
    navigation/                 #   TabBarIcon
    charts/                     #   MiniCharts, WeightBarChart, ActivityRings, ActivityHeatmap
    dashboard/                  #   CalendarStrip, WorkoutXPCard
    workout/                    #   Workout, WorkoutDetail, WorkoutProgress, WorkoutCompleteModal, RestTimer, VideoPlayer
    health/                     #   DailySteps, HealthMetrics, CoachInsightCard
    weight/                     #   WeightGoalSheet
    # Each subfolder owns its own __tests__/ when tests exist.

  constants/                    # design tokens
    Colors.ts                   #   semantic colour palette (light + dark)
    DesignSystem.ts             #   Spacing, Radii, Typography, Elevation

  hooks/                        # cross-cutting hooks
    useColorScheme.ts / .web.ts #   platform-split theme detection
    useThemeColor.ts
    useHealthSnapshot.ts
    useDailyCoachInsight.ts     #   on-device AI coach insight cache + hook

  lib/                          # service layer
    env.ts                      #   single env resolver
    supabaseEnv.ts              #   Zod-validated Supabase env
    supabase.ts                 #   Supabase client (typed via Database)
    database.types.ts           #   types derived from Zod schemas
    validators/                 #   Zod schemas for all Supabase rows + payloads (one file per domain)
    aiParser/                   #   meal photo → ParsedMeal (mock today, pluggable)
    foodDatabase/               #   barcode lookup (mock today, pluggable)
    healthSnapshot/             #   DailyHealthSnapshot source w/ iOS + mock adapters
    fitnessMetrics/             #   presenter that joins snapshots + stores for the UI
    offlineFirstQuery/          #   reusable cache-then-fetch query helper used by stores
    coach/                      #   AI Coach: Apple Foundation Models on iOS, mock fallback elsewhere
    workoutEfficiency/          #   workout session performance metrics (volume, density, completion)

  stores/                       # Zustand stores (one per domain)
    ExerciseStore.ts            #   workout templates + completion state
    WorkoutSessionStore.ts      #   active session + completed-session history
    HydrationStore.ts
    MealStore.ts                #   meals + daily nutrition selectors
    WeightStore.ts
    ThemeStore.ts               #   theme preference (light/dark/system)
    __tests__/                  #   *.test.ts colocated

  types/models.ts               # UI-facing types (templates, sessions) — re-exports lib/validators types
  utils/                        # pure helpers (recovery, getRandomPastelColor)
  shims/ws.js                   # ws polyfill for Supabase Realtime (wired via metro.config.js)
  assets/                       # fonts, images

supabase/
  config.toml                   # local Supabase CLI config
  seed.sql                      # exercises seed data
  migrations/                   # SQL migrations (one file per table)

.maestro/flows/                 # iOS-only native smoke flows (Android intentionally not maintained)
.github/
  workflows/                    # CI/CD (preview, build, update, triage)
  skills/                       # reusable Copilot skill packs
  instructions/                 # Copilot instruction files
  copilot-instructions.md       # canonical agent policy
```

### Import alias

Use `@/*` (mapped to `src/*` in tsconfig) for **all** project imports. Avoid
relative paths that climb out of a folder (`../../`).

```ts
import { supabase } from '@/lib/supabase'
import { ProgressCard } from '@/components/common/ProgressCard'
import { useExerciseStore } from '@/stores/ExerciseStore'
import type { WorkoutTemplate } from '@/types/models'
```

### Test conventions

- Test files use the `*.test.ts(x)` suffix and live in `__tests__/` next to the
  code under test. Snapshots go in `__tests__/__snapshots__/`.
- Component tests live in the component's domain folder
  (e.g. `src/components/workout/__tests__/`), not in a global test directory.

## 4) Architecture

The app is a thin UI layer on top of a small set of Zustand stores. Stores own
all I/O: they read from Supabase, fall back to local cache via the offline-first
query helper, validate everything with Zod, and expose UI-shaped selectors.
HealthKit data flows through a single adapter so iOS, mock, and (future) web
sources share one interface.

The on-device AI Coach runs entirely locally on iOS (via Apple Foundation Models /
react-native-apple-llm) and falls back to deterministic mock responses elsewhere.
Daily insights are cached at the hook level to avoid redundant model inference on
every HealthKit refresh.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                            React Native App                                  │
│   Expo Router screens (src/app) + domain components (src/components/*)       │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │ selectors / actions
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                       Zustand stores (one per domain)                        │
│                                                                              │
│  ExerciseStore         workout templates + per-set completion                │
│  WorkoutSessionStore   active session, completed sessions history            │
│  HydrationStore        water intake + daily summary                          │
│  MealStore             meals + daily nutrition aggregation                   │
│  WeightStore           body-weight entries + goal                            │
│  ThemeStore            theme preference (persisted)                          │
│                                                                              │
│  Every store:                                                                │
│   1) Reads via lib/offlineFirstQuery (cache-then-fetch)                      │
│   2) Validates rows + payloads with lib/validators (Zod)                     │
│   3) Falls back to local/mock state when Supabase is unreachable             │
└───────────────────┬───────────────────────────┬──────────────────────────────┘
                    │                           │
                    │ supabase-js               │ DailyHealthSnapshot
                    ▼                           ▼
┌──────────────────────────┐    ┌──────────────────────────────────────────────┐
│         Supabase         │    │       lib/healthSnapshot (adapters)          │
│  exercises               │    │   iosAdapter   → @kingstinct/healthkit       │
│  weight_entries          │    │   mockAdapter  → deterministic demo data     │
│  daily_health_snapshots  │    │   HealthSnapshotSource picks per Platform.OS │
│  workout_sessions        │    └──────────────────────────────────────────────┘
│  meals                   │
│  RLS enabled on all      │    lib/coach (AI Coach adapters)
└──────────────────────────┘      appleFMAdapter → react-native-apple-llm (iOS)
                                  mockAdapter     → deterministic placeholders
                                  activeCoachEngine lazy-resolves on first use

                                lib/fitnessMetrics combines snapshots +
                                hydration + meals + recovery for the
                                fitness-metrics screen.
```

Other building blocks worth knowing:

- **`lib/aiParser`** — pluggable meal-photo parser; `mockParser` is the only
  implementation today. `index.ts` is the single seam: callers import
  `activeParser` from `@/lib/aiParser` and swap backends by editing that one
  file.
- **`lib/foodDatabase`** — pluggable barcode lookup; same shape as `aiParser`.
- **`lib/coach`** — pluggable AI Coach interface with two adapters:
  `appleFMAdapter` (iOS, react-native-apple-llm) and `mockAdapter` (all other
  platforms). `activeCoachEngine` lazy-resolves on first use and caches the
  result. Domain context builders live in `context/`; prompt templates in
  `prompts/`.
- **`lib/workoutEfficiency`** — computes performance metrics (volume, density,
  completion rate) for a completed session, comparing it to prior sessions of
  the same template. Used by the post-workout narration and the workout detail
  screen.
- **`utils/recovery`** — pure recovery-score math + `useRecoveryPresentation`
  hook. Used by the dashboard and `lib/fitnessMetrics`.
- **`hooks/useDailyCoachInsight`** — caches AI-generated daily insights by a
  bucketed snapshot key so the on-device model regenerates only when coaching
  inputs meaningfully change, not on every HealthKit refresh.

## 5) Database Schema

All tables live in `public.` and have RLS enabled. Each migration is one file
under `supabase/migrations/`. Generated types live at `src/lib/database.types.ts`
(regenerate with `bun run generate-types`).

| Table                    | Migration  | Purpose                                                            |
| ------------------------ | ---------- | ------------------------------------------------------------------ |
| `exercises`              | `20260308` | Workout templates: day/week, title, cardio JSONB, exercises JSONB. |
| `weight_entries`         | `20260309` | One body-weight entry per date (`UNIQUE(date)`), optional note.    |
| `daily_health_snapshots` | `20260310` | Aggregated daily health (steps, sleep, HRV, RHR, recovery, …).     |
| `workout_sessions`       | `20260315` | Completed-session metrics: duration, volume, sets, cardio min.     |
| `meals`                  | `20260514` | Logged meals + macros, `source ∈ {photo, barcode, manual}`.        |

```text
public.exercises                         public.weight_entries
├─ id            UUID PK                 ├─ id            UUID PK
├─ day           TEXT                    ├─ date          DATE UNIQUE
├─ week          TEXT                    ├─ weight_kg     NUMERIC(5,2)  [0–500]
├─ title         TEXT                    ├─ note          TEXT
├─ videoURL      TEXT                    └─ created_at / updated_at
├─ cardio        JSONB { morning, evening }
├─ exercises     JSONB[{ id, title, sets|"To Failure", reps, variation }]
└─ created_at / updated_at

public.daily_health_snapshots            public.workout_sessions
├─ id              UUID PK               ├─ id                   UUID PK
├─ date            DATE UNIQUE           ├─ exercise_day/week    TEXT
├─ steps           INTEGER               ├─ title                TEXT
├─ calories        NUMERIC(8,2)          ├─ started_at           TIMESTAMPTZ
├─ sleep_minutes   INTEGER               ├─ completed_at         TIMESTAMPTZ
├─ hrv             NUMERIC(6,2)          ├─ duration_seconds     INTEGER
├─ resting_hr      NUMERIC(5,2)          ├─ total_volume_kg      NUMERIC(10,2)
├─ heart_rate      NUMERIC(5,2)          ├─ sets_completed       INTEGER
├─ water_liters    NUMERIC(5,3)          ├─ total_sets           INTEGER
├─ recovery_score  INTEGER  [0–100]      ├─ exercises_completed  INTEGER
├─ strain_score    NUMERIC(4,1) [0–21]   ├─ total_exercises      INTEGER
└─ created_at / updated_at               ├─ cardio_minutes       INTEGER
                                         ├─ notes                TEXT
public.meals                             └─ created_at / updated_at
├─ id              UUID PK
├─ date            DATE
├─ consumed_at     TIMESTAMPTZ
├─ name            TEXT
├─ calories_kcal   NUMERIC(7,2)   [0–10000]
├─ protein_g/carb_g/fat_g  NUMERIC(6,2)  [0–1000]
├─ source          TEXT  CHECK IN ('photo','barcode','manual')
├─ photo_url / barcode    TEXT
├─ ai_confidence   NUMERIC(3,2)   [0–1, nullable]
└─ created_at / updated_at
```

**Row Level Security**: every table is `ENABLE ROW LEVEL SECURITY`. The current
policy set allows anonymous reads + writes (matching the offline-first, no-auth
client). When auth is introduced, tighten policies in each migration before
rolling out.

## 6) Data Validation

All database I/O is validated with [Zod](https://zod.dev/) schemas in
`src/lib/validators/` (barrel `index.ts`) — it is the **single source of truth** for row shapes.
`src/lib/database.types.ts` derives `Database['public']` from those schemas, so
the Supabase client is statically typed against the same definitions used at
runtime.

| Schema                                    | Purpose                                    |
| ----------------------------------------- | ------------------------------------------ |
| `exerciseRowSchema` / `Insert` / `Update` | Workout templates (`exercises` table).     |
| `weightEntryRowSchema` / `Insert`         | Body-weight entries.                       |
| `dailyHealthSnapshotSchema`               | Persisted health snapshots.                |
| `workoutSessionRowSchema` / `Insert`      | Completed workout sessions.                |
| `mealRowSchema` / `Insert`                | Meal log rows.                             |
| `parsedMealSchema`                        | AI/barcode parser output (`lib/aiParser`). |

TypeScript types are derived via `z.infer` (e.g. `ExerciseRow`, `WeightEntry`,
`Meal`, `WorkoutSessionInsert`) and re-exported from `src/types/models.ts` for
UI-facing code.

## 7) CI/CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow    | Trigger         | Description                                                  |
| ----------- | --------------- | ------------------------------------------------------------ |
| **preview** | Pull request    | Expo compatibility, lint, typecheck, unit tests, EAS preview |
| **update**  | Push to `main`  | EAS Update production (aborts on native changes)             |
| **build**   | Manual dispatch | EAS Build (iOS/Android, any profile)                         |

The **preview** workflow runs on every PR and gates merges on `bun run expo:check`,
`bun run expo:doctor`, `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
This keeps the PR Interface aligned with Expo SDK compatibility without forcing
device/simulator-only Adapters into GitHub-hosted runners.

## 8) Native Workflow (CNG)

This project uses Expo Continuous Native Generation (CNG).

- `ios/` and `android/` are generated artifacts and git-ignored.
- Native configuration lives in `app.json` and config plugins.
- Plugins: `expo-router`, `expo-font`, `expo-image-picker`, `expo-camera`, `@kingstinct/react-native-healthkit`.

Regenerate native projects:

```bash
bun run prebuild:clean    # regenerate ios/ and android/
bun run native:reset      # rm -rf ios android && prebuild --clean
```

## 9) Platform Support

| Platform | Priority    | Notes                                           |
| -------- | ----------- | ----------------------------------------------- |
| iOS      | First-class | HealthKit integration, App Store distribution   |
| Web      | First-class | Metro bundler, static output, responsive layout |
| Android  | Best-effort | Do not break it, but iOS/web take priority      |

HealthKit features (`DailySteps`, `HealthMetrics`) are gated with `Platform.OS === 'ios'` and return `null` on other platforms.

## 10) Testing & Quality Gates

The testing stack is split into explicit Modules with clear Interfaces. Each
Implementation is chosen for the Depth where it has the most Leverage, while
keeping Locality high so failures point at the smallest useful Seam.

| Module                  | Interface                                   | Implementation                     | Depth / Seam                                                  |
| ----------------------- | ------------------------------------------- | ---------------------------------- | ------------------------------------------------------------- |
| Expo compatibility      | `bun run expo:check`, `bun run expo:doctor` | Expo CLI / Expo Doctor             | SDK dependency and config Seam; mandatory PR Leverage         |
| Unit & component        | `bun run test:unit`                         | Jest + jest-expo + Testing Library | Stores, hooks, utilities, and component Seams close to source |
| Web build smoke         | `bun run build:web`                         | Expo static export                 | Web bundle Seam — if the export succeeds, the bundle is alive |
| Native smoke (iOS only) | `bun run test:e2e:maestro:ios`              | Maestro flows                      | Simulator/device Adapter for release and native checks        |

Run the PR gate locally before opening a pull request:

```bash
bun run quality:pr
```

### Unit & Component Tests (Jest)

```bash
bun run test             # run all tests
bun run test:unit        # explicit unit/component gate
bun run test:watch       # watch mode
```

Test files live alongside source code in `__tests__/` directories.

### Web Build Smoke

```bash
bun run build:web
```

There is intentionally no browser-level E2E framework (Playwright, Cypress, etc.).
A successful Expo static export is treated as the web smoke check — if the bundle
builds, it loads. Runtime browser regressions are caught by opening the site
locally during dev. If web ever becomes load-bearing, add browser tests that
exercise real user behaviour, not just "the page renders".

### Native E2E Smoke (Maestro, iOS only)

Maestro flows live in `.maestro/flows/`:

- `ios/` — HealthKit home, settings HealthKit
- `common/` — startup flow

Run them against a prepared development build on a simulator/device:

```bash
bun run test:e2e:maestro:ios
```

Maestro is intentionally not mandatory PR CI unless the runner has reliable
native simulator/device support. The script requires the Maestro CLI to be
installed locally or on the dedicated native runner.

Android Maestro flows are intentionally not maintained — Android is best-effort
per the platform priority and we keep the native test surface small.

### Figma MCP in Copilot

Workspace MCP config includes Figma's preferred remote endpoint:
`https://mcp.figma.com/mcp`. In VS Code, run
**MCP: Open Workspace Folder MCP Configuration**, select **Start** above the
`figma` server, and complete Figma OAuth in the browser. No Figma tokens are
committed or prompted in this repo.

To use it, copy a Figma frame or layer URL and paste it into Copilot with your
implementation request. The MCP client extracts the file and node ID from the
link and asks Figma for design context.

## 11) Branching & Workflow

This project uses **trunk-based development**:

- `main` is the trunk — never commit directly to it
- All changes go through short-lived feature branches via PRs
- Prefer `git worktree` over branch switching (see `.github/skills/git-worktree/SKILL.md`)
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`type(scope): description`)
- Squash-merge PRs to maintain linear history
- Husky pre-push hook blocks pushes from `main`

## 12) Troubleshooting

### Workouts Not Loading

1. Check env values are present and correct in `.env.local`.
2. Run `bun run db:debug` to verify connectivity.
3. If you get `404` on `/rest/v1/exercises`, the table is missing — apply `supabase/seed.sql` in the Supabase SQL editor.
4. On iOS/Android, ensure `EXPO_PUBLIC_*` vars use direct `process.env` references (Metro inlines these at compile time).

### Expo Start Exits or Hangs

Kill stale Metro processes and restart:

```bash
lsof -ti:8081 | xargs kill -9 2>/dev/null
bun run start
```

### Auth Key Safety

- `EXPO_PUBLIC_*` values are client-visible by design.
- Never use service-role keys in client/mobile env files.
- Supabase RLS enforces data access controls server-side.
