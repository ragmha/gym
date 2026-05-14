---
name: new-screen-route
description: 'Adds Expo Router screens that match this app’s tab, stack, modal, and typed route conventions. Use when creating a new screen, adding a route under src/app, editing (tabs), or wiring navigation in _layout.tsx.'
---

# New Screen Route

## Quick start

Add screens under `src/app/`. Put primary navigation in `src/app/(tabs)/<name>.tsx`; put modal or stack screens beside the root `_layout.tsx`, such as `src/app/weight.tsx`.

Register route options in the nearest `_layout.tsx` and navigate with expo-router typed routes rather than ad-hoc string paths.

## Workflow

1. Choose the route shape: `(tabs)` for core tabs, `[id].tsx` for dynamic details, or a root stack/modal file for focused flows.
2. Create a small screen component using React Native primitives, project design tokens, and `@/*` imports.
3. Register stack or tab options in `src/app/_layout.tsx` or `src/app/(tabs)/_layout.tsx`; keep headers and presentation consistent with nearby screens.
4. Link to the screen with `Link`, `router.push`, or `router.navigate` using typed routes, including explicit params for dynamic paths.
5. Keep data access in stores/hooks; screens should compose UI and call existing domain APIs.

## Validation

Run:

```bash
bun run lint
bun run typecheck
bunx jest --runInBand
```

Also smoke-test the route on iOS simulator and web when navigation, layout, or platform behavior changes.

## Guardrails

- Do not duplicate route names across groups unless Expo Router semantics require it.
- Keep HealthKit or native-only UI hidden or gracefully degraded off iOS.
- Prefer platform-specific files for major divergence; use small inline gates only for simple layout differences.
- Do not add Android-only navigation or native dependencies for a screen unless they also serve iOS or web.
