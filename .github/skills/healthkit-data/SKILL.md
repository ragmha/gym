---
name: healthkit-data
description: 'Preserves the app’s HealthKit read and explicitly approved write boundaries. Use when adding a health metric, diagnosing snapshot data, or changing body-mass, water, or food writes.'
---

# HealthKit Data

## Quick start

Read `src/lib/healthSnapshot/HealthSnapshotSource.ts` and
`.github/copilot-instructions.md` → Data (HealthKit). `HealthSnapshotSource`
is the read seam: iOS reads HealthKit and other platforms use deterministic
mock snapshots.

## Workflow

1. For a new read metric, update the nullable contract in `types.ts`, the iOS
   query in `iosAdapter.ts`, the deterministic mock snapshot in `mockAdapter.ts`,
   its `READ_PERMISSIONS` entry, presentation mapping, and focused tests.
2. Preserve `null` for unavailable readings and preserve observed zeroes.
   Never cache HealthKit readings in a store or invent a fallback measurement.
3. Keep dashboard/Settings requests read-only. Authorization-request completion
   and fetch readiness do not prove a read grant; HealthKit keeps grants private.
4. Use only the approved `bodyMassWriter`, `waterWriter`, and `foodWriter`
   ports and their iOS implementations. New write paths need explicit user
   sign-off via `scope-exception`; existing exceptions do not widen that scope.
5. Require explicit confirmation, narrow sharing permissions, boundary
   validation, and a native saved sample before reporting success. Fail closed
   on incompatible immutable native versions before feature imports/permissions.
   Keep drafts ephemeral, reject invalid/future times, and require today for
   water/food. Never save on Enter, blur, cancel, or dismiss.
6. For `foodWriter`, require Energy sharing and a saved Food correlation with
   every submitted child sample. Include positive macros only when shared;
   preserve `HKFoodType` and user-entered metadata. Keep FoodVision and
   `generateValidatedJson` on-device; no invented estimate for missing labels
   or an unavailable model. Schema validity does not establish meal accuracy.
7. Never log entered values, sample details, or native error text. Water and
   food add samples only; never edit/delete Health samples. Do not persist or
   upload photos/estimates, or give manual drafts to the coach.
8. Native dependency or permission-purpose changes require a new isolated
   binary through `eas-release`, not an OTA to an older binary.

## Validation

Run targeted adapter/writer/presentation tests with `--bail`; wrap checks with
global `stay-sharp`'s `run_silent`, then:

```bash
run_silent "lint" "bun run lint"
run_silent "typecheck" "bun run typecheck"
run_silent "unit tests" "bun run test:unit -- --runInBand --no-watchman --bail"
```

For a write change, verify unsupported platforms and incompatible native
versions fail before permissions or native picker loading. Verify success only
after the native saved sample is returned, including the Food correlation's
children. Cover denied sharing, malformed input, double taps, and unavailable
read-back without claiming a successful save guarantees a readable sample.
