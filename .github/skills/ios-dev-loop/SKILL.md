---
name: ios-dev-loop
description: 'Establishes Gym iOS development environment readiness. Use when selecting a simulator, checking the installed dev client, diagnosing Metro ownership, or resolving launch/log problems before behavior tests.'
---

# iOS Dev Loop

## Quick start

Read `e2e.config.ts`, `e2e/ios-simulator.ts`, `app.json`, and `package.json`.
Use global `expo-dev-client` for generic development-build commands.
This skill proves environment readiness; use `e2e-smoke` for behavior on the
ready device, not as a substitute for checking the environment.

```bash
git rev-parse --show-toplevel
git rev-parse HEAD
xcrun simctl list devices available --json
lsof -nP -iTCP:8081 -sTCP:LISTEN
```

## Workflow

1. Record the worktree, branch, revision/dirty state, and current app version
   from both manifests. Work in the task's worktree, never switch or build in
   the main checkout. Do not install dependencies unless actually missing.
2. Resolve the available **iPhone 17 Pro** simulator through the existing
   resolver. Record its exact UDID and OS runtime; target that UDID throughout.
   Do not substitute an arbitrary booted device or a connected physical phone.
3. Inspect installed `io.raghib.gym`: native version/build and development-client
   capabilities must match the needed native runtime, not just the OTA config.
   If missing/incompatible, build/install only within the authorized task;
   otherwise report blocked. Do not bump version strings to fake compatibility.
4. Attribute Metro on port 8081 to a PID and working directory before reusing
   it. Inspect that PID's command and cwd (for example with `ps` and `lsof`).
   Never kill all Node/Metro processes or reuse another worktree's bundle.
   Stop only a process you own by exact PID; an ownership conflict is blocked.
5. Start Metro from this worktree only when needed. Keep the existing E2E
   command/port contract, verify its configured `/status` ready URL, and confirm
   the selected client opens this server. A listening port alone is insufficient.
6. Boot the selected simulator, launch the installed client, and inspect bounded
   app/Metro logs for a completed launch or native-module failure. Record errors
   without Health values, credentials, or raw private native error payloads.
7. Use only synthetic test data or honest unavailable readings. Read-authorization
   request completion is not a HealthKit read grant. Do not seed Health, reset
   Health permissions, clear app data, or erase a device as a readiness shortcut.

## Validation

Report worktree/revision, expected and observed native version/build, UDID/OS,
Metro PID/cwd/port, ready-URL result, and launch/log evidence. Keep missing
readings separate from environment failures; do not invent measurements.

Allow one targeted repair and one readiness recheck after the initial failure.
Stop after the second failure, missing required runtime/signing, an ownership
conflict, or a privacy boundary. Report blocked rather than silently changing
the device or claiming that a web build proves iOS readiness.

Wrap any test/build/lint/typecheck with global `stay-sharp`'s `run_silent` and
supported fail-fast flags. Hand the verified environment to `e2e-smoke`; readiness
alone proves neither UI acceptance nor real-device sensor/Health behavior.
