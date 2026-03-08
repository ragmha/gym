#!/usr/bin/env bash
#
# cleanup-merged-worktrees.sh
#
# Removes git worktrees whose branches have been merged into main.
# Detects three cases:
#   1. Branch is an ancestor of main (normal merge / fast-forward).
#   2. Remote tracking branch was deleted (GitHub auto-delete after merge).
#   3. Branch's PR was squash-merged on GitHub (detected via `gh` CLI).
#
# Usage:
#   ./scripts/cleanup-merged-worktrees.sh          # interactive (confirms each removal)
#   ./scripts/cleanup-merged-worktrees.sh --force   # non-interactive (removes without prompting)
#
# Designed to run from the main checkout (the primary workspace directory).
# Also invoked automatically by the post-merge husky hook after `git pull`.

set -euo pipefail

FORCE=false
if [[ "${1:-}" == "--force" ]]; then
  FORCE=true
fi

# Resolve the main repo root (the git common dir for all worktrees)
MAIN_REPO="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$MAIN_REPO" ]]; then
  echo "Not inside a git repository."
  exit 1
fi

CURRENT_BRANCH="$(git branch --show-current)"

# Hard guard: this script must be run from the main worktree on branch 'main'
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "ERROR: cleanup-merged-worktrees.sh must be run from the main worktree on branch 'main'."
  exit 1
fi

MAIN_WORKTREE_PATH=""
wt_path=""
wt_branch=""
while IFS= read -r line; do
  if [[ "$line" == worktree\ * ]]; then
    wt_path="${line#worktree }"
  elif [[ "$line" == branch\ * ]]; then
    wt_branch="${line#branch refs/heads/}"
  elif [[ -z "$line" ]]; then
    if [[ "${wt_branch:-}" == "main" ]]; then
      MAIN_WORKTREE_PATH="$wt_path"
      break
    fi
    wt_path=""
    wt_branch=""
  fi
done < <(git worktree list --porcelain; echo "")

if [[ -z "$MAIN_WORKTREE_PATH" ]]; then
  echo "ERROR: Could not determine the main worktree path for branch 'main'."
  exit 1
fi

if [[ "$MAIN_REPO" != "$MAIN_WORKTREE_PATH" ]]; then
  echo "ERROR: cleanup-merged-worktrees.sh must be run from the main worktree at:"
  echo "  $MAIN_WORKTREE_PATH"
  echo "Current working tree is:"
  echo "  $MAIN_REPO"
  exit 1
fi
# Prune remote tracking refs so deleted remote branches are detected
git fetch --prune --quiet 2>/dev/null || true

# Detect gh CLI and resolve repo slug for squash-merge detection (Check 3)
HAS_GH=false
GH_REPO=""
if command -v gh &>/dev/null; then
  GH_REPO="$(gh repo view --json nameWithOwner --jq '.nameWithOwner' 2>/dev/null || true)"
  if [[ -n "$GH_REPO" ]]; then
    HAS_GH=true
  fi
fi

# Collect worktrees to clean up
declare -a TO_REMOVE_PATHS=()
declare -a TO_REMOVE_BRANCHES=()

while IFS= read -r line; do
  # git worktree list --porcelain outputs blocks like:
  #   worktree /path/to/worktree
  #   HEAD abc123
  #   branch refs/heads/feat/xyz
  #   <blank line>
  if [[ "$line" == worktree\ * ]]; then
    wt_path="${line#worktree }"
  elif [[ "$line" == branch\ * ]]; then
    wt_branch="${line#branch refs/heads/}"
  elif [[ -z "$line" ]]; then
    # End of a worktree block — evaluate it
    # Skip the main worktree
    if [[ "${wt_branch:-main}" == "main" || "${wt_path:-}" == "$MAIN_REPO" ]]; then
      wt_path=""
      wt_branch=""
      continue
    fi

    should_remove=false

    # Check 1: Is the branch merged into main?
    if git branch --merged main --format='%(refname:short)' 2>/dev/null | grep -Fxq "$wt_branch"; then
      should_remove=true
    fi

    # Check 2: Does the remote tracking branch still exist?
    # (GitHub deletes branches after squash-merge by default)
    if [[ "$should_remove" == false ]]; then
      # Only consider this check if the branch actually has an upstream configured.
      # Resolve "$wt_branch@{upstream}" to its full ref name; ignore errors if no upstream.
      upstream_ref="$(git rev-parse --abbrev-ref "${wt_branch}@{upstream}" 2>/dev/null || true)"
      if [[ -n "$upstream_ref" ]] && ! git rev-parse --verify "$upstream_ref" &>/dev/null; then
        should_remove=true
      fi
    fi

    # Check 3: Was the branch's PR squash-merged on GitHub?
    # Squash-merges rewrite history so `git branch --merged` won't detect them,
    # and the remote branch may still exist if auto-delete is disabled.
    # Uses `gh` CLI if available to query closed+merged PRs for the branch.
    if [[ "$should_remove" == false && "$HAS_GH" == true ]]; then
      pr_state="$(gh pr list --repo "$GH_REPO" --head "$wt_branch" --state merged --json number --jq 'length' 2>/dev/null || echo "0")"
      if [[ "$pr_state" -gt 0 ]]; then
        should_remove=true
      fi
    fi

    if [[ "$should_remove" == true && -n "${wt_path:-}" && -n "${wt_branch:-}" ]]; then
      TO_REMOVE_PATHS+=("$wt_path")
      TO_REMOVE_BRANCHES+=("$wt_branch")
    fi

    wt_path=""
    wt_branch=""
  fi
done < <(git worktree list --porcelain; echo "")

# Nothing to clean
if [[ ${#TO_REMOVE_PATHS[@]} -eq 0 ]]; then
  # Only print if running interactively (not from a hook with no removals)
  if [[ "$FORCE" == false ]]; then
    echo "No merged worktrees to clean up."
  fi
  exit 0
fi

echo ""
echo "Merged worktrees detected:"
for i in "${!TO_REMOVE_PATHS[@]}"; do
  echo "  ${TO_REMOVE_BRANCHES[$i]}  →  ${TO_REMOVE_PATHS[$i]}"
done
echo ""

if [[ "$FORCE" == false ]]; then
  read -rp "Remove all listed worktrees and branches? [y/N] " answer
  if [[ ! "$answer" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

for i in "${!TO_REMOVE_PATHS[@]}"; do
  wt_path="${TO_REMOVE_PATHS[$i]}"
  wt_branch="${TO_REMOVE_BRANCHES[$i]}"

  echo "Removing worktree: $wt_path ($wt_branch)"

  # Remove the worktree directory via git; if this fails, do not fall back to rm -rf.
  git worktree remove "$wt_path" --force 2>/dev/null || {
    echo "  ⚠ Could not remove worktree at $wt_path."
    echo "    Please inspect and remove this worktree directory manually if appropriate,"
    echo "    and run 'git worktree prune' once you have cleaned it up."
    continue
  }

  # Delete the local branch
  git branch -D "$wt_branch" 2>/dev/null && echo "  Deleted branch $wt_branch" || echo "  ⚠ Branch $wt_branch already gone"

  # Delete the remote branch if it still exists
  if git rev-parse --verify "refs/remotes/origin/$wt_branch" &>/dev/null; then
    git push origin --delete "$wt_branch" 2>/dev/null && echo "  Deleted remote branch origin/$wt_branch" || echo "  ⚠ Could not delete remote branch origin/$wt_branch"
  fi
done

echo ""
echo "Done. Cleaned up ${#TO_REMOVE_PATHS[@]} worktree(s)."
