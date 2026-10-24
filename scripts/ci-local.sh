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
# SPECCTX_CI_STEPS_FILE replaces the step list, one step per line. Only the gate log test uses it.
if [ -n "${SPECCTX_CI_STEPS_FILE:-}" ]; then
  mapfile -t steps < "$SPECCTX_CI_STEPS_FILE"
fi

# REQ-STAT-005 one JSON line per run in .ctx/gate-log.jsonl, on success and on failure
start=$(date +%s)
gate_log() {
  mkdir -p .ctx
  GL_OK=$1 GL_FAILED=$2 GL_STEPS=$3 GL_START=$start node -e '
    const ok = process.env.GL_OK === "true";
    const line = {
      at: new Date().toISOString(),
      duration_s: Math.round(Date.now() / 1000) - Number(process.env.GL_START),
      failed_step: ok ? null : process.env.GL_FAILED,
      ok,
      steps: Number(process.env.GL_STEPS),
    };
    require("node:fs").appendFileSync(".ctx/gate-log.jsonl", JSON.stringify(line) + "\n");
  '
}
n=0
for s in "${steps[@]}"; do
  n=$((n + 1))
  echo "ci-local: $s"
  if ! bash -c "$s" > "$log" 2>&1; then
    tail -40 "$log"
    echo "ci-local: fail: $s"
    gate_log false "$s" "$n"
    exit 1
  fi
done
gate_log true "" "$n"
echo "ci-local: ok, ${#steps[@]} steps"
