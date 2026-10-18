---
name: ui-change
description: 'Keeps app screens consistent with the implemented visual system and platform behavior. Use when changing a screen, shared component, layout, theme, or interaction.'
---

# UI Change

## Quick start

Read `DESIGN.md`, then inspect the nearest screen/component and its tests.
Use `useTheme` and the existing `Colors`, `Typography`, `Spacing`, `Radii`,
and `Layout` tokens instead of adding hardcoded colors or arbitrary spacing.

## Workflow

1. Turn every requested screen block and control into an acceptance checklist.
2. Preserve the iOS-first layout, outline icon treatment, and theme behavior.
   Check light and dark mode, narrow layouts, and Dynamic Type wrapping.
3. Keep interactive targets at least 48pt, with accessible names and roles.
4. Honor Reduce Motion. Motion should communicate a user-caused state change
   or completion, not decorate the screen.
5. Gate HealthKit/native UI to iOS and provide the existing graceful web and
   Android fallback behavior.
6. Run the app on the relevant surface and inspect the rendered result:
   `bun run web` for web or the iOS development build/simulator for native UI.

## Validation

Run focused component/screen tests, then the relevant checks:

```bash
bun run lint
bun run typecheck
bun run test:unit -- --runInBand --no-watchman
```

Use `bun run build:web` as the web export smoke check. If design tokens change,
also validate `DESIGN.md` against `src/constants/Colors.ts` and
`src/constants/DesignSystem.ts`.
