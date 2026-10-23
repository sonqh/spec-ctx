#!/usr/bin/env bash
# Parity harness for REQ-DIST-003. It runs the Python oracle and the TypeScript engine on a temp copy
# of tests/fixtures/parity-repo and diffs seven command outputs and the index file.
#   --record   run the Python engine only and write its outputs to tests/fixtures/parity-golden/
set -euo pipefail
here=$(cd "$(dirname "$0")/../.." && pwd)
fixture="$here/tests/fixtures/parity-repo"
golden="$here/tests/fixtures/parity-golden"
py="python3 $here/tools/ctx/ctx.py"
ts="node $here/dist/cli.js"
record=0
[ "${1:-}" = "--record" ] && record=1

cmds=("build" "status" "query push main" "related REQ-APPLY-005" "bundle REQ-APPLY-001 --budget 3000" "check" "check --strict")
names=(build status query related bundle check check-strict)

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

run_engine() {
  # $1 engine command, $2 output dir. Each engine gets its own copy so that neither reads the other's index.
  local engine=$1 out=$2 repo="$work/repo-$(basename "$2")"
  mkdir -p "$out"
  cp -R "$fixture" "$repo"
  rm -rf "$repo/.ctx"
  # a fixed mtime makes the scanned record, and so the index file, the same on every machine
  find "$repo" -exec env TZ=UTC touch -h -t 202601010000 {} +
  for i in "${!cmds[@]}"; do
    # shellcheck disable=SC2086
    (cd "$repo" && SPECCTX_ROOT="$repo" $engine ${cmds[$i]} >"$out/${names[$i]}.out" 2>"$out/${names[$i]}.err"; echo $? >"$out/${names[$i]}.code") || true
    if [ "${names[$i]}" = build ]; then cp "$repo/.ctx/index.json" "$out/index.json"; fi
  done
}

if [ "$record" = 1 ]; then
  rm -rf "$golden"
  run_engine "$py" "$golden"
  echo "recorded ${#cmds[@]} commands from the Python engine in tests/fixtures/parity-golden"
  exit 0
fi

[ -f "$here/dist/cli.js" ] || { echo "dist/cli.js is missing. Run bun run build first." >&2; exit 2; }
run_engine "$py" "$work/py"
run_engine "$ts" "$work/ts"
fail=0
for i in "${!cmds[@]}"; do
  n=${names[$i]}
  for ext in out err code; do
    if ! diff -u "$work/py/$n.$ext" "$work/ts/$n.$ext" >"$work/diff"; then
      echo "parity: ${cmds[$i]} differs in $ext"
      head -40 "$work/diff"
      fail=1
    fi
  done
done
if ! cmp -s "$work/py/index.json" "$work/ts/index.json"; then
  echo "parity: index.json differs"
  diff -u "$work/py/index.json" "$work/ts/index.json" | head -40 || true
  fail=1
fi
if [ -d "$golden" ]; then
  for f in "$golden"/*; do
    if ! cmp -s "$f" "$work/py/$(basename "$f")"; then
      echo "parity: the Python engine no longer matches the golden $(basename "$f"). Run with --record after review."
      fail=1
    fi
  done
fi
if [ "$fail" = 1 ]; then exit 1; fi
echo "parity: ${#cmds[@]} commands identical"
