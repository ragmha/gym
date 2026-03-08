---
applyTo: '*'
description: 'Trunk-based development workflow: always branch from latest main, never commit directly to main, keep branches short-lived.'
---

# Trunk-Based Development Workflow

## Pre-Flight Checks (Before Any Code Change)

Before making **any** file modifications, run these checks in order:

### 1. Never Work on Main

```bash
current_branch=$(git branch --show-current)
if [ "$current_branch" = "main" ]; then
  echo "ERROR: You are on main. Create a feature branch first."
  exit 1
fi
```

- **Never commit directly to `main`.** All changes go through short-lived feature branches.
- If you are on `main`, create a branch before touching any files.

### 2. Ensure You Are Up to Date

```bash
git fetch origin
git rebase origin/main
```

- Always fetch and rebase onto the latest `origin/main` before starting work.
- Resolve any conflicts immediately — do not defer them.

### 3. Create a Descriptive Branch

Branch names follow this convention:

```
<type>/<short-description>
```

| Type        | Use For                                    |
| ----------- | ------------------------------------------ |
| `feat/`     | New features                               |
| `fix/`      | Bug fixes                                  |
| `chore/`    | Maintenance, deps, config                  |
| `refactor/` | Code restructuring without behavior change |
| `docs/`     | Documentation only                         |
| `test/`     | Adding or updating tests                   |
| `ci/`       | CI/CD workflow changes                     |

Example:

```bash
git checkout main
git pull origin main
git checkout -b feat/add-workout-timer
```

### 4. Prefer Git Worktrees (Recommended)

To avoid accidentally mutating the main checkout, **prefer `git worktree`** over branch switching. This keeps `main` pristine and prevents stale changes from bleeding into open PRs.

```bash
# From the main checkout (which stays on main)
git worktree add ../gym-feat-add-workout-timer -b feat/add-workout-timer origin/main
cd ../gym-feat-add-workout-timer
bun install
```

See the `git-worktree` skill (`.github/skills/git-worktree/SKILL.md`) for the full workflow, naming conventions, and cleanup steps.

## During Development

- **Keep branches short-lived.** Target < 1 day of work per branch. Merge early and often.
- **Commit frequently** with small, atomic commits. Each commit should compile and pass tests.
- **Rebase onto main** if your branch lives longer than expected (`git fetch origin && git rebase origin/main`).
- **Do not merge main into your branch.** Always rebase to keep a linear history.

## Before Pushing / Opening a PR

1. Rebase onto latest main:
   ```bash
   git fetch origin
   git rebase origin/main
   ```
2. Run the full check suite:
   ```bash
   bun run lint
   bun run typecheck
   bunx jest --no-watchman
   ```
3. Push and open a PR against `main`.

## Commit Messages (Conventional Commits)

All commits **must** follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. Use the `conventional-commit` skill (`.github/skills/conventional-commit/SKILL.md`) for the full workflow.

### Format

```
type(scope): description
```

### Allowed types

`feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `build` | `ci` | `chore` | `revert`

### Rules

- **type** — required, one of the allowed types above.
- **scope** — optional but recommended (e.g., `feat(auth):`, `fix(ui):`).
- **description** — required, imperative mood ("add", not "added").
- Append `!` after type/scope for breaking changes: `feat!: remove legacy endpoint`.

### Commit workflow

1. `git status` — review changed files.
2. `git diff --cached` — inspect staged changes.
3. `git add <files>` — stage only related changes.
4. `git commit -m "type(scope): description"` — commit with a conventional message.

## Copilot Agent Workflow

When Copilot (or any automated agent) is asked to make changes:

1. **Check current branch.** If on `main`, stop — do not switch branches in the main checkout.
2. **Fetch latest** to ensure you're up to date: `git fetch origin`.
3. **Create a worktree** using `git worktree add ../gym-<type>-<name> -b <type>/<name> origin/main`. See the `git-worktree` skill for details.
4. **`cd` into the worktree** and run `bun install` before making changes.
5. Make the changes.
6. **Use the conventional-commit skill** to construct and execute the commit:
   - Run `git status` and `git diff --cached` to review changes.
   - Stage files with `git add`.
   - Commit with `git commit -m "type(scope): description"` following Conventional Commits.
7. Never create commits with generic messages like "update files" or "fix stuff".

**Never skip the branch check.** This is a hard rule, not a suggestion.
