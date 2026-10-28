#!/usr/bin/env bash
# REQ-GOV-004 the CI workflow, run on this machine before a push. Every run line of ci.yml is a line here.
set -uo pipefail
# REQ-GOV-007 the commit-msg hook (.githooks/commit-msg) runs scripts/version-guard.sh. It rejects a package.json version change
# unless the commit subject starts with "release:". Hooks are enabled with: git config core.hooksPath .githooks
cd "$(dirname "$0")/.."
log=$(mktemp)
trap 'rm -f "$log"' EXIT
steps=(
  'bun install --frozen-lockfile'
  'bun run typecheck'
  'bun run build'
  'node dist/cli.js gate --strict --markdown "*.md decisions/*.md openspec/**/*.md docs/**/*.md skills/**/*.md schemas/**/*.md"'
  'bun run test'
  'bun run test:node'
  'node dist/cli.js --help | node dist/cli.js lint ste --baseline 0'
  'bash tests/parity/run.sh'
  'bash tests/schema/validate.sh && bash tests/schema/roundtrip.sh'
  'bash tests/action/selftest.sh'
  'bash tests/paths/fresh.sh && bash tests/paths/existing.sh && bash tests/paths/rules-only.sh'
  'bash tests/install/ci.sh'
  'bash tests/gov/version-guard.sh && bash tests/release/skip.sh && bash tests/release/published.sh && bash tests/dogfood/agentrc.sh'
  'bun run build:bin && ./build/specctx --version'
)
# SPECCTX_CI_STEPS_FILE replaces the step list, one step per line. Only the gate log test uses it.
if [ -n "${SPECCTX_CI_STEPS_FILE:-}" ]; then
  mapfile -t steps < "$SPECCTX_CI_STEPS_FILE"
fi

# REQ-STAT-005 specctx gate writes the gate log line. This script appends none, so one run is one line.
for s in "${steps[@]}"; do
  echo "ci-local: $s"
  if ! bash -c "$s" > "$log" 2>&1; then
    tail -40 "$log"
    echo "ci-local: fail: $s"
    exit 1
  fi
done
echo "ci-local: ok, ${#steps[@]} steps"
