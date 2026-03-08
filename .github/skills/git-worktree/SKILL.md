---
name: git-worktree
description: 'Use git worktree to isolate feature work in a separate directory, keeping the main checkout clean and avoiding branch-switching accidents that corrupt open PRs.'
---

# Git Worktree Workflow

## Why Worktrees?

`git checkout` / `git switch` mutates files in place. If a Copilot session switches branches mid-flight — or forgets to stash — it can:

- Bleed uncommitted changes into the wrong branch.
- Break a running dev server that watches the working tree.
- Silently pollute an open PR with unrelated diffs.

**`git worktree`** solves this by giving each branch its own directory. The main checkout stays on `main` and is never touched.

## Quick Reference

| Action | Command |
|---|---|
| List worktrees | `git worktree list` |
| Add a worktree | `git worktree add ../gym-<branch> -b <type>/<name>` |
| Remove a worktree | `git worktree remove ../gym-<branch>` |
| Prune stale entries | `git worktree prune` |

## Workflow

### 1. Keep the Main Checkout on `main`

The primary workspace directory (`/gym`) should **always** sit on `main`. Never switch it to a feature branch.

```bash
# Verify — run this before any work
cd /Users/raghibhasan/Documents/open-source/gym
git branch --show-current   # must print "main"
```

### 2. Create a Worktree for Each Task

When starting a new task, create a **sibling** worktree directory instead of switching branches:

```bash
# From the main checkout
cd /Users/raghibhasan/Documents/open-source/gym

# Fetch latest
git fetch origin

# Create worktree + branch in one step
git worktree add ../gym-feat-add-workout-timer -b feat/add-workout-timer origin/main
```

This creates:
- A new directory `../gym-feat-add-workout-timer` checked out to `feat/add-workout-timer`.
- The branch is based on `origin/main`.
- The main checkout stays on `main`, untouched.

### 3. Do All Work Inside the Worktree

```bash
cd ../gym-feat-add-workout-timer

# Install deps (worktree has its own node_modules)
bun install

# Make changes, commit, push
# ... edit files ...
git add .
git commit -m "feat(timer): add workout timer component"
git push -u origin feat/add-workout-timer
```

### 4. Open a PR from the Worktree Branch

Push the branch from inside the worktree directory, then open a PR against `main` on GitHub.

### 5. Clean Up After Merge

Once the PR is merged:

```bash
# Return to the main checkout
cd /Users/raghibhasan/Documents/open-source/gym

# Remove the worktree
git worktree remove ../gym-feat-add-workout-timer

# Delete the local branch
git branch -d feat/add-workout-timer

# Pull the merged changes
git pull origin main
```

### 6. Prune Stale Worktrees

If a worktree directory was deleted manually (e.g., `rm -rf`), clean up the git metadata:

```bash
git worktree prune
```

## Naming Convention

Worktree directories live as **siblings** of the main repo and follow this pattern:

```
gym-<type>-<short-description>
```

Examples:
- `gym-feat-add-workout-timer`
- `gym-fix-routing-bug`
- `gym-chore-update-deps`

This keeps the parent directory tidy and makes it obvious which worktree maps to which branch.

## Rules for Copilot / AI Agents

1. **Never switch the main checkout off `main`.** If `git branch --show-current` does not print `main` in the primary workspace, stop and fix it before proceeding.
2. **Always use `git worktree add`** to start work on a new branch. Do not use `git checkout -b` or `git switch -c` in the main workspace.
3. **Run `bun install`** inside the new worktree before making changes — it has its own `node_modules`.
4. **Commit and push only from inside the worktree directory.**
5. **Clean up** after a PR is merged: `git worktree remove`, then `git branch -d`.
6. If you're resuming work on an existing branch, check if a worktree already exists with `git worktree list` before creating a new one.

## Combining with Trunk-Based Development

This skill **replaces** the branch-creation step in the trunk-based-development instructions. Instead of:

```bash
git checkout main && git checkout -b feat/xyz   # ← mutates the working tree
```

Use:

```bash
git worktree add ../gym-feat-xyz -b feat/xyz origin/main   # ← separate directory
```

Everything else (conventional commits, rebase before push, lint/typecheck/test before PR) stays the same.
