# Copilot Instructions for this Expo Project

These instructions capture Expo team best practices from Expo docs, GitHub issue templates, and maintainer guidance.

## What this app is

A daily health dashboard whose displayed readings come from Apple HealthKit.
There is no backend or Gym account. The optional Inbox Zero Google sign-in
exception below is limited to Gmail cleanup. The user-approved manual-entry exceptions are
body weight, water, and meal photos: a confirmed weight in kilograms and its
actual measurement time, a water amount explicitly confirmed for today, or a
meal estimate explicitly confirmed for today can be saved directly to Apple
Health on compatible iOS builds.

This is the single most important constraint in the repo. The app previously
carried a second, competing architecture — manual CRUD screens on a Supabase
backend that duplicated data HealthKit already had — and that is what made it
unmaintainable. Do not reintroduce it. Weight entry, the Water amount draft, and
the Food meal estimate have ephemeral state only: no local data store/cache,
profile, or backend. Water and food writes add new samples only; never edit or
delete existing Health samples.
The user also approved an on-device lifting log (`GymLogStore`, `/gym`): sets,
reps, optional kilograms, and a workout rating for the bundled programme in
`src/lib/gymProgramme/programme.json`, or for StrongLifts 5×5 A/B on short days
(`FIVE_BY_FIVE`, with a rule-based next-weight hint), because HealthKit cannot
store sets or reps. It stays on the device, never writes to Health, never
caches Health readings, and is not coach input. Cardio on `/gym` is read from
HealthKit.
Each lifting exercise's info sheet fetches a reference demo (animation, muscles,
steps) from ExerciseDB only on tap, using a curated ID in `exerciseMedia.json`.
That read-only lookup sends only the ID, stores nothing, and is not coach input;
media must not be bundled.
The lifting workout screen also has an optional iOS Spotify App Remote: only
after the user connects, it displays the current track and album art and offers
playback controls. Opening the music sheet loads Spotify's recent/recommended
playlists; the user can browse their contents and explicitly play a selection.
This is not full-library access and must not silently add Web API calls/scopes.
Spotify handles authorization and playback. Artwork is held in memory and the
SDK's temporary image files are deleted after loading, including stale requests.
Do not persist Spotify track/session data, write it to Health, or give it to the
coach. Web and Android only open Spotify. The separate user-approved HSL
routing lookup is described below.
The Lifting rest timer between sets is ephemeral screen state: a rule-based
target (`restSeconds` in `rest.ts`, 2:00 default) adjustable by ±15 s. It is
never persisted, written to Health, or used as coach input.
The Apple Watch app (`modules/gym-watch/`) is a remote for that lifting log
only: it shows today's programme day and sends set and undo taps to the iPhone
over WatchConnectivity, where `src/lib/watch` validates them into
`GymLogStore`. The watch keeps only the last state the iPhone sent, writes
nothing to Health, and is not coach input. Logging needs the iPhone reachable;
there is no offline queue.
The user also approved on-device rep counting for that log, from native 1.0.18.
On the watch, **Count reps** runs a `physical-therapy` extended runtime session
and counts wrist motion (`RepDetector`); the user corrects the count with the
Digital Crown and taps to log it as a normal set. On the iPhone, the Lifting
**Count** button (iOS 17+) opens `modules/rep-camera`: front-camera Vision body pose turns
each frame into one knee, hip, or elbow angle, and `src/lib/repCount.ts` counts
bend-and-straighten cycles into the reps field. Frames are analysed in memory
and never saved; counts are never persisted on their own, written to Health, or
used as coach input. Start counting explicitly, discard unfinished cycles when
tracking is lost, and stop with a visible error on camera/motion/runtime failure.
Motion and bend thresholds are ephemeral calibration controls. Neither counter
is a form or safety assessment; physical-device qualification is still required.
The user also approved `/speaking`, a practice tool based on Patrick Winston's
"How to Speak". It offers shadow scripts or solo points, 5 or 15 minutes, and
on-device speech recognition. An optional front-camera video stays in the app
cache until the user shares it through the share sheet (YouTube) or leaves.
The user also approved `SpeakingLogStore`, an on-device post-mortem log: each
finished session's topic, mode, length, and transcript, scored by the
rule-based `postMortem` (fillers, pace, solo opening promise and close) and
deletable from `/speaking-history`. Nothing is written to Health or given to
the coach.
The Reading timer is ephemeral too. Apple Books and HealthKit expose no reading
time, so on native 1.0.13+ iOS builds tapping the Reading tile starts a
`ReadingActivity` Live Activity (`expo-widgets` + `@expo/ui`,
`src/lib/readingActivity.tsx`) that counts up in the Dynamic Island, then opens
Apple Books. Tapping the tile again ends it on any supported iOS version; the
island's Stop button is interactive only on iOS 17+ and works while the app is
in memory. On iOS 16.2–16.x, the Live Activity instructs users to return to
gym and stop from the Reading tile. Only the last session's whole minutes stay
in memory for that day's tile caption. The
`group.io.raghib.gym` App Group holds only the compiled widget layouts and the
Daily rings timeline below; reading minutes are never persisted, written to
Health, or used as coach input. Older builds, web, and Android keep the plain Apple Books link.
The user also approved an ephemeral Deep Work timer (25-minute focus, 5-minute
break, repeating) on the Home grid. On native 1.0.13+ iOS builds it mirrors the
current block in a silent `DeepWorkActivity` Live Activity
(`src/lib/deepWorkActivity.tsx`); other platforms run it in-app only. The
session lives in memory only: no persistence, notifications, Health writes, or
coach input.
The user approved a Today planner as the first current-day Home pager page.
Its native `DayPlanner` module reads Apple Calendar and eligible incomplete
and completed-today Apple Reminders after explicit, separate permission requests.
Calendar stays read-only. The user approved one narrow Reminders write:
an explicit checkbox tap may complete or uncomplete that existing reminder.
Require full authorization, a writable calendar and a confirmed native save;
never create, delete or edit reminder titles, dates or other fields.
Readings and Calendar-driven activity suggestions stay in memory,
never enter Health, the App Group, or the Health coach. Alerts are on-screen
only. Commute preferences (home/work stations, work hours and walking minutes)
are approved device-local fields in ThemeStore. The user's Digitransit key
belongs only in device-only Keychain, never AsyncStorage or bundled config.
HSL receives only station searches, selected station coordinates and journey
times; never Calendar, Reminders, Health or log data. Transit requires a real
successful response, not an invented departure. Native 1.0.20+ and iOS 17+
are required for these connections; older binaries fail closed.
The user approved Inbox Zero: optional Google OAuth on native iOS 1.0.21+,
reading only inbox sender/subject/List-Unsubscribe metadata into screen memory,
grouping loaded messages by sender and moving up to 1,000 explicitly reviewed
and confirmed messages to Gmail Trash. Require per-message read-back before
claiming success; partial/unknown outcomes require refresh before another write.
Never permanently delete, send mail, run automatic/background cleanup, or read
bodies, attachments, images or archived mail. Google’s gmail.modify scope is
broader than these approved actions; do not use its other capabilities.
Unsubscribe is a separate explicit review of an email-provided HTTPS link and
opening in the browser, where the user completes it. Do not automatically POST
to unsubscribe endpoints or claim that opening a link confirmed success.
Google tokens and email stay in screen memory only, discarded on disconnect or
exit; no refresh token, backend, local cache, profile, Health/coach input, App
Group or persistent store. The Google grant remains until the user revokes it.
Google OAuth client IDs are public configuration, never bundle client secrets.
Unsupported platforms and old/missing native capabilities fail closed.
No other manual-entry feature is approved.

The user-approved Daily rings Home Screen widget shares only today's formatted
steps, water and active-calorie summary, progress and update/expiry times through
the `group.io.raghib.gym` App Group, shared only with the widget extension. Its display targets are
20,000 steps, 2.5 L and 500 active kcal, not new dashboard goals. Timeline readings
expire after one hour or local midnight; this is display expiry, not automatic
storage deletion. Never share historical/demo readings, Health history, or coach
context, or turn this narrow widget exception into a general Health cache.

Before adding a feature, check whether the data already exists in HealthKit. If
it does, read it. If it does not, adding a form, a store that persists user
input, or a network backend is a scope decision that needs explicit sign-off —
not an implementation detail to decide while coding.
The body-mass form, Water page's ephemeral 250 mL +/- draft, and Food page's
photo estimate with explicit Apple Health save are approved. These approvals
do not authorize other forms or persistence.

The on-device AI coach (`src/lib/coach/`) inherits the same constraint. It reads
the daily HealthKit snapshot and the recovery score, and nothing else. Do not
give it persistence, a profile, or a server — its context is built solely by
`buildDailyContext`, and prompts must stay within the on-device token budget.

The Food tile (`/gym/food`) estimates a meal from a camera or library photo on
the device. The local `FoodVision` module (`modules/food-vision`, iOS 18 Vision
`ClassifyImageRequest`) labels the photo and deletes the cached file; Apple
Intelligence (`generateValidatedJson`, Zod-validated) estimates the name, kcal,
and protein, carbohydrate, and fat grams from those labels; EXIF capture time
sets when it was eaten (pick time only when the photo has none), and photos from
another day or with an invalid or future capture time are rejected because only
today's meals can be logged. The
photo never leaves the device, the estimate is not persisted or coach input,
and only **Save to Apple Health** writes it. Never invent an estimate when
Vision finds no `food`/`drink` label or Apple Intelligence is unavailable.
The budget card reads the day's food log and workouts from Health; unknown
values render `--`.

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
| State Management | Zustand (theme, tile order, gym/speaking logs)   | 5.x        |
| Charts           | react-native-svg                                 | —          |
| Animations       | React Native Reanimated                          | 4.x        |
| Health Data      | @kingstinct/react-native-healthkit               | 13.x       |
| Haptics          | expo-haptics (tile rearranging)                  | 55.x       |
| On-device AI     | react-native-apple-llm (Apple Foundation Models) | 1.x        |
| Meal photos      | expo-image-picker + Vision (local FoodVision)    | 55.x       |
| Live Activity    | expo-widgets + @expo/ui (Reading timer, alpha)   | 55.x       |
| Validation       | Zod (on-device AI output, programme, watch taps) | 4.x        |
| Watch app        | SwiftUI + WatchConnectivity (apple-targets)      | watchOS 11 |
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
    add-weight.tsx      #   explicit body-mass save to Apple Health
    speaking.tsx        #   speaking practice: shadow/solo, live transcript, video
    speaking-history.tsx #  saved speaking post-mortems
    gym/                #   hub grid + stairmaster/cardio/lifting/weight/food screens
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
    watch/              #   Apple Watch state + tap validation
  stores/               # ThemeStore, GymLogStore, SpeakingLogStore
  utils/                # recovery scoring and pure helpers
  assets/               # fonts, images
modules/
  gym-watch/            # iPhone WatchConnectivity module; watch/ is the SwiftUI app
  rep-camera/           # front-camera Vision body pose -> joint angle for rep counting
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
- For dashboard UI requests, turn every named block and control into an acceptance checklist. Verify each appears in the rendered screens, and tap through requested navigation before reporting the work complete.
- When a short request or reference could imply materially different behavior or targets, inspect the referenced UI first and ask one focused question before coding or switching to an unrelated tool or integration.
- Preserve the dashboard's clean, Apple-style outline icon treatment; do not use dotted artwork or replace the established visual direction unless explicitly asked. Compare visual changes with the supplied reference.
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

- `ThemeStore` persists user-approved preferences through AsyncStorage: the
  theme, the Home and Gym tile order (tile labels or ids only), the daily
  food calorie goal (`foodGoalKcal`), the Weight goal (`weightGoalKg`), and
  the approved commute preferences
  (stations, work hours and walking minutes). The transit key is Keychain-only.
- `GymLogStore` is the approved on-device lifting log: programme start date and
  per-day sets, rating, and notes. Do not add Health readings to it.
- `SpeakingLogStore` is the approved speaking post-mortem log: raw session
  inputs only; scores are recomputed by `postMortem`.
- Health data is not state to be managed. It is read per-day through
  `useHealthSnapshot(date)` and rendered. Do not cache it into a store.
- If you find yourself adding a store, first check that you are not
  reintroducing manual data entry.

## Data (HealthKit)

- `src/lib/healthSnapshot/` is the only data source. `HealthSnapshotSource` is
  the read interface; the approved body-mass writer is a separate, narrow port.
- `DailyHealthSnapshot` in `types.ts` is the contract. Every metric is nullable:
  missing or inaccessible measurements render `--`, never an invented `0`.
  Preserve observed zeroes. Body mass uses the latest available weigh-in.
- `iosAdapter.ts` reads real HealthKit data; `mockAdapter.ts` serves every other
  platform with deterministic seeded values.
- New metrics are added in three places: `types.ts`, `iosAdapter.ts`, and
  `mockAdapter.ts` — plus a matching read permission in `READ_PERMISSIONS`.
- Gym Weight also reads body-mass history and the latest height through
  `getBodyMassHistory` and `getHeightMeters`. Height stays out of
  `DailyHealthSnapshot` and coach context. Add weight reads recent body mass
  only to position its ruler; it never prefills or saves that reading.
- Dashboard reads and Settings **Connect / Review Health access** request read
  permissions only. Fetch readiness and authorization-request completion do not
  prove read permission; HealthKit keeps read grants private.
- The separate `bodyMassWriter`, `waterWriter`, and `foodWriter` ports are the
  only write paths. For body mass, on explicit
  **Save to Apple Health**, request only `HKQuantityTypeIdentifierBodyMass`
  sharing access, validate positive finite kilograms and the confirmed,
  non-future measurement timestamp again at the boundary, and mark the sample
  user-entered. Request completion is not write success: require the native
  saved sample. Never log entered values, sample details, or native error text.
- Weight entry requires an immutable compatible native application version
  (1.0.7 or later with the required modules), never the live Expo config version.
  Missing/old binaries and non-iOS platforms must fail closed before permissions
  or loading the native picker. The updated Health write-purpose string and
  native dependencies require a new isolated binary, not an OTA to 1.0.6.
- Keep the weight form ephemeral, with editable actual date/time and explicit
  confirmation. No write on Enter, blur, cancel, or dismiss. Guard double taps
  synchronously, block conflicting navigation while saving, preserve input on
  errors, and reread Health on returning. Do not fake read-back or move afternoon
  samples into the morning window; existing morning-history formulas are unchanged.
- `foodWriter` saves one `HKCorrelationTypeIdentifierFood` per confirmed meal:
  Dietary Energy, plus Dietary Protein, Carbohydrates, and Fat Total when above
  0 and shared, with `HKFoodType` and user-entered metadata. Request only those
  four share types, require Energy sharing, revalidate at the boundary
  (including the same local day), and require the saved correlation to return
  every sample. Food entry needs native 1.0.11 or later.
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
- Look up Expo APIs in the SDK 55 versioned docs at `https://docs.expo.dev/versions/v55.0.0/`, not `latest`. Append `index.md` to a page URL for Markdown. Update this pin with each SDK upgrade.

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
  - Native smoke Adapter (iOS only): `bunx e2e run` (tester-army/e2e)
- Keep PR CI focused on high-Leverage, high-Locality checks: Expo compatibility, lint, typecheck, and unit/component tests.
- Browser-level E2E tests (Playwright, Cypress, etc.) and visual-regression screenshot tests are intentionally not part of the stack — they were dropped as high-noise, low-signal for an iOS-first solo project. If web ever becomes load-bearing, add browser tests that exercise behaviour, not existence.
- Keep tester-army/e2e (`e2e/`) as the only native E2E Adapter: the pinned iPhone 17 Pro simulator with a dev client built for the current app version, run locally or before a release, not in PR CI. Release checks use deterministic `expect` steps. Agent steps need `bunx e2e login github-copilot` and send the screen to the model provider, so never run them where real Health data is visible or target a physical iPhone. Android flows are not maintained (Android is best-effort).
- Pre-commit hooks (Husky + lint-staged) auto-run ESLint `--fix` on staged `.ts`/`.tsx`/`.js`/`.jsx`/`.mjs` files.

### Developer evaluations

- Follow `evals/README.md` for fixed synthetic cases, reviewed workflow evidence,
  and before/after comparisons. Skill-format validation is not a behavioral eval.
- `/dev-ai-evals` is development-only: synthetic inputs and ephemeral results,
  no Health reads/writes, personal stores, photos, network, or automatic runs.
  Unsupported devices must report blocked, never substitute mock model output.
- Schema checks do not establish factual or nutritional accuracy. Keep semantic
  review explicit; mocked Jest tests do not qualify the actual Apple model.
- Record source revision and native/OS context with results, keep raw reports
  out of Git, and never upload real Health data or private session transcripts.
- Use bounded repair attempts and unchanged acceptance criteria. Escalate
  missing evidence instead of relabeling blocked or unreviewed work as passed.

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
- Keep `.github/skills/` for repo-specific skills only. Generic Expo and EAS guidance comes from the official `expo/skills` set (`bunx skills add expo/skills`); do not vendor copies into the repo.
- Keep sensitive data out of instruction files; use environment variables and local-only config for secrets.
