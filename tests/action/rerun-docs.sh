#!/usr/bin/env bash
# Covers: REQ-DIST-012, SCN-DIST-012-1
# Reads the action section of README.md for the security boundary of rerun.
set -euo pipefail
here=$(cd "$(dirname "$0")/../.." && pwd)
sec=$(awk '/^## GitHub Action$/{f=1;next} f&&/^## /{exit} f' "$here/README.md")
for term in pull_request_target workflow_run "contents: read" secrets "approval" "fork pull requests" "fetch-depth: 0"; do
  echo "$sec" | grep -qF -- "$term" || { echo "the action section lacks: $term"; exit 1; }
done
echo "ok: the action section states the rerun boundary"
