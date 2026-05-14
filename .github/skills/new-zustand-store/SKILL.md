---
name: new-zustand-store
description: 'Creates repo-consistent Zustand stores with persistence, selectors, initialization, and Supabase-aware actions. Use when adding a new domain store or extending state management in src/stores.'
---

# New Zustand Store

## Quick start

Create `src/stores/<Domain>Store.ts` and expose a small public interface:

```ts
export interface DomainState {
  items: DomainItem[]
  isLoading: boolean
  error: string | null
  initialize: () => Promise<void>
}
```

Use `create<State>()`, `persist`, `createJSONStorage(() => AsyncStorage)`, `partialize`, and selector hooks with `useShallow`.

## Workflow

1. Define the domain state interface first: persisted data fields, ephemeral UI fields, and action signatures.
2. Keep business logic in the store and UI logic in components; do not put derived values into raw store state.
3. Use `create<State>()(persist(...))` for stores that need persistence, with `partialize` to exclude loading flags, errors, and initialization flags.
4. For Supabase-backed stores, validate inputs with existing Zod schemas, map snake_case rows to camelCase models explicitly, and surface errors through the store's existing error pattern.
5. Export focused selector hooks or a convenience hook using `useShallow` so components do not rerender for unrelated state changes.
6. Initialize stores from screens or layouts with a guarded `useEffect` that calls `initialize()` once.

## Validation

For each behavior, add or update tests through the public store hook/API rather than internal implementation details.

Run:

```bash
bun run lint
bun run typecheck
bunx jest --runInBand
```

## Guardrails

- Never mutate arrays or objects from Zustand state directly; use immutable updates.
- Do not persist volatile fields such as `isLoading`, `error`, or in-flight promises.
- Do not use `any` for store state, actions, or Supabase rows.
- Prefer Zod v4 top-level schemas such as `z.uuid()` and `z.iso.datetime()` when adding validators.
- Keep store modules deep: small component-facing API, deeper implementation inside actions.
