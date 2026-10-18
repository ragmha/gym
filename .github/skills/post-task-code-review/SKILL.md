---
name: post-task-code-review
description: 'Reviews completed code changes for security, correctness, performance, deprecated APIs, and maintainability. Use before committing implementation changes.'
---

# Post-Task Code Review

## Quick start

Review the full diff, not just the last edit. For code changes, run the focused
tests plus lint and typecheck; use `bun run quality:pr` for broad changes.

## Workflow

1. List changed files and read their complete diff.
2. Check security and data safety:
   - No credentials, user measurements, HealthKit sample details, or native error text in logs.
   - Health reads use `HealthSnapshotSource`; writes use only approved writer ports and explicit confirmation.
   - No new backend, persistence, or manual-entry path without explicit approval.
3. Check correctness:
   - Null and unavailable health values stay distinct from observed zeroes.
   - Validate data at trust boundaries and preserve error states rather than returning success-shaped fallbacks.
   - Verify async failures, hooks, state updates, and platform gates.
4. Check performance:
   - Avoid unnecessary render work, unbounded reads, duplicated HealthKit queries, and dependencies for trivial logic.
5. Check API and type safety:
   - Use APIs supported by the installed Expo SDK; do not add deprecated APIs, `any`, or unjustified suppressions.
6. Check maintainability:
   - Follow nearby patterns, use `@/*` imports, remove dead code, and keep platform-specific behavior gated.
7. Fix critical and high-confidence issues, then rerun the relevant checks.

## Validation

Run the smallest checks covering the changed code. For example:

```bash
bun run lint
bun run typecheck
bun run test:unit -- --runInBand --no-watchman
```

For broad changes, use `bun run quality:pr`. Keep test output bounded with the
project's `run_silent` helper when available; do not discard failure details.

Report findings as `[SEVERITY] file:line — issue`, with a concrete fix. Do not
invent repository paths or APIs when writing examples.
