---
name: new-screen-route
description: 'Adds Expo Router screens using this app’s root-stack and typed-route conventions. Use when creating a screen under src/app or wiring navigation in _layout.tsx.'
---

# New Screen Route

## Quick start

Add screens under `src/app/`. Most routes live directly there; Gym routes live under `src/app/gym/`.

Register route options in the nearest `_layout.tsx` and navigate with Expo Router typed routes rather than ad-hoc string paths.

## Workflow

1. Choose a root-stack route or a nested route under `src/app/gym/`; use `[param].tsx` for dynamic details.
2. Create a small screen component using React Native primitives, project design tokens, and `@/*` imports.
3. Register stack options in the nearest `_layout.tsx`; keep headers and presentation consistent with nearby screens.
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
