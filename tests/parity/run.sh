#!/usr/bin/env bash
# Golden harness for REQ-DIST-003. It runs the TypeScript engine on a temp copy of
# tests/fixtures/parity-repo and diffs seven command outputs and the index file against
# tests/fixtures/parity-golden/. The goldens were recorded from the Python engine before its removal.
#   --record   rewrite the goldens from the TypeScript engine
#   SPECCTX_GOLDEN=<dir> compares against another golden folder (the drift test uses it)
set -euo pipefail
here=$(cd "$(dirname "$0")/../.." && pwd)
fixture="$here/tests/fixtures/parity-repo"
golden="${SPECCTX_GOLDEN:-$here/tests/fixtures/parity-golden}"
ts="node $here/dist/cli.js"
# status runs the decision of next, which runs the OpenSpec status command. The stand-in answers it
# with a complete plan, so the harness never reaches the network (030/D5).
export SPECCTX_OPENSPEC="sh $here/tests/fixtures/openspec-stub.sh"
record=0
[ "${1:-}" = "--record" ] && record=1

cmds=("build" "status" "query push main" "related REQ-APPLY-005" "bundle REQ-APPLY-001 --budget 3000" "check" "check --strict")
names=(build status query related bundle check check-strict)

[ -f "$here/dist/cli.js" ] || { echo "dist/cli.js is missing. Run bun run build first." >&2; exit 2; }
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
repo="$work/repo"
out="$work/out"
mkdir -p "$out"
cp -R "$fixture" "$repo"
rm -f "$repo/.ctx/index.json"
# a fixed mtime makes the scanned record, and so the index file, the same on every machine
find "$repo" -exec env TZ=UTC touch -h -t 202601010000 {} +
for i in "${!cmds[@]}"; do
  # shellcheck disable=SC2086
  (cd "$repo" && $ts ${cmds[$i]} >"$out/${names[$i]}.out" 2>"$out/${names[$i]}.err"; echo $? >"$out/${names[$i]}.code") || true
  if [ "${names[$i]}" = build ]; then cp "$repo/.ctx/index.json" "$out/index.json"; fi
done

if [ "$record" = 1 ]; then
  rm -rf "$golden"
  cp -R "$out" "$golden"
  echo "recorded ${#cmds[@]} commands in tests/fixtures/parity-golden"
  exit 0
fi

fail=0
for i in "${!cmds[@]}"; do
  n=${names[$i]}
  for ext in out err code; do
    if ! diff -u "$golden/$n.$ext" "$out/$n.$ext" >"$work/diff"; then
      echo "parity: ${cmds[$i]} differs in $ext ($n)"
      head -40 "$work/diff"
      fail=1
    fi
  done
done
if ! cmp -s "$golden/index.json" "$out/index.json"; then
  echo "parity: index.json differs"
  diff -u "$golden/index.json" "$out/index.json" | head -40 || true
  fail=1
fi
[ "$fail" = 1 ] && exit 1
echo "parity: ${#cmds[@]} commands identical"
