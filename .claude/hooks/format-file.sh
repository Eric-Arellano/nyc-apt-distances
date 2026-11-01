#!/usr/bin/env bash
# Formats the file Claude just edited, so formatting never shows up in review.
#
# Always exits 0. A formatter that fails or is not installed is not something Claude should stop
# and fix mid-edit — `npm run lint` is what gates a change.

set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

file=$(jq -r '.tool_input.file_path // empty')
[[ -n $file && -f $file ]] || exit 0

file=${file#"$PWD/"}

# Files outside the repo (edited via an absolute or ../ path) have nothing here to format.
case $file in
  /* | ../*) exit 0 ;;
esac

# The binary directly, not `npx`, which re-resolves the package on every call — and this hook
# fires on every single edit.
case $file in
  *.ts | *.js | *.svelte | *.json | *.css | *.html)
    "$PWD/node_modules/.bin/biome" check --write --no-errors-on-unmatched "$file"
    ;;
esac

exit 0
