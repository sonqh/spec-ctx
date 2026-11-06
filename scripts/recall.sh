#!/usr/bin/env bash
# REQ-STAT-006 run the recall benchmark on this repository and on the frozen fixture (054/D8).
# It builds this repository, clones sonqh/OpenSpec-spec-ctx at the commit of its label file into a temp dir,
# and runs scripts/recall.mjs on both. It never pushes. It removes the temp dir on exit. It needs the network for the clone.
set -euo pipefail
unset SPECCTX_RERUN

usage() {
  echo "usage: recall.sh [--out <dir>] [--date <yyyy-mm-dd>] [--runs <n>]"
}

root=$(cd "$(dirname "$0")/.." && pwd)
args=()
while [ $# -gt 0 ]; do
  case "$1" in
    -h | --help) usage; exit 0 ;;
    --out | --date | --runs)
      [ $# -ge 2 ] || { usage >&2; exit 2; }
      args+=("$1" "$2"); shift 2 ;;
    *) usage >&2; exit 2 ;;
  esac
done

own="$root/bench/recall/spec-ctx.json"
ext="$root/bench/recall/openspec-fixture.json"
for f in "$own" "$ext"; do
  [ -f "$f" ] || { echo "recall.sh: $f is missing" >&2; exit 2; }
done
commit=$(node -e 'const d = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); process.stdout.write(d.commit || "")' "$ext")
[ -n "$commit" ] || { echo "recall.sh: $ext has no commit" >&2; exit 2; }

(cd "$root" && bun run build >/dev/null)

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
git clone --quiet --branch spec-ctx-adopt https://github.com/sonqh/OpenSpec-spec-ctx "$work/fixture"
git -C "$work/fixture" checkout --quiet "$commit"
head=$(git -C "$work/fixture" rev-parse HEAD)
[ "$head" = "$commit" ] || { echo "recall.sh: the fixture is at $head, not $commit" >&2; exit 2; }

node "$root/scripts/recall.mjs" --labels "$own" --root "$root" --labels "$ext" --root "$work/fixture" ${args[@]+"${args[@]}"}
