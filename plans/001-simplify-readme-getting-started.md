# Plan 001: Simplify the README getting-started path

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 51f3d08..HEAD -- README.md package.json CONTRIBUTING.md`.
> If `README.md` or the referenced setup files changed since this plan was written, compare the current content against the excerpts below before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `51f3d08`, 2026-09-20

## Why this matters

The README currently asks a new contributor to read 332 lines covering architecture, schema, CI/CD, testing philosophy, Figma MCP setup, branching policy, and troubleshooting before they can simply run the app. The first screen should answer only three questions: what this is, what must be installed, and which commands start it. A shorter README will improve first-run success without deleting useful contributor information from the repository.

## Current state

- `README.md:1-43` contains the useful newcomer path: project summary, prerequisites, install, environment variables, optional database debug, and run commands.
- `README.md:45-64` repeats the full command catalog.
- `README.md:65-110` documents project structure and import aliases.
- `README.md:112-184` documents architecture, database schema, and Zod validation.
- `README.md:186-224` documents CI/CD, CNG, and platform priorities.
- `README.md:226-297` documents quality gates, test strategy, Maestro, and Figma MCP.
- `README.md:299-332` documents branching, troubleshooting, and key safety.
- `CONTRIBUTING.md:1-104` is already the contributor-oriented home for first-time setup, day-to-day commands, coding standards, tests, CI, native builds, and help.
- `package.json:5-47` defines the commands that the simplified README must reference. The package manager field is `bun@1.3.5`; do not describe a different package manager.
- The project uses `.env.example` as the canonical environment template; `CONTRIBUTING.md:12` already instructs contributors to copy it to `.env.local`.

The current first-run content also has two inconsistencies to resolve while editing:

1. It says Bun 1.2+ at `README.md:9`, while `package.json` pins Bun 1.3.5.
2. It asks users to manually create `.env.local` at `README.md:21-26`, while the repository already provides `.env.example` and contributor setup uses `cp .env.example .env.local`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Drift check | `git diff --stat 51f3d08..HEAD -- README.md package.json CONTRIBUTING.md` | No unexpected changes to the in-scope setup files |
| Inspect final length | `wc -l README.md` | README is materially shorter than the current 332 lines; target is approximately 80–120 lines |
| Check links/commands textually | `grep -nE 'bun install|bun run (start|ios|web)|.env.example|CONTRIBUTING.md' README.md` | All required onboarding references are present |
| Markdown diff | `git --no-pager diff --check -- README.md plans/` | No whitespace errors |
| Documentation validation | No repository-specific README test exists | No test command required for this documentation-only change |

## Scope

**In scope (the only source file to modify):**

- `README.md` — replace the long reference manual with a concise onboarding page.
- `plans/README.md` — update the status row after implementation, as required by this plan.

**Out of scope:**

- `CONTRIBUTING.md` — it already contains contributor and developer reference material; do not duplicate or rewrite it in this task.
- `package.json` and scripts — do not rename commands or add a new setup command.
- Application code, Supabase migrations, CI workflows, `.env.example`, and generated native files.
- Deleting any repository documentation other than content currently embedded in `README.md`.

## Target README shape

Use a newcomer-first structure, in this order:

1. **Title and one-sentence description.** Keep the existing project identity.
2. **Quick start.** Include prerequisites in one short bullet list: Bun, Node.js, and one run target (Expo Go, iOS simulator, or web browser). Avoid requiring Android Studio unless the user specifically chooses Android.
3. **Install and configure.** Show exactly:
   ```bash
   bun install
   cp .env.example .env.local
   ```
   Explain in one sentence that the user should fill in the two `EXPO_PUBLIC_SUPABASE_*` values, and that missing values fall back to mock data during development.
4. **Run the app.** Show the common commands with short comments:
   ```bash
   bun run start
   bun run ios
   bun run web
   ```
   Keep `bun run android` as an optional line, not part of the primary path.
5. **Useful commands.** A compact table with only the high-frequency commands: `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run build:web`, `bun run quality:pr`, and `bun run db:debug`.
6. **Where to look next.** Link to `CONTRIBUTING.md` for development standards, PR workflow, native builds, tests, and troubleshooting. Mention `CONTEXT.md` for domain terminology.
7. **Troubleshooting.** Keep only two concise items if they are useful: database/workouts not loading → check `.env.local` and run `bun run db:debug`; Metro hanging → restart with `bun run start`. Do not include shell commands that kill processes unless a contributor specifically needs them.

Remove from `README.md` the detailed architecture diagram, database schema, validation inventory, CI/CD explanation, CNG reference, platform policy, testing philosophy, Figma MCP instructions, branching policy, and long troubleshooting/security sections. They are either already covered by `CONTRIBUTING.md` or are implementation reference material that does not belong on the first-run page.

Use direct language and avoid numbered section headings such as `## 1)`, `## 2)`. The README should be scannable in under one minute. Preserve the existing import alias only if it is genuinely useful to someone immediately editing the app; otherwise leave it to `CONTRIBUTING.md`.

## Steps

### Step 1: Replace the README with a newcomer-first guide

Edit only `README.md` according to the target shape above. Preserve the actual command names from `package.json`, use `.env.example` as the setup source, and link to `CONTRIBUTING.md` rather than duplicating its detailed workflow material.

**Verify**: `grep -nE 'bun install|cp \.env\.example \.env\.local|bun run (start|ios|web)|CONTRIBUTING\.md' README.md` → each required onboarding item appears.

### Step 2: Check the documentation diff and update plan status

Review the diff for accidental deletion of the concise setup path, broken Markdown fences, stale commands, or unrelated file changes. Then change the plan 001 status in `plans/README.md` from `TODO` to `DONE` only after verification succeeds.

**Verify**: `git --no-pager diff --check -- README.md plans/` → exit 0; `git status --short` → only the intended README and plan files are changed (plus any pre-existing untracked files, which must not be edited).

## Test plan

This is a documentation-only change. No application tests are required. Validate with:

- `git --no-pager diff --check -- README.md plans/` — no whitespace errors.
- `wc -l README.md` — approximately 80–120 lines, substantially below the current 332 lines.
- `grep -nE 'bun install|cp \.env\.example \.env\.local|bun run (start|ios|web)|CONTRIBUTING\.md' README.md` — setup path is complete.
- Manual Markdown scan of the rendered structure — headings, fenced commands, and links are readable.

## Done criteria

- [ ] README opens with a concise, copy-pasteable setup path.
- [ ] Setup uses `cp .env.example .env.local` and does not require manually reconstructing env-file keys.
- [ ] Primary run commands are `bun run start`, `bun run ios`, and `bun run web`; Android is optional.
- [ ] Detailed contributor/reference content is removed from README and linked through `CONTRIBUTING.md` where appropriate.
- [ ] README is approximately 80–120 lines and can be scanned in under one minute.
- [ ] `git --no-pager diff --check -- README.md plans/` exits 0.
- [ ] No files outside the in-scope list are modified by this plan.
- [ ] `plans/README.md` status row is updated to `DONE`.

## STOP conditions

Stop and report back instead of improvising if:

- `README.md`, `package.json`, or `CONTRIBUTING.md` no longer matches the current-state evidence enough to identify the correct setup commands.
- `.env.example` is missing or no longer contains the Supabase variables referenced by the README.
- A requested simplification would require changing application scripts or deleting the only copy of contributor instructions.
- The final README still needs more than approximately 120 lines to explain setup; propose a separate docs page rather than restoring the reference manual.
- Any unrelated file appears modified by the documentation edit.

## Maintenance notes

Keep the README focused on first-run onboarding. Add new detailed commands, architecture notes, release policy, or testing rationale to `CONTRIBUTING.md` or a dedicated docs page instead of expanding the README. When package scripts or environment variables change, update the README's copy-pasteable setup path at the same time.
