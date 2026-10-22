---
name: platform-gate
description: 'Applies repo-specific iOS, web, and Android platform gates with deterministic fallbacks. Use when touching HealthKit, native modules, Platform.OS checks, Platform.select values, or mock data generation.'
---

# Platform Gate

## Quick start

Gate iOS-only features explicitly and provide deterministic fallback data elsewhere.
An iOS platform check alone does not establish native binary compatibility:

```ts
const enabled = Platform.OS === 'ios'
const padding = Platform.select({ ios: 20, web: 16, default: 14 })
```

Use the existing `HealthSnapshotSource` platform selection and deterministic mock adapter. The snapshot generator is `createDeterministicMockSnapshot`.

## Workflow

1. Identify the platform dependency: HealthKit and native modules are iOS-first; web must not crash; Android is best-effort.
2. Use `Platform.select` for style, spacing, and config values instead of scattered branching.
3. Use `Platform.OS === 'ios'` before requesting native permissions, rendering HealthKit-only UI, or calling iOS-only adapters.
4. For versioned features, use the existing immutable `nativeApplicationVersion`
   checks and actual OS/module capabilities before importing the feature module
   or requesting permissions. Follow `native-feature`; missing, malformed, or
   old binaries fail closed. The live Expo config version is not evidence.
5. Keep fallback readings in `deterministicMockAdapter`; use `createDeterministicMockSnapshot` for deterministic snapshot fixtures.
   Never replace unavailable real iOS readings with demo measurements.
6. For large differences, split files with `.ios.tsx`, `.web.tsx`, or `.native.tsx` rather than growing conditional components.

## Validation

Wrap checks with global `stay-sharp`'s `run_silent`:

```bash
run_silent "lint" "bun run lint"
run_silent "typecheck" "bun run typecheck"
run_silent "unit tests" "bunx jest --runInBand --no-watchman --bail"
```

For UI changes, smoke-test iOS and web. Test unsupported platforms/OS versions,
missing/old/malformed native versions, absent modules, and the compatible path.
Assert blocked paths never import the feature module or request permissions.
Record the actual native version/build and device OS; JS tests and an OTA
version label cannot prove that a user's installed binary supports the feature.

## Guardrails

- Never import or execute unsupported native APIs on web without a safe module boundary.
- Do not show HealthKit setup controls unless the iOS adapter is available.
- Do not interpret authorization-request completion as proof of a read grant.
- Keep mock data deterministic; avoid `Math.random()` for fallback snapshots.
- Do not add a second health-data source; platform selection belongs in `HealthSnapshotSource`.
- Prefer iOS and web correctness over Android parity, but avoid knowingly breaking Android.
