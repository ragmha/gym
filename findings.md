# Code Review Findings

> Generated: 8 March 2026

## Current Health

| Check      | Status                                      |
| ---------- | ------------------------------------------- |
| Tests (75) | All passing                                 |
| TypeScript | Clean — no errors                           |
| ESLint     | 1 fixable Prettier issue in `expo-env.d.ts` |

---

## 1. Security

### HIGH — Supabase keys in EAS build config

`eas.json` injects `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME` via env vars in all three build profiles. If these end up in the JS bundle or are logged, they leak.

**Fix**: Move AWS secrets to EAS Secrets (server-side) rather than `env` blocks. Verify they aren't referenced in client code.

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

### HIGH — Routing bug in details screen

In `src/app/details/[id].tsx`, the component destructures `localId` from search params:

```tsx
const { localId, title } = useLocalSearchParams()
```

But `Workout.tsx` navigates with `id` (not `localId`):

```tsx
href={{ pathname: '/details/[id]', params: { id: item.id, title: item.title } }}
```

`item.id` is the Supabase `day` field (e.g., `"1"`), not the `localId` (UUID). The details screen will fail to find the exercise. **This is a runtime bug.**

### HIGH — `useExerciseStore` convenience hook causes unnecessary re-renders

`ExerciseStore.ts` calls `Object.values(store.exercises)` and creates derived arrays on every render. Every store mutation triggers a re-render of all consumers.

**Fix**: Use `useExerciseStoreBase` with selectors in components that need fine-grained subscriptions.

### MEDIUM — `ProgessCard.tsx` filename typo

`src/components/ProgessCard.tsx` — "Progess" should be "Progress". Rename to `ProgressCard.tsx` and update all imports.

### MEDIUM — `fetchExercies` typo in data layer

`src/data/fetch-exercises.ts` exports `fetchExercies` (missing 's'). Should be `fetchExercises`.

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

### LOW — `console.error` noise in ExerciseStore tests

Test output shows `console.error('Error initializing store:')` during the "unexpected failure" test case. Should be suppressed with `jest.spyOn(console, 'error').mockImplementation()`.

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

### LOW — `Dimensions.get('window')` called at module scope

`CalendarStrip.tsx` calls `Dimensions.get('window')` at the top level. This captures the initial window size and won't update on rotation or window resize (relevant for web/tablets).

**Fix**: Use `useWindowDimensions()` hook instead.

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

### LOW — ESLint Prettier error

`expo-env.d.ts` has a trailing newline Prettier error. Run `bunx eslint . --fix` to resolve.

### LOW — `runtimeVersion` uses `appVersion` policy

`app.json` uses `"policy": "appVersion"`. OTA updates break whenever the app version changes. Consider `"fingerprint"` policy for more precise native/JS alignment.

---

## Priority Summary

| Priority   | Count | Key Items                                                                                       |
| ---------- | ----- | ----------------------------------------------------------------------------------------------- |
| **HIGH**   | 9     | Routing bug, no RLS, no privacy manifest, missing tests (6 components + screens), hidden web UI |
| **MEDIUM** | 10    | Re-render perf, filename typo, no onboarding, HealthKit prompt timing, no error boundary, no CI |
| **LOW**    | 6     | Cardio state not persisted, unused model field, console noise, `Dimensions` at module scope     |

## Recommended Fix Order

1. Fix the routing bug in details screen (`id` vs `localId` mismatch)
2. Add `PrivacyInfo.xcprivacy` to avoid App Store rejection
3. Add Supabase RLS or auth to secure data
4. Add tests for untested components and the navigation flow
5. Defer HealthKit prompt to user-initiated action
