# gym

A daily health dashboard. It reads Apple HealthKit and shows one day at a time.

Nothing is typed in by hand. Every number on screen — steps, calories, sleep,
hydration, weight, workouts — comes from Health, which is already recording it.
If a feature would ask you to log something your phone or watch already knows,
it does not belong here.

An on-device AI coach reads the same snapshot and nothing else. It runs through
Apple Foundation Models on supported iOS devices and a deterministic mock
everywhere else, so no health data leaves the phone.

Home leads with the selected day's steps. Active calories, sleep, and workouts
appear only when readings are available; missing data does not fill the screen
with empty cards or a recovery score. Tap steps for details, tap the date for the
week calendar, or expand **More health data** for the latest weigh-in and recent
activity heatmap. **See all metrics** retains the full breakdown, including
unavailable readings as `--` and the recovery estimate. The selected date stays in
the route, including when returning from details. Coach and Settings remain
available, and a sparse day offers a shortcut to review Health access without
claiming that access was denied.

## 1) Quick Start

### Prerequisites

- [Bun](https://bun.sh/) 1.2+ (`bun --version`)
- Node.js 20+ (required by some Expo CLI tooling)
- Xcode for the iOS simulator (HealthKit is iOS-only)

### Install and run

```bash
bun install
bun run start          # Expo dev server (QR code)
bun run ios            # iOS simulator
bun run web            # Web browser (Metro bundler)
```

There is no environment configuration. The app has no backend and no API keys.

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
| `bun run test:watch`           | Jest in watch mode                                |
| `bun run test:e2e:maestro:ios` | Maestro iOS native smoke flows                    |
| `bun run build:web`            | Expo static web export (web smoke check)          |
| `bun run check:dead-code`      | knip unused files, exports and dependencies       |
| `bun run prebuild:clean`       | Regenerate native projects (CNG)                  |
| `bun run native:reset`         | Full native reset (rm + prebuild)                 |

## 3) Project Structure

Source code lives under `src/`, grouped by responsibility. Components are
organised by **domain** rather than alphabetically — when a feature changes,
its surface area is contained inside a single subfolder.

```text
src/
  app/                    # expo-router file-based routes
    index.tsx             #   the dashboard (root route)
    settings.tsx          #   pushed from the dashboard header
    fitness-metrics.tsx   #   full metric breakdown + coach insight card
    coach.tsx             #   streaming coach chat
    steps.tsx             #   step detail, presented modally
  components/
    dashboard/            #   dashboard sections + the ring builder
    charts/               #   heatmap and ring primitives
    health/               #   health-specific cards (coach insight)
    common/               #   shared primitives (ErrorBoundary, Header)
    themed/               #   theme-aware Text/View
  constants/              # design tokens (Colors.ts, DesignSystem.ts)
  hooks/                  # useHealthSnapshot, useDailyCoachInsight, theme hooks
  lib/
    healthSnapshot/       #   the only data source (see Architecture)
    fitnessMetrics/       #   snapshot → presentable metric mapping
    coach/                #   coach engines, prompts, and daily context
    validators/           #   zod schemas for coach output
  stores/                 # ThemeStore (the only store — theme preference)
  utils/                  # recovery scoring and pure helpers
  assets/                 # fonts, images

.maestro/                 # Maestro E2E flows (iOS only)
.github/
  workflows/              # CI/CD (preview, build, update, triage, etc.)
  skills/                 # Copilot skill files
  instructions/           # Copilot instruction files
```

### Import alias

Use `@/*` (mapped to `src/*` in tsconfig) for **all** project imports. Avoid
relative paths that climb out of a folder (`../../`).

```ts
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
```

### Test conventions

- Test files use the `*.test.ts(x)` suffix and live in `__tests__/` next to the
  code under test. Snapshots go in `__tests__/__snapshots__/`.
- Component tests live in the component's domain folder
  (e.g. `src/components/workout/__tests__/`), not in a global test directory.

## 4) Architecture

One data source, one shape, two adapters.

```text
┌────────────────────────────────────────────────────────────────────┐
│                        React Native App                            │
│    Expo Router screens + components (src/app, src/components)      │
└───────────────────────────────┬────────────────────────────────────┘
                                │ useHealthSnapshot(date)
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│              healthSnapshot — src/lib/healthSnapshot/              │
│                                                                    │
│  HealthSnapshotSource   the interface every screen codes against   │
│  types.ts               DailyHealthSnapshot — one day, all metrics │
│                                                                    │
│  getDailySnapshot(date)  one call, queries fanned out internally   │
│  getRangeIntensity(days) bulk query for the activity heatmap       │
└───────────┬────────────────────────────────────┬───────────────────┘
            │ Platform.OS === 'ios'              │ everything else
            ▼                                    ▼
┌───────────────────────────────┐   ┌────────────────────────────────┐
│ iosAdapter                    │   │ mockAdapter                    │
│ @kingstinct/react-native-     │   │ Deterministic seeded values so │
│ healthkit — read-only         │   │ web and tests render a plausib-│
│                               │   │ le day without a device.       │
│ steps, active energy, HR,     │   │                                │
│ HRV, resting HR, sleep,       │   │                                │
│ water, flights, body mass,    │   │                                │
│ dietary energy, workouts      │   │                                │
└───────────────────────────────┘   └────────────────────────────────┘
```

`DailyHealthSnapshot` is the contract. Missing or inaccessible measurements
remain `null` and render `--`; a genuinely measured zero stays numeric. Body
mass uses the latest available weigh-in, not a same-day-only reading.
Snapshot and heatmap keys use local calendar dates. Cumulative measurements use
HealthKit statistics instead of summing overlapping device samples; cardiac
readings belong to the selected day. Sleep intervals are clipped to the selected
night and merged before totaling them. Mock readings stay stable for each date,
including today and across overlapping heatmap ranges.
Workout durations use HealthKit's recorded duration, not elapsed start-to-end
time, so pauses are not counted as activity.

The app requests **read** permissions only. It never writes to Health.
Finishing a fetch or an authorization request does not establish read access:
HealthKit keeps individual read grants private. Settings always offers
**Connect / Review Health access** on supported iOS devices, except while a
request is in progress. Returning to Home rereads the selected day, including
after reviewing Health access, without assuming that read permission was granted.

### The coach

`src/lib/coach/` follows the same seam. `CoachEngine` is the interface;
`appleFMAdapter` runs Apple Foundation Models on iOS and `mockAdapter` returns
deterministic text everywhere else, so web and CI exercise the same code path
without a model.

`buildDailyContext` turns a `DailyHealthSnapshot` plus the recovery score into
the only context a prompt ever sees. There is no other input — no history, no
profile, no free-form notes — which keeps the prompt small enough to stay under
the on-device token budget and keeps the coach honest about what it knows.
If required recovery measurements are unavailable or invalid, there is no
recovery assessment to display or send to the coach. Missing data must not
become a zero measurement or a fabricated recovery percentage.

Output is parsed through the zod schemas in `src/lib/validators/coach.ts`. A
malformed response is retried once and then fails loudly rather than rendering
half a sentence.

## 5) CI/CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow    | Trigger         | Description                                                  |
| ----------- | --------------- | ------------------------------------------------------------ |
| **preview** | Pull request    | Quality gates, runtime isolation, JS-only EAS preview       |
| **update**  | Push to `main`  | JS-only OTA; isolated native changes dispatch EAS Build      |
| **build**   | Manual dispatch | EAS Build (iOS/Android, any profile)                         |

The **preview** workflow runs on every PR and gates merges on `bun run expo:check`,
`bun run expo:doctor`, `bun run lint`, `bun run typecheck`, and `bun run test:unit`.
This keeps the PR Interface aligned with Expo SDK compatibility without forcing
device/simulator-only Adapters into GitHub-hosted runners.

### Native releases and OTA safety

`runtimeVersion` uses the **`appVersion` policy**. Any native code, native
dependency, config-plugin, or native app configuration change requires both:

1. Increase `expo.version` in `app.json` and the matching `package.json` version.
   Never reuse a previous version for a different native runtime. Increasing
   only an iOS build number or Android version code does **not** isolate OTA.
2. Create and install/distribute a new native binary before using updates for
   that runtime. Use the existing manual **build** workflow with the appropriate
   profile (`preview` for internal testing, `production` for store releases).

Automatic native releases build iOS only. Android remains available through a
manual **build** workflow dispatch.

This includes native **patch** updates within an Expo SDK or React Native
version and removing native modules, not just major/minor SDK upgrades.
The HealthKit-only refactor now uses app version/runtime **1.0.2** after SDK 55
patch alignment; existing **1.0.0** and **1.0.1** binaries must not receive its
JavaScript. Users need a matching native binary before receiving updates for
this runtime. Green JS tests, a static web export, or simulator smoke tests do not
establish compatibility with previously installed binaries.

Both publishing workflows compare native fingerprints with the same explicitly
pinned `@expo/fingerprint` **0.16.8** implementation and then run
`scripts/check-release-safety.ts`:

| Fingerprint evidence vs. runtime anchor | Runtime history | Release decision |
| --- | --- | --- |
| Known, unchanged | Existing isolated namespace at the version high-water mark | Allow JS-only OTA |
| Known, unchanged | Newly introduced namespace above all prior versions | Skip preview OTA; production dispatches a native build |
| Known, changed | Same runtime as its anchor, including within a multi-commit push | Fail: use a genuinely higher version |
| Any | Below historical high-water, no isolated anchor, invalid, or inconsistent | Fail |
| Missing, failed, malformed, or inconsistent | Any | Fail closed; no OTA or automatic build |

**An event's previous commit is not acceptance evidence.** The immutable anchor
is the first **first-parent** commit introducing a valid `appVersion` runtime
strictly above every earlier manifest version. Later commits using that version
never replace its anchor. Production resolves this from the full first-parent
release history; `github.event.before` only identifies the start of the push.
The version high-water mark never decreases, even after a rejected rollback.

PRs use only the target branch's first-parent history, not the feature branch's
version bumps. The tested revision must be the PR merge commit with the event
base as its first parent. A genuinely new PR runtime is a build-only candidate,
not an accepted branch anchor. Preview OTA also requires a same-repository PR
targeting `main`. Concurrent PRs choosing the same version cannot substitute
their own native implementation for the one that first landed on `main`.

For example, if A established `1.0.2`, B changes native code without bumping
that version, and C only changes JS, **both B and C compare against A and fail**,
including a preview targeting B. Recover by increasing both versions above the
historical high-water mark (for example `1.0.3`) and building that new runtime.
A complete native revert to A's fingerprint is also safe at `1.0.2`. A rollback
to an older version followed by a small increase cannot reclaim an old namespace.

A newly introduced runtime requires a build, including when its anchor is in
the middle of a multi-commit push. Subsequent same-runtime JS updates compare
to that original anchor without requiring a completed build or any acceptance
cache. If the build is pending or failed, no older runtime can receive those
updates; finish the matching binary rather than resetting the version.

Fingerprint comparison is **nonpublishing and independent of the fingerprint
cache**. `scripts/fingerprint-release.ts --resolve-baseline` selects the anchor
before the workflow checks that exact SHA out under `.expo/release-baseline`.
Both the comparison CLI and the decision CLI independently rederive it from
Git and reject any substituted baseline. For a newly introduced runtime, the
anchor can be the release SHA itself; it still needs a separate checkout and
can only authorize a build. The fingerprint CLI verifies both checkout SHAs,
their ancestry, and committed, unchanged manifests/lockfiles; installs
each revision's own dependencies with `bun install --frozen-lockfile`; then
fingerprints both using the same pinned library and SHA-1 algorithm. A cold or
evicted cache therefore does not need manual seeding or a release to recover.
Package download caches only speed installation and are never compatibility
evidence. No unvalidated head is saved as a trusted baseline.

Missing commits/lockfiles, checkout drift, failed frozen installs, or invalid
fingerprint evidence still block OTA and automatic builds. Correct the checkout
or dependency-install failure and rerun; never interpret a failure as an empty
diff. Keep release publication in these guarded workflows, not ad-hoc
`eas update` commands. Both new fingerprints are recomputed on every run, so
fingerprint algorithm/version changes cannot mix old cached hashes with new ones.

History must be complete and statically readable; missing/invalid JSON, version
mismatches, platform runtime overrides, and alternate `app.config.*` files
anywhere in the inspected history block release without evaluating old config
code. The original pre-OTA scaffold prefix is supported only with no
`runtimeVersion`, `sdkVersion`, or `updates` settings: its strictly validated
app/package versions are **reserved**, never accepted as anchors. Enabling
`appVersion` at a reserved version therefore requires a higher version first.

For missing refs or shallow history, fetch the complete event history and rerun
from the exact clean release SHA. Fix unsafe current PR configuration before
merging. If unsafe/unknown configuration is already committed in the target
history, a version bump alone cannot prove isolation: stop releases and plan an
audited migration to a distinct EAS Update project with a clean, validated
release lineage and new binaries. Do not erase history, seed a trust cache, or
bypass the guard. These guarantees cover the guarded lineage, not binaries or
updates manually published from unrelated branches using the same runtime.

Run the release decision regression tests locally with:

```bash
bun run test:unit -- --runInBand --no-watchman --bail scripts/__tests__
```

## 6) Native Workflow (CNG)

This project uses Expo Continuous Native Generation (CNG).

- `ios/` and `android/` are generated artifacts and git-ignored.
- Native configuration lives in `app.json` and config plugins.
- Plugins: `expo-router`, `expo-font`, `@kingstinct/react-native-healthkit`

Regenerate native projects:

```bash
bun run prebuild:clean    # regenerate ios/ and android/
bun run native:reset      # rm -rf ios android && prebuild --clean
```

## 7) Platform Support

| Platform | Priority    | Notes                                             |
| -------- | ----------- | ------------------------------------------------- |
| iOS      | First-class | The real product. HealthKit, App Store            |
| Web      | Best-effort | Mock data only — HealthKit has no web equivalent  |
| Android  | Best-effort | Mock data only; do not break it, do not chase it  |

HealthKit is iOS-only, so `HealthSnapshotSource` falls back to `mockAdapter` on
every other platform. Web is a layout and design surface, not a way to see your
actual health data.

## 8) Testing & Quality Gates

The testing stack is split into explicit Modules with clear Interfaces. Each
Implementation is chosen for the Depth where it has the most Leverage, while
keeping Locality high so failures point at the smallest useful Seam.

| Module                  | Interface                                   | Implementation                     | Depth / Seam                                                  |
| ----------------------- | ------------------------------------------- | ---------------------------------- | ------------------------------------------------------------- |
| Expo compatibility      | `bun run expo:check`, `bun run expo:doctor` | Expo CLI / Expo Doctor             | SDK dependency and config Seam; mandatory PR Leverage         |
| Unit & component        | `bun run test:unit`                         | Jest + jest-expo + Testing Library | Hooks, adapters, presenters, and component Seams              |
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
builds, it loads. If web ever becomes load-bearing, add browser tests that
exercise real user behaviour, not just "the page renders".

### Native E2E Smoke (Maestro, iOS only)

Maestro flows live in `.maestro/flows/`:

- `ios/` — dashboard render, settings HealthKit toggle
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

## 9) Branching & Workflow

This project uses **trunk-based development**:

- `main` is the trunk — never commit directly to it
- All changes go through short-lived feature branches via PRs
- Prefer `git worktree` over branch switching (see `.github/skills/git-worktree/SKILL.md`)
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`type(scope): description`)
- Squash-merge PRs to maintain linear history
- Husky pre-push hook blocks pushes from `main`

## 10) Scope

The fastest way for this app to rot is to start storing things.

Before adding a feature, ask whether the data already exists in HealthKit. If it
does, read it. If it does not, the honest answer is usually that the feature
belongs in a different app — a manual tracker bolted onto a sensor dashboard is
how this codebase previously ended up with two competing architectures, a
backend, and a meal scanner nobody used.

Adding a backend, a login, or a form is a scope decision, not an implementation
detail. Treat it as one.

The same rule binds the coach. It may read the daily snapshot and the recovery
score. Giving it something to remember, or somewhere to write, reintroduces the
storage this app deliberately does not have.

## 11) Troubleshooting

### No health data on the dashboard

1. HealthKit is iOS-only. On web and Android you will see deterministic mock
   data by design.
2. Open Settings in the app and choose **Connect / Review Health access**.
   Completion means the request finished, not that every read scope was granted.
3. Check iOS Settings → Privacy & Security → Health → gym and confirm the
   individual read permissions are granted. Denying one metric silently returns
   nothing for that metric only.
4. Metrics like weight and dietary energy are only present if some other app or
   device is writing them to Health.

### Web renders but buttons do not respond

An `import.meta` syntax error can prevent hydration even when Metro serves the
page successfully. The web-only `unstable_transformImportMeta` option in
`babel.config.js` lets Expo handle ESM dependencies such as Zustand inside
Metro's classic-script bundles. Native Babel behavior is unchanged.

After changing Babel configuration, stop the existing Metro server with Ctrl+C
and restart it with `bun run start --clear`.

### Expo start exits or hangs

Kill stale Metro processes and restart:

```bash
lsof -ti:8081 | xargs kill -9 2>/dev/null
bun run start
```
