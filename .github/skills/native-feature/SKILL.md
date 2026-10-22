---
name: native-feature
description: 'Adds Gym-specific native capabilities safely across binary versions. Use when changing a local module, native permission, extension, entitlement, or native feature gate.'
---

# Native Feature

## Quick start

Confirm scope with `scope-exception`, then read `app.json`, `package.json`,
the owning `modules/` source/config, and the canonical native/release rules.
Use installed global `expo-module` and `expo-dev-client` for generic APIs;
use global `eas-app-stores` / `eas-update` with repo `eas-release` for release
mechanics. Do not copy those skills or generic templates into this repository.

## Workflow

1. Identify the owning app/module/extension and its data lifecycle. Keep local
   module registration in `expo-module.config.json`, native source in its
   `modules/` owner, and generated project setup in CNG config/plugins.
   Do not hand-edit generated `ios/` or `android/` as the durable implementation.
2. Inspect `src/lib/healthSnapshot/healthKitWriteNativeSupport.ts` and
   `nativeApplicationVersion.ts` for the existing immutable-version pattern.
   Check iOS, required OS support, `nativeApplicationVersion`, and actual module
   capability before importing the feature module or requesting its permissions.
3. Fail closed for old, missing, malformed, or unreadable native versions and
   missing modules. Never trust the live Expo config version after an OTA.
   Set the minimum to the first compatible native binary, not a convenient
   current JS version. Keep web/Android fallbacks safe via `platform-gate`.
4. Check target ownership, bundle IDs, entitlements, signing, and provisioning
   for both host and extension. Inspect `modules/gym-watch/watch/` for watch
   targets and the `expo-widgets` plugin for widget targets, rather than adding
   a competing extension owner.
5. Keep `group.io.raghib.gym` limited to approved widget layouts and Daily rings
   display data. Do not use App Groups as a general Health cache or expose
   private inputs to another target. Preserve the Phone rest distribution gate.
6. Isolate any native code/dependency/config change, including patches/removals,
   with a higher matching version in `app.json` and `package.json`; retain
   `runtimeVersion: { "policy": "appVersion" }`. Build-number changes alone
   do not isolate incompatible code.
7. Require the fingerprint-gated workflow's candidate/baseline SHA, native
   fingerprint comparison, and runtime-isolation result. Missing/failed detector
   evidence blocks release. Native changes skip preview OTA and need a new
   binary; a later JS update cannot deliver missing native code to an old app.

## Validation

Add focused tests for unsupported platforms/OS versions, missing/old/malformed
versions, missing modules, and the compatible path. Assert incompatible paths
make zero feature imports, permission requests, or native calls.

Use `run_silent` from global `stay-sharp` for focused tests (`--bail`), lint,
typecheck, and relevant Expo checks. Inspect generated target configuration and
build/signing evidence, then use `ios-dev-loop` and `e2e-smoke` on the compatible
binary. Simulator success does not qualify physical camera/motion behavior.

Record native version/build, OS/device, source revision, gate coverage, and
release-path evidence. Keep pending binary/TestFlight/device qualification
explicit; follow `evals/README.md` for synthetic workflow evaluation.
