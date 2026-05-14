#!/usr/bin/env bash
# Serve the pre-built Expo Web bundle for Playwright visual tests.
# Builds dist/ on demand if it doesn't exist (or if package.json is newer).
set -euo pipefail

DIST_DIR="dist"
PORT="${PORT:-8081}"

needs_build=false
if [ ! -d "$DIST_DIR" ] || [ ! -f "$DIST_DIR/index.html" ]; then
  needs_build=true
elif [ "package.json" -nt "$DIST_DIR/index.html" ] || [ "app.json" -nt "$DIST_DIR/index.html" ]; then
  needs_build=true
fi

if [ "$needs_build" = true ]; then
  echo "[serve-web-static] Building Expo Web bundle into $DIST_DIR/…"
  bunx expo export --platform web --output-dir "$DIST_DIR"
fi

# `expo export` produces per-route HTML files (workouts.html, settings.html, etc.)
# so we don't need SPA fallback. `serve` will resolve /workouts to workouts.html.
exec bunx --bun serve@14 "$DIST_DIR" -l "$PORT" --no-clipboard
