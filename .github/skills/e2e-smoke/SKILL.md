---
name: e2e-smoke
description: 'Verifies Gym behavior on an already-ready iOS simulator. Use when running or repairing deterministic tester-army/e2e smoke checks or collecting native acceptance evidence before release.'
---

# E2E Smoke

## Quick start

Require `ios-dev-loop` readiness first: the current compatible dev client,
worktree-owned Metro, and the pinned **iPhone 17 Pro** simulator from
`e2e.config.ts` / `e2e/ios-simulator.ts`. Use tester-army/e2e only; do not add
another native/browser E2E framework or move simulator smoke tests into PR CI.

Inspect `e2e/*.e2e.ts`; the current deterministic baseline is:

```bash
run_silent "iOS smoke" "bunx e2e run e2e/home.e2e.ts e2e/settings.e2e.ts --target ios --workers 1 --retries 0 --max-failures 1 --no-cache"
```

Recheck `bunx e2e run --help` after runner upgrades; do not invent CLI flags.

## Workflow

1. Translate the requested behavior into fixed actions and deterministic
   `expect` assertions using existing roles, labels, and test IDs. Cover the
   destination and Back path, not merely that a tap was dispatched.
2. Select the relevant deterministic flows for `bunx e2e run`. Inspect selected
   files for agent steps before execution: `gym.e2e.ts` currently contains them.
   Agent assertions are not release proof; keep them separate from deterministic
   smoke evidence rather than silently counting an unfiltered suite as equivalent.
3. Record revision/dirty state, native version/build and build provenance,
   simulator UDID/OS, Metro worktree, command/selection, and acceptance criteria.
   Use only a synthetic-data test simulator. Inspect fixture/reset effects;
   never erase personal logs or seed Health implicitly to make a flow pass.
4. Run through global `stay-sharp`'s `run_silent`, fail fast, disable automatic
   retries/cache, and keep one worker. Inspect `test-results/e2e/report.json`:
   exit 0 also permits skipped/flaky tests, so require every selected test to
   pass without skips/flakiness. Do not commit screenshots, logs, or reports.
5. If agent-assisted exploration is explicitly wanted, it requires
   `bunx e2e login github-copilot` and sends screen content to the provider.
   Never use agent screenshots on a physical device or where real Health data
   is visible. Do not use provider exploration to bypass deterministic checks.
6. On failure, classify app behavior, environment, or test-contract mismatch
   from the first failure and bounded logs. Make at most **one** targeted repair
   and **one** rerun of the same acceptance criteria; record both attempts.
   Fix the cause, not the expectation: never rewrite assertions to bless wrong
   behavior, replace `expect` with an agent opinion, skip a failure, or add broad
   retries. Correct a stale test only against the approved product contract.
7. Stop on the second failure, unavailable simulator/dev client/Metro, missing
   required authorization, or privacy risk. Mark environment prerequisites **blocked**,
   assertion failures **failed**, and only observed passing assertions **passed**.
   Missing simulator evidence is never a pass or replaced by a Jest/web result.

## Validation

Report selected flows, each expected/observed result, command and exit status,
attempt count, source revision/build/device, and local evidence paths. Refresh
provenance after a repair; an old passing report cannot qualify changed code.

Use `evals/README.md` and `bun scripts/evaluate-workflows.ts` to evaluate the repair/status
decisions with synthetic cases. That reviewed workflow evaluation is separate
from real simulator execution; `bun run validate:ai-artifacts` proves only skill
structure. Keep blocked/unrun flows and physical-device qualification explicit.
