#!/bin/bash
set -e

current_branch=$(git branch --show-current)

if [ "$current_branch" = "main" ]; then
  echo "⚠️  WARNING: You are on the 'main' branch."
  echo "   Do NOT commit directly to main."
  echo "   Create a feature branch first: git checkout -b feat/your-feature"
fi

exit 0
