# Plan 001: README getting-started simplification (archived)

This completed documentation task is retained as a historical record, not an
executable plan. Use the current [README](../README.md) for setup and
[project policy](../.github/copilot-instructions.md) for architectural constraints.

## Outcome

The README now leads with prerequisites, installation, and the available run
commands. Detailed implementation instructions do not belong in the first-run
path.

## Current setup

- Install the declared dependencies with `bun install`.
- Run `bun run ios` for an iOS development build or `bun run web` for the
  deterministic design preview. `bun run start` serves an installed development
  build.
- No backend, environment configuration, or API keys are required.
- On iOS, review Health read access in Settings. Missing measurements remain
  unavailable; other platforms use deterministic mock data.
- The only approved manual health entry is confirmed body weight saved directly
  to Apple Health on a compatible iOS build, not a separate local or server history.

The earlier instructions were based on a retired architecture and have been
removed. Current commands and dependency requirements live in
[package.json](../package.json), not in this archive.
