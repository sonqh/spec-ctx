#!/usr/bin/env bash
# REQ-GOV-004 the CI workflow, run on this machine before a push. Every run line of ci.yml is a line here.
set -uo pipefail
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
  'node dist/cli.js --help | python3 scripts/ste-lint.py --baseline 0'
  'bash tests/parity/run.sh'
  'bash tests/schema/validate.sh && bash tests/schema/roundtrip.sh'
  'bash tests/action/selftest.sh'
  'bash tests/paths/fresh.sh && bash tests/paths/existing.sh'
  'bash tests/install/ci.sh'
  'bun run build:bin && ./build/specctx --version'
)
for s in "${steps[@]}"; do
  echo "ci-local: $s"
  if ! bash -c "$s" > "$log" 2>&1; then
    tail -40 "$log"
    echo "ci-local: fail: $s"
    exit 1
  fi
done
echo "ci-local: ok, ${#steps[@]} steps"
