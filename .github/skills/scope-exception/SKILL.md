---
name: scope-exception
description: 'Checks Gym feature requests against approved product boundaries. Use when a request adds input, persistence, Health writes, coach context, networking, or a new native capability.'
---

# Scope Exception

## Quick start

Read `PRODUCT.md` and the relevant sections of `.github/copilot-instructions.md`
before designing the feature. The latter is canonical for approved boundaries;
flag stale or contradictory summaries instead of treating them as new approval.
Inspect the current data path and quote the specific approval being relied on.

## Workflow

1. Describe the requested behavior and the smallest change from the existing
   contract. If HealthKit already provides the measurement, read it through
   `HealthSnapshotSource`; do not design a duplicate form or cache.
2. Map every dimension below, using “none” where applicable. Separate current
   approved behavior from the proposed addition; cite the owning rule or code.

   | Dimension      | Record                                                                  |
   | -------------- | ----------------------------------------------------------------------- |
   | Input          | Explicit user action, inferred values, sensor/photo input               |
   | Source         | HealthKit, approved on-device log, native sensor, or external service   |
   | Storage        | Memory lifetime, approved store fields, cache/files, retention/deletion |
   | Health writes  | Approved port, sample types, confirmation and share permissions         |
   | Coach input    | Exact `buildDailyContext` contribution, or none                         |
   | Network        | Destination, payload, trigger, consent; distinguish SDK behavior        |
   | Native version | OS/capability gate, immutable binary minimum, runtime impact            |

3. Require explicit user approval for any new boundary, not merely a similar
   existing exception. A lifting log does not authorize Health writes; a meal
   photo estimate does not authorize a photo upload or nutrition history cache.
   “Apply best practices” is not approval for a backend, profile, or new store.
4. Without approval, stop that implementation and report the smallest proposed
   exception and its risks as blocked. Unattended execution is not consent.
   Continue only independent work already inside the approved scope.
5. After approval, implement only the mapped exception. Use `healthkit-data`,
   `new-zustand-store`, or `native-feature` as applicable; retain existing
   nullable readings, explicit confirmations, and on-device privacy boundaries.
6. Update only the relevant product contract in `PRODUCT.md` and the owning
   canonical rule. Link from other docs where needed; do not copy the entire
   policy into every skill, README, agent, and test.
7. Define synthetic accepted and rejected cases before implementation: approved
   action, missing approval, unavailable source, unsupported binary, and an
   attempted expansion of storage/network/coach access. Keep acceptance fixed.

## Validation

Trace each new input through source, storage, writes, coach, and network exits.
Verify “none” claims at the boundary, not merely by hiding a UI control.
Report the approval reference, changed rules, focused tests, and remaining
blocked scope; never label an unapproved path complete.

Use `evals/README.md` and `bun scripts/evaluate-workflows.ts` for reviewed workflow cases;
wrap checks with global `stay-sharp`'s `run_silent`. Skill-format validation is
not evidence that an agent will respect an unapproved boundary.
