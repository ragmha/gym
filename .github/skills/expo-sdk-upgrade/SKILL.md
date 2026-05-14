---
name: expo-sdk-upgrade
description: 'Guides safe, incremental Expo SDK upgrades for this Bun/Expo project. Use when upgrading Expo SDK versions, aligning Expo dependencies, or fixing SDK compatibility issues reported by Expo Doctor.'
---

# Expo SDK Upgrade

## Quick start

```bash
bunx expo install expo@~<target-sdk-version>
bunx expo install --fix
bunx expo-doctor@latest
bun run lint
bun run typecheck
```

## Workflow

1. Confirm the current SDK and target SDK from `package.json`; upgrade one SDK version at a time unless the user explicitly accepts the migration risk.
2. Create work in a sibling git worktree and keep the main checkout on `main`.
3. Update `expo` to the target SDK range, then run `bunx expo install --fix` so React, React Native, and Expo modules stay in the Expo-supported matrix.
4. Review the official Expo SDK release notes for required manual migration steps, removed APIs, config plugin changes, and native rebuild requirements.
5. Run `bunx expo-doctor@latest` and resolve all warnings that affect SDK compatibility, duplicate native modules, or unsupported packages.
6. If native files, config plugins, or native dependencies changed, treat the result as requiring a new binary build instead of an OTA-only EAS Update.

## Validation

Run these before committing:

```bash
bunx expo install --check
bunx expo-doctor@latest
bun run lint
bun run typecheck
bunx jest --runInBand
```

If `expo-doctor` reports duplicate native modules after an update, delete `node_modules`, run `bun install`, and rerun the doctor check before changing dependency ranges by hand.

## Guardrails

- Do not manually bump `react` or `react-native` independently from Expo recommendations.
- Do not run broad upgrade tools such as `ncu -u` for SDK work.
- Keep package manager commands on Bun (`bun install`, `bun add`, `bunx`).
- Check for deprecated APIs in files touched by migration steps.
- Use a conventional commit such as `chore(deps): upgrade Expo SDK`.
