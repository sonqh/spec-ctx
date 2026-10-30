#!/usr/bin/env bash
# Covers: REQ-GOV-010
# Reads the rerun job of ci.yml. The job runs on GitHub only, so this test checks its text.
set -euo pipefail
here=$(cd "$(dirname "$0")/../.." && pwd)
ci="$here/.github/workflows/ci.yml"
job=$(awk '/^  rerun:$/{f=1;next} f&&/^  [a-z]+:$/{exit} f' "$ci")
[ -n "$job" ] || { echo "no rerun job in ci.yml"; exit 1; }
need() { echo "$job" | grep -qF -- "$1" || { echo "the rerun job lacks: $1"; exit 1; }; }
# SCN-GOV-010-1 the job shape
need "if: github.event_name == 'pull_request'"
need "contents: read"
need "fetch-depth: 0"
need "node-version: 22"
need "oven-sh/setup-bun@v2"
need "- run: bun install --frozen-lockfile"
need "- run: bun run build"
need "- uses: ./"
need "rerun: true"
need 'base: origin/${{ github.base_ref }}'
need "specctx: node dist/cli.js"
# SCN-GOV-010-2 the trigger list stays push to main and pull_request, and the job keeps the guard
grep -q '^    branches: \[main\]$' "$ci"
! echo "$job" | grep -q "pull_request_target"
! echo "$job" | grep -q "secrets\."
echo "ok: the rerun job is pull_request only, read-only, with full history"
