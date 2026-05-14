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

| Command                               | Description                                          |
| ------------------------------------- | ---------------------------------------------------- |
| `bun run quality:pr`                  | PR gate: Expo checks, lint, typecheck, unit tests    |
| `bun run expo:check`                  | Verify Expo SDK dependency alignment                 |
| `bun run expo:doctor`                 | Run Expo Doctor diagnostics                          |
| `bun run lint`                        | ESLint (flat config + Prettier)                      |
| `bun run typecheck`                   | TypeScript `--noEmit`                                |
| `bun run test`                        | Jest via jest-expo                                   |
| `bun run test:unit`                   | Explicit Jest unit/component Interface               |
| `bun run test:e2e:web`                | Playwright Expo web smoke test                       |
| `bun run test:visual:web`             | Capture Expo Web screenshot artifacts                |
| `bun run test:visual:maestro:ios`     | Run iOS Maestro screenshot flows                     |
| `bun run test:visual:maestro:android` | Run Android Maestro screenshot flows                 |
| `bun run test:e2e:maestro:ios`        | Maestro iOS native smoke flows                       |
| `bun run test:e2e:maestro:android`    | Maestro Android native smoke flows                   |
| `bun run test:watch`                  | Jest in watch mode                                   |
| `bun run db:debug`                    | Verify Supabase connectivity                         |
| `bun run generate-types`              | Regenerate Supabase DB types                         |
| `bun run db:migrate`                  | Push Supabase migrations                             |
| `bun run db:reset`                    | Reset Supabase DB                                    |
| `bun run prebuild:clean`              | Regenerate native projects (CNG)                     |
| `bun run native:reset`                | Full native reset (rm + prebuild)                    |

## 3) Project Structure

```text
src/
  app/               # expo-router file-based routes
    (tabs)/           #   tab navigator group (home, workouts, settings)
    details/          #   detail screens ([id].tsx)
  components/         # shared UI components
    __tests__/        #   component tests
    navigation/       #   TabBarIcon
  constants/          # design tokens (Colors.ts)
  data/               # static data / fetch scripts
  hooks/              # custom React hooks (useHealthKit, useColorScheme, etc.)
  lib/                # service clients & config
    env.ts            #   env var resolution
    supabaseEnv.ts    #   Supabase env validation (Zod)
    supabase.ts       #   Supabase client init
    healthkit.ts      #   HealthKit wrapper
    validators.ts     #   Zod schemas for DB row validation
    database.types.ts #   generated Supabase types
  stores/             # Zustand stores (ExerciseStore)
  types/              # TypeScript type definitions (models.ts)
  utils/              # pure utility functions
  shims/              # polyfill shims (ws.js for Supabase realtime)
  assets/             # fonts, images

supabase/
  config.toml         # local Supabase config
  seed.sql            # seed data for exercises table
  migrations/         # SQL migrations (exercises table + RLS)

.maestro/             # Maestro E2E test flows (iOS + Android)
.github/
  workflows/          # CI/CD (preview, build, update, triage, etc.)
  skills/             # Copilot skill files
  instructions/       # Copilot instruction files
```

### Import Alias

Use `@/*` (mapped to `src/*` in tsconfig) for all project imports:

```ts
import { supabase } from '@/lib/supabase'
import { Exercise } from '@/types/models'
```

## 4) Architecture

```text
┌────────────────────────────────────────────────────────────────────┐
│                        React Native App                            │
│       Expo Router screens + components (src/app, src/components)   │
└───────────────────────────────┬────────────────────────────────────┘
                                │
                                │ uses
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│                    Zustand Store (client state)                    │
│                    src/stores/ExerciseStore.ts                     │
│                                                                    │
│ initialize()                                                       │
│  1) SELECT * FROM public.exercises ORDER BY day                    │
│  2) Validate response with Zod (src/lib/validators.ts)            │
│  3) If query fails → fall back to in-file mock workouts            │
│  4) Normalize for UI (selectedSets, localId, color, date)          │
│                                                                    │
│ sync()                                                             │
│  - Validate payload with Zod before writing                        │
│  - Write completion back to public.exercises                       │
└───────────────────────────────┬────────────────────────────────────┘
                                │
                                │ Supabase JS client
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│                             Supabase                               │
│  Table: public.exercises                                           │
│  RLS enabled (anon → SELECT; authenticated → INSERT/UPDATE/DELETE) │
│  Indexes: day+week composite, GIN on title (FTS), GIN on exercises │
└────────────────────────────────────────────────────────────────────┘
```

## 5) Database Schema

Defined in `supabase/migrations/20260308000000_create_exercises_table.sql`.

```text
public.exercises
├─ id          UUID (PK, auto-generated)
├─ day         TEXT NOT NULL
├─ week        TEXT NOT NULL
├─ title       TEXT NOT NULL
├─ videoURL    TEXT (nullable)
├─ cardio      JSONB { morning: number, evening: number }
├─ exercises   JSONB array of exercise details
│  ├─ id         string
│  ├─ title      string
│  ├─ sets       number | "To Failure"
│  ├─ reps       number
│  └─ variation  string | null
├─ created_at  TIMESTAMPTZ
└─ updated_at  TIMESTAMPTZ (auto-updated via trigger)
```

**Row Level Security** is enabled:

- `SELECT` — open to all (anon + authenticated)
- `INSERT` / `UPDATE` / `DELETE` — authenticated users only

## 6) Data Validation

All database I/O is validated with [Zod](https://zod.dev/) schemas in `src/lib/validators.ts`:

- `exerciseRowSchema` — validates rows read from Supabase
- `exerciseInsertSchema` — validates new rows before insert
- `exerciseUpdateSchema` — validates payloads before update
- `exerciseDetailSchema` — validates individual exercise JSONB items
- `cardioSchema` — validates the cardio JSONB column

TypeScript types (`ExerciseRow`, `ExerciseDetail`, `Cardio`) are derived from these schemas via `z.infer`.

## 7) CI/CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow               | Trigger         | Description                                                  |
| ---------------------- | --------------- | ------------------------------------------------------------ |
| **preview**            | Pull request    | Expo compatibility, lint, typecheck, unit tests, EAS preview |
| **visual screenshots** | Frontend PRs    | Expo Web screenshots, artifacts, and PR summary              |
| **update**             | Push to `main`  | EAS Update production (aborts on native changes)             |
| **build**              | Manual dispatch | EAS Build (iOS/Android, any profile)                         |

The **preview** workflow runs on every PR and gates merges on `bun run expo:check`,
`bun run expo:doctor`, `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
This keeps the PR Interface aligned with Expo SDK compatibility without forcing
device/simulator-only Adapters into GitHub-hosted runners.

## 8) Native Workflow (CNG)

This project uses Expo Continuous Native Generation (CNG).

- `ios/` and `android/` are generated artifacts and git-ignored.
- Native configuration lives in `app.json` and config plugins.
- Plugins: `expo-router`, `expo-font`, `expo-web-browser`, `react-native-health`

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

| Module | Interface | Implementation | Depth / Seam |
| ------ | --------- | -------------- | ------------ |
| Expo compatibility | `bun run expo:check`, `bun run expo:doctor` | Expo CLI / Expo Doctor | SDK dependency and config Seam; mandatory PR Leverage |
| Unit & component | `bun run test:unit` | Jest + jest-expo + Testing Library | Stores, hooks, utilities, and component Seams close to source |
| Web smoke | `bun run test:e2e:web` | Playwright + Expo web dev server | Browser Adapter for the app shell; optional local/CI smoke |
| Native smoke | `bun run test:e2e:maestro:ios`, `bun run test:e2e:maestro:android` | Maestro flows | Simulator/device Adapter for release and native checks |

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
Jest ignores `e2e/`; that directory is owned by the Playwright Interface.

### Web E2E Smoke (Playwright)

```bash
bun run test:e2e:web
```

The Playwright smoke test starts Expo web through `playwright.config.ts` and
asserts that the app shell renders at the configured `baseURL`. Keep this Module
small: it protects the browser Adapter Seam without duplicating Jest coverage.
If the local browser binary is missing, install the script's browser with
`bunx playwright install chromium`.

### Web Visual Screenshots (Playwright)

Playwright tests live in `e2e/` and start Expo Web through
`playwright.config.ts`.

```bash
bun run test:visual:web
```

Screenshots are written under `test-results/` and are uploaded by the
**visual screenshots** PR workflow when frontend-relevant paths change. The
script uses Chromium for a reliable GitHub-hosted PR gate.

### Native E2E Smoke (Maestro)

Maestro flows live in `.maestro/flows/` with platform-specific directories:

- `ios/` — HealthKit home, settings HealthKit
- `android/` — workouts, app navigation
- `common/` — startup flow

Run them against a prepared development build on a simulator/device:

```bash
bun run test:e2e:maestro:ios
bun run test:e2e:maestro:android
```

Maestro is intentionally not mandatory PR CI unless the runner has reliable
native simulator/device support. These scripts require the Maestro CLI to be
installed locally or on the dedicated native runner.

Each flow also uses `takeScreenshot` steps for native visual evidence:

```bash
bun run test:visual:maestro:ios
bun run test:visual:maestro:android
```

Native screenshot artifacts are intended for local, release, or manual runner
validation. They are not a required GitHub-hosted PR gate because they require a
booted simulator/emulator, an installed app build, and platform-specific
permissions such as HealthKit.

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
