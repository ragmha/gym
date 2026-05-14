---
name: platform-gate
description: 'Applies repo-specific iOS, web, and Android platform gates with deterministic fallbacks. Use when touching HealthKit, native modules, Platform.OS checks, Platform.select values, or mock data generation.'
---

# Platform Gate

## Quick start

Gate iOS-only features explicitly and provide deterministic fallback data elsewhere:

```ts
const enabled = Platform.OS === 'ios'
const padding = Platform.select({ ios: 20, web: 16, default: 14 })
```

Use existing mock adapters where possible; for new domains, add a deterministic `generateMockData` helper and test it.

## Workflow

1. Identify the platform dependency: HealthKit and native modules are iOS-first; web must not crash; Android is best-effort.
2. Use `Platform.select` for style, spacing, and config values instead of scattered branching.
3. Use `Platform.OS === 'ios'` before requesting native permissions, rendering HealthKit-only UI, or calling iOS-only adapters.
4. Provide a deterministic fallback adapter or `generateMockData` path for web, tests, and unsupported devices.
5. For large differences, split files with `.ios.tsx`, `.web.tsx`, or `.native.tsx` rather than growing conditional components.

## Validation

Run:

```bash
bun run lint
bun run typecheck
bunx jest --runInBand
```

For UI changes, smoke-test iOS and web. Add tests that assert unsupported platforms use the fallback path and do not call native-only APIs.

## Guardrails

- Never import or execute unsupported native APIs on web without a safe module boundary.
- Do not show HealthKit setup controls unless the iOS adapter is available.
- Keep mock data deterministic; avoid `Math.random()` for fallback snapshots.
- Prefer iOS and web correctness over Android parity, but avoid knowingly breaking Android.
