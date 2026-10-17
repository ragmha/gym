---
name: new-zustand-store
description: 'Guards Zustand state under the ThemeStore-only policy and shows the persisted preference-store pattern. Use when adding or changing state in src/stores, or before persisting any app state.'
---

# New Zustand Store

`ThemeStore` persists one UI preference, and `GymLogStore` is the user-approved
on-device lifting log (sets and reps HealthKit cannot hold). Health data
is read per day with `useHealthSnapshot(date)` and never stored. There is no
backend, network client, or environment configuration.

## Quick start

Before you create a store, classify the state:

1. HealthKit data: read it through `useHealthSnapshot`. Do not create a store.
2. Form input, such as the weight form or Water draft: keep it in component
   state. Writes go only through the approved HealthKit writer ports.
3. A device-local UI preference: follow the `ThemeStore` pattern, but only after
   explicit user sign-off.

This is the pattern from `src/stores/ThemeStore.ts`:

```ts
export const usePreferenceStore = create<State>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: 'preference-key',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
```

## Workflow

1. Get explicit sign-off before adding a store or a persisted field. This is a
   scope decision; see `.github/copilot-instructions.md` → State Management.
2. Prefer adding a field to an existing preference store over creating a store.
3. Persist only the preference. If the store gains volatile fields, exclude them
   with `partialize`.
4. Select single fields, such as `useThemeStore((s) => s.preference)`. Use
   `useShallow` only when you select several fields together.
5. Never store health readings, entered measurements, snapshot caches,
   profiles, or network data.

## Validation

Test behavior through the public store hook, not its internals.

```bash
bun run lint
bun run typecheck
bunx jest --bail
```

## Guardrails

- Do not add Supabase, other backends, or environment variables.
- Do not use `any` in state or actions.
- Update state immutably.
