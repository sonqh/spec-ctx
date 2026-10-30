#!/usr/bin/env bash
# REQ-VER-008 replay `specctx gate --rerun` over the first-parent history of a repository and count flaky tasks.
# Usage: scripts/replay-rerun.sh <repo> --since <date> [--runs N] [--setup <command>] [--out <dir>]
# Exit codes: 0 no flaky task, 1 a task is flaky, 2 a usage error.
set -uo pipefail

here=$(cd "$(dirname "$0")/.." && pwd)
usage() {
  echo "usage: replay-rerun.sh <repo> --since <date> [--runs N] [--setup <command>] [--out <dir>]" >&2
  exit 2
}

repo="" since="" runs=3 setup="" out=""
while [ $# -gt 0 ]; do
  case "$1" in
    --since) [ $# -ge 2 ] || usage; since=$2; shift 2 ;;
    --runs) [ $# -ge 2 ] || usage; runs=$2; shift 2 ;;
    --setup) [ $# -ge 2 ] || usage; setup=$2; shift 2 ;;
    --out) [ $# -ge 2 ] || usage; out=$2; shift 2 ;;
    -h | --help) usage ;;
    -*) usage ;;
    *) [ -z "$repo" ] || usage; repo=$1; shift ;;
  esac
done
[ -n "$repo" ] && [ -n "$since" ] || usage
[[ "$runs" =~ ^[1-9][0-9]*$ ]] || usage
git -C "$repo" rev-parse --git-dir > /dev/null 2>&1 || usage
repo=$(cd "$repo" && pwd)
cli="$here/dist/cli.js"
if [ ! -f "$cli" ]; then
  echo "replay-rerun.sh: $cli is missing. Run bun run build." >&2
  exit 2
fi
if [ -z "$out" ]; then out=$(mktemp -d "${TMPDIR:-/tmp}/replay-out-XXXXXX"); else mkdir -p "$out"; fi
out=$(cd "$out" && pwd)
: > "$out/replay.jsonl"

tmp=$(mktemp -d "${TMPDIR:-/tmp}/replay-wt-XXXXXX")
wt="$tmp/wt"
cleanup() {
  git -C "$repo" worktree remove --force "$wt" > /dev/null 2>&1
  rm -rf "$tmp"
  git -C "$repo" worktree prune > /dev/null 2>&1
}
trap cleanup EXIT
trap 'exit 130' INT TERM

# The aggregator turns the run files of one commit into one JSON line.
agg() {
  node -e '
const fs = require("fs");
const [, commit, date, runs, err, ...files] = process.argv;
const line = { commit, date, runs: Number(runs), tasks: [] };
let error = err || "";
const docs = [];
if (!error) {
  for (const f of files) {
    let d;
    try { d = JSON.parse(fs.readFileSync(f, "utf8")); } catch { error = "no JSON from gate --rerun: " + fs.readFileSync(f + ".err", "utf8").trim().split("\n").pop(); break; }
    if (d.error) { error = d.error; break; }
    docs.push(d);
  }
}
if (error) line.error = error;
else {
  const ids = [];
  for (const d of docs) for (const t of d.tasks) if (!ids.includes(t.id)) ids.push(t.id);
  for (const id of ids) {
    const results = docs.map((d) => { const t = d.tasks.find((x) => x.id === id); return t ? t.status : "missing"; });
    line.tasks.push({ id, results, flaky: new Set(results).size > 1 });
  }
}
process.stdout.write(JSON.stringify(line) + "\n");
' "$@"
}

# oldest first, first-parent only, on the current branch
while IFS='|' read -r c parents date; do
  [ -n "$c" ] || continue
  [ -n "$parents" ] || continue # a root commit has no base
  short=${c:0:12}
  rd="$tmp/runs"
  rm -rf "$rd"
  mkdir -p "$rd"
  err=""
  if ! git -C "$repo" worktree add --detach -q "$wt" "$c" > /dev/null 2> "$rd/wt.err"; then
    err="worktree failed: $(tail -n 1 "$rd/wt.err")"
  elif [ -n "$setup" ] && ! (cd "$wt" && env -u SPECCTX_RERUN bash -c "$setup") > "$rd/setup.out" 2>&1; then
    err="setup failed: $(tail -n 1 "$rd/setup.out")"
  fi
  files=()
  if [ -z "$err" ]; then
    for ((i = 1; i <= runs; i++)); do
      (cd "$wt" && env -u SPECCTX_RERUN node "$cli" gate --rerun --base "$c^1" --json > "$rd/run$i" 2> "$rd/run$i.err")
      files+=("$rd/run$i")
    done
  fi
  agg "$short" "$date" "$runs" "$err" "${files[@]}" >> "$out/replay.jsonl"
  git -C "$repo" worktree remove --force "$wt" > /dev/null 2>&1
  git -C "$repo" worktree prune > /dev/null 2>&1
done < <(git -C "$repo" log --first-parent --reverse --since="$since" --format='%H|%P|%cI')

# summary.md and the exit code
node -e '
const fs = require("fs");
const [, jsonl, summary, repo, since, runs] = process.argv;
const lines = fs.readFileSync(jsonl, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const c = { commits: lines.length, tasks: 0, ok: 0, mismatch: 0, "no-evidence": 0, "verify-drift": 0, flaky: 0, other: 0, errors: 0 };
for (const l of lines) {
  if (l.error) { c.errors++; continue; }
  for (const t of l.tasks) {
    c.tasks++;
    if (t.flaky) c.flaky++;
    else if (t.results[0] === "ok") c.ok++;
    else if (t.results[0] in c) c[t.results[0]]++;
    else c.other++;
  }
}
const md = ["# Replay of gate --rerun", "", `- Repository: ${repo}`, `- Since: ${since}`, `- Runs per commit: ${runs}`, "", "| count | value |", "| --- | --- |"];
for (const [k, v] of Object.entries(c)) md.push(`| ${k} | ${v} |`);
md.push("", "- `other` counts weak-verify, manual, and any other result that all runs share.", "- `errors` counts commits where the command did not run. A failed setup is an error, not a flaky result.", "");
const flaky = lines.flatMap((l) => (l.tasks || []).filter((t) => t.flaky).map((t) => `- ${l.commit} ${t.id}: ${t.results.join(", ")}`));
if (flaky.length) md.push("## Flaky tasks", "", ...flaky, "");
fs.writeFileSync(summary, md.join("\n"));
process.exit(c.flaky > 0 ? 1 : 0);
' "$out/replay.jsonl" "$out/summary.md" "$repo" "$since" "$runs"
rc=$?
echo "replay-rerun: output in $out"
exit $rc
