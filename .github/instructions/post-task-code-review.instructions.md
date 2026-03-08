---
applyTo: '**/*.{ts,tsx,js,jsx,mjs}'
description: 'After every coding task, run a multi-model code review on changed files to catch critical issues and apply fixes before committing.'
---

# Post-Task Code Review (Mandatory)

## Hard Rule

**Every coding task must end with a code review before committing.** This is not optional.

## After Completing Any Task

1. **Identify changed files** — `git diff --name-only origin/main...HEAD`
2. **Run automated checks** — `bun run lint`, `bun run typecheck`, `bunx jest --no-watchman --bail --passWithNoTests`
3. **Review all changed files** through 5 passes:
   - **Security** — No hardcoded secrets, no unsafe evals, input validated
   - **Correctness** — No null derefs, proper error handling, hooks rules followed
   - **Performance** — No unnecessary re-renders, no N+1 queries, proper virtualization
   - **Deprecated APIs** — No deprecated calls (see `no-deprecated-code` skill)
   - **Style** — Project conventions followed, no dead code, focused functions
4. **Fix all CRITICAL and HIGH** issues immediately
5. **Re-run checks** to confirm fixes are clean
6. **Then commit** using the `conventional-commit` skill

## Multi-Model Review

When sub-agents are available, launch parallel reviewers for security, correctness, and performance. Reconcile and deduplicate findings before applying fixes.

## Full Reference

See `.github/skills/post-task-code-review/SKILL.md` for the complete checklist, severity classification, and multi-model strategy.
