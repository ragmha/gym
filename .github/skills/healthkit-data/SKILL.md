---
name: healthkit-data
description: 'Preserves the app’s HealthKit read and explicitly approved write boundaries. Use when adding a health metric, diagnosing snapshot data, or changing body-mass or water writes.'
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
3. Writes are scope-limited. Use only the approved `bodyMassWriter` or
   `waterWriter` ports and their iOS implementations. Do not add another write
   path without explicit user sign-off.
4. Require explicit confirmation, the narrow required share permission,
   boundary validation, and a native saved sample before reporting success.
   The compatible native-version gate must fail closed.
5. Never log entered values, sample details, or native error text. Water adds
   samples only; it never edits or deletes existing Health samples.
6. Native dependency or permission-purpose changes require a new binary, not
   an OTA update.

## Validation

Run targeted tests for the changed adapter, writer, and presentation path, then:

```bash
bun run lint
bun run typecheck
bun run test:unit -- --runInBand --no-watchman
```

For a write change, verify unsupported platforms and incompatible native
versions fail before permissions or native picker loading. Verify success only
after the native saved sample is returned.
