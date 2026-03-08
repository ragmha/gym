# Code Review Findings

> Generated: 8 March 2026
> Updated: 8 March 2026 — marked resolved items, added dependency audit

## Current Health

| Check      | Status                     |
| ---------- | -------------------------- |
| Tests (75) | All passing                |
| TypeScript | Clean — no errors          |
| ESLint     | Clean — no errors/warnings |

---

## 1. Security

### ~~HIGH — Supabase keys in EAS build config~~ ✅ ALREADY RESOLVED

`eas.json` no longer contains AWS secrets. Previously injected `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME` via env vars — these have been removed.

### HIGH — No authentication / Row Level Security (RLS)

`src/lib/supabase.ts` creates a Supabase client with `detectSessionInUrl: false` and no auth flow. The app reads/writes the `exercises` table using the publishable anon key with no user context.

**Risk**: Without RLS policies, any user with the anon key can read/modify all data.

**Fix**: Add Supabase Auth (even anonymous auth) and enforce RLS on the `exercises` table.

### MEDIUM — No input sanitization on Supabase writes

`ExerciseStore.ts` `sync()` pushes `exercise.exercises` (array of detail objects) directly to Supabase with no validation.

**Fix**: Validate data shape with Zod before writing.

### LOW — Env var fallback chain allows CLI variables in production

`supabaseEnv.ts` has an `allowCliVariables` option for fallback env vars. Only used in `scripts/debug-db.ts` — acceptable, but ensure this path is never reachable at runtime in the app bundle.

---

## 2. Code Quality & Refactoring

### ~~HIGH — Routing bug in details screen~~ ✅ FIXED

Fixed: `Workout.tsx` now passes `item.localId` (UUID) and `details/[id].tsx` uses `id` param to look up the exercise. Also fixed related type mismatch in `exerciseDetailClientSchema` (sets now typed as `number` in client schema).

### ~~HIGH — `useExerciseStore` convenience hook causes unnecessary re-renders~~ ✅ FIXED

Fixed: Added `useShallow` from `zustand/react/shallow` for the state selector and wrapped derived arrays (`exerciseList`, `activeExercises`, `completedExercises`, `completedCount`) in `useMemo`.

### ~~MEDIUM — `ProgessCard.tsx` filename typo~~ ✅ FIXED

Renamed to `ProgressCard.tsx`. Updated imports in `HealthMetrics.tsx` and `WorkoutProgress.tsx`.

### ~~MEDIUM — `fetchExercies` typo in data layer~~ ✅ ALREADY RESOLVED

`src/data/fetch-exercises.ts` now exports `fetchExercises`. The deprecated `fetchExercies` alias exists for backward compatibility.

### MEDIUM — CalendarStrip infinite scroll bug risk

`CalendarStrip.tsx` handles `onMomentumScrollEnd` by detecting page index and calling `onPrevWeek`/`onNextWeek` which set state + `scrollTo`. This can race with the scroll end event and cause jumpy behavior.

### LOW — Cardio checkbox state not persisted

`CardioDetails.tsx` uses local `useState` for morning/evening checkboxes. This state is lost on navigation and never synced to the store.

### LOW — Unused `deleted` field in model

`types/models.ts` defines `deleted?: boolean` on `Exercise`, but it's never used anywhere in the codebase.

### LOW — `enableDangerousAutofixThisMayCauseInfiniteLoops` is enabled

`eslint.config.mjs` enables the dangerous autofix flag for `react-hooks/exhaustive-deps`. This can silently introduce infinite render loops when linting auto-fixes.

---

## 3. Testing Coverage

### HIGH — No tests for these components

| Component       | Test File |
| --------------- | --------- |
| `CalendarStrip` | Missing   |
| `CardioDetails` | Missing   |
| `Header`        | Missing   |
| `VideoPlayer`   | Missing   |
| `Workout`       | Missing   |
| `WorkoutDetail` | Missing   |

### HIGH — No tests for screens/pages

None of the route screens (`index.tsx`, `workouts.tsx`, `settings.tsx`, `details/[id].tsx`) have test files.

### MEDIUM — No integration test for Workout → Detail navigation flow

The routing param mismatch (`id` vs `localId`) would be caught by an integration test.

### MEDIUM — No test for `useHealthKit` hook

The hook has no dedicated test. The HealthKit lib functions are well-tested, but the hook's state management, retry, and auto-init logic are not.

### ~~LOW — `console.error` noise in ExerciseStore tests~~ ✅ FIXED

Added `jest.spyOn(console, 'error').mockImplementation()` to the failure test case with proper cleanup.

---

## 4. Platform Compatibility

### HIGH — Web: `DailySteps` and `HealthMetrics` are completely hidden

Both return `null` on non-iOS platforms. Web users see the home screen with only CalendarStrip + WorkoutProgress. No fallback UI or messaging.

**Fix**: Show a placeholder or web-appropriate alternative (e.g., manual step entry, or hide the section gracefully with a message).

### MEDIUM — Web: `react-native-webview` top-level import

`VideoPlayer.tsx` correctly uses an `<iframe>` on web, but importing `react-native-webview` at module scope may cause bundle warnings on web.

### MEDIUM — Web: `react-native-circular-progress-indicator` web compatibility

This library wraps `react-native-svg`. It works on web via `react-native-web`, but no web-specific testing is evident.

### MEDIUM — Android: HealthKit plugin in `app.json`

`app.json` includes `react-native-health` as a plugin. This is iOS-only and may cause prebuild warnings on Android. Consider conditional plugin application via `app.config.js`.

### ~~LOW — `Dimensions.get('window')` called at module scope~~ ✅ FIXED

Replaced with `useWindowDimensions()` hook inside the `CalendarStrip` component. Width is now reactive to rotation/resize.

---

## 5. App Store Readiness

### HIGH — No privacy manifest (`PrivacyInfo.xcprivacy`)

Apple requires a privacy manifest for apps using specific APIs. `AsyncStorage` uses `NSUserDefaults` under the hood. Missing this will cause App Store rejection.

**Fix**: Add `PrivacyInfo.xcprivacy` via a config plugin or manual CNG step.

### HIGH — Verify `NSHealthShareUsageDescription` in Info.plist

HealthKit usage strings are in `app.json` via the `react-native-health` plugin — confirm they're correctly generated in `Info.plist` after prebuild. Vague or missing descriptions cause rejection.

### HIGH — No account deletion flow (pre-emptive)

If the app ever adds user accounts (Supabase Auth), Apple requires account deletion capability. Currently no auth exists — flagged as pre-emptive.

### MEDIUM — No onboarding or first-run experience

Apple reviewers expect a clear first-run experience. The app launches directly to the home screen with no explanation.

**Fix**: Add a lightweight onboarding screen or first-launch modal.

### MEDIUM — HealthKit permission prompt timing

`useHealthKit.ts` auto-requests HealthKit authorization on mount. Apple guidelines say permission prompts should be contextual.

**Fix**: Defer the prompt to when the user taps "Connect Apple Health" in settings, not on app launch.

### MEDIUM — No error boundary

No React error boundary exists. An unhandled crash results in a blank white screen, which reviewers flag as a quality issue.

### LOW — `supportsTablet: true` without iPad optimization

`app.json` has `supportsTablet: true` but there's no iPad-specific layout or testing.

---

## 6. Build & DX

### MEDIUM — No CI/CD pipeline

No GitHub Actions workflow exists for running tests, lint, or type-checking on PRs.

### ~~LOW — ESLint Prettier error~~ ✅ FIXED

`expo-env.d.ts` trailing newline error resolved.

### LOW — `runtimeVersion` uses `appVersion` policy

`app.json` uses `"policy": "appVersion"`. OTA updates break whenever the app version changes. Consider `"fingerprint"` policy for more precise native/JS alignment.

---

## 7. Unused Dependencies ✅ FIXED

Full dependency audit performed against source imports, config files, and peer dependency requirements.

### ~~HIGH — Unused runtime dependencies (2 packages)~~ ✅ FIXED

Removed `victory-native` and `@shopify/react-native-skia` — zero imports in `src/`, inflated bundle with unused native modules.

### ~~MEDIUM — Unused dev dependencies (6 packages)~~ ✅ FIXED

Removed: `@testing-library/jest-dom`, `@testing-library/jest-native`, `@types/react-native-svg-charts`, `eslint-config-universe`, `jest-environment-jsdom`, `bun-types`.

### LOW — `expo-web-browser` has no source imports

Listed as a plugin in `app.json` but never imported in application code. Verify the plugin is needed; if not, remove from both `app.json` and `package.json`.

---

## Priority Summary

| Priority   | Count | Remaining | Key Remaining Items                                                                          |
| ---------- | ----- | --------- | -------------------------------------------------------------------------------------------- |
| **HIGH**   | 11    | 4         | No RLS, no privacy manifest, missing tests (6 components + screens), hidden web UI           |
| **MEDIUM** | 16    | 7         | No onboarding, HealthKit prompt timing, no error boundary, no CI, scroll race, Android plugin |
| **LOW**    | 7     | 3         | Cardio state not persisted, unused model field, `expo-web-browser` unused                    |

## ✅ Resolved Items (8)

1. ~~Routing bug (`id` vs `localId`)~~ — fixed in `Workout.tsx` + `details/[id].tsx`
2. ~~`useExerciseStore` re-renders~~ — added `useShallow` + `useMemo`
3. ~~`ProgessCard.tsx` typo~~ — renamed to `ProgressCard.tsx`
4. ~~`Dimensions.get('window')` at module scope~~ — replaced with `useWindowDimensions()`
5. ~~`console.error` test noise~~ — suppressed with spy
6. ~~ESLint Prettier error~~ — auto-fixed
7. ~~Unused runtime deps~~ — removed `victory-native` + `@shopify/react-native-skia`
8. ~~Unused dev deps~~ — removed 6 packages

## Recommended Fix Order (Remaining)

1. Add `PrivacyInfo.xcprivacy` to avoid App Store rejection
2. Add Supabase RLS or auth to secure data
3. Add tests for untested components and the navigation flow
4. Defer HealthKit prompt to user-initiated action
5. Add error boundary for crash resilience
6. Set up CI/CD pipeline
