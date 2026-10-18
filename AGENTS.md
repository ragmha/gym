# AGENTS.md

Short entry point for coding agents. Follow the canonical project guidance:

- `.github/copilot-instructions.md` — architecture, privacy, HealthKit, platform, and release rules.
- `PRODUCT.md` — product behavior and scope.
- `DESIGN.md` — visual system and UI conventions.
- `README.md` — setup and project overview.

## App map

- Expo SDK 55, React Native, TypeScript, Expo Router, and Bun.
- Routes are under `src/app/`; reusable UI is in `src/components/`.
- Health reads go through `src/lib/healthSnapshot/`; coach logic is in `src/lib/coach/`.
- Persisted state is limited to the approved stores in `src/stores/`.

## Commands

Use Bun. The focused checks are:

```sh
bun run lint
bun run typecheck
bun run test:unit -- --runInBand --no-watchman
```

Run the PR gate before a broad handoff:

```sh
bun run quality:pr
```

Other useful checks: `bun run build:web`, `bun run validate:ai-artifacts`,
`bun run check:dead-code`, and `bun run test:e2e:maestro:ios`.

## Working rules

- Read the matching `.github/skills/<name>/SKILL.md` before work covered by a skill.
- Use `@/*` imports for `src/*`; tests live beside code in `__tests__/`.
- Prefer the smallest relevant test/check, then run `quality:pr` for broad changes.
- Work on the session branch, never push directly to `main`; use conventional commits.
- Do not add dependencies, persistence, or data-entry paths without an explicit need and approval.
