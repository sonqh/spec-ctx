#!/usr/bin/env bash
# REQ-GOV-005 prints code=true when src/, tests/, package.json, or bun.lock changed since the base commit.
set -euo pipefail
base=${1:-}
if [ -z "$base" ] || [ "$base" = "0000000000000000000000000000000000000000" ] || ! git cat-file -e "$base" 2>/dev/null; then
  echo "code=true"
  exit 0
fi
if git diff --name-only "$base" HEAD | grep -qE '^(src/|tests/|package\.json$|bun\.lock$)'; then
  echo "code=true"
else
  echo "code=false"
fi
