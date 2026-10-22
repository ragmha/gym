---
name: ui-change
description: 'Keeps app screens consistent with the implemented visual system and platform behavior. Use when changing a screen, shared component, layout, theme, or interaction.'
---

# UI Change

## Quick start

Read `DESIGN.md`, inspect the supplied reference and current rendered screen,
then inspect the nearest component and its tests. Resolve materially different
interpretations before implementing; a reference does not approve new data.
Use `useTheme` and the existing `Colors`, `Typography`, `Spacing`, `Radii`,
and `Layout` tokens instead of adding hardcoded colors or arbitrary spacing.

## Workflow

1. Turn every requested block and control into a reference-based acceptance
   checklist: label/position, action, expected destination/state, and proof.
   Keep source/availability states honest; reference artwork is not Health data.
2. Preserve the iOS-first layout, outline icons, root stack, and theme behavior.
   Keep the system-font typography, tabular numbers, gutters, safe areas, and
   layout hierarchy defined in `DESIGN.md`. Do not import generic aesthetic
   prompts that ban system fonts or request decorative entrance animations.
   Check light/dark mode, narrow layouts, and Dynamic Type wrapping.
3. Keep interactive targets at least 48pt, with accessible names and roles.
4. Honor Reduce Motion. Motion should communicate a user-caused state change
   or completion, not decorate the screen.
5. Gate HealthKit/native UI to iOS and provide the existing graceful web and
   Android fallback behavior.
6. Use `ios-dev-loop` for the native environment and `bun run web` for the
   browser. Compare actual renders against the supplied reference on both
   surfaces; code presence or a successful export is not render proof.
7. Tap every requested control and verify its destination/state and Back path.
   Record each checklist item's observed result with revision, device/build or
   browser context, and safe evidence. Use only synthetic screenshots.
   Use `e2e-smoke` for deterministic native automation, not a new test framework.

## Validation

Run focused component/screen tests with `--bail`; wrap checks with global
`stay-sharp`'s `run_silent`, then run the relevant checks:

```bash
run_silent "lint" "bun run lint"
run_silent "typecheck" "bun run typecheck"
run_silent "unit tests" "bun run test:unit -- --runInBand --no-watchman --bail"
```

Use `bun run build:web` as the web export smoke check. If design tokens change,
also validate `DESIGN.md` against `src/constants/Colors.ts` and
`src/constants/DesignSystem.ts`.

Report missing render/tap evidence as unverified, not complete. Keep acceptance
fixed during repairs; follow `evals/README.md` for reviewed workflow cases.
