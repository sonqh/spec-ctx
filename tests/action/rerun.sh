#!/usr/bin/env bash
# Covers: REQ-DIST-005, REQ-DIST-010, REQ-DIST-011, REQ-VER-013, SCN-DIST-011-1, SCN-DIST-011-2, SCN-DIST-011-3, SCN-VER-013-1
# Runs action/run.sh in a temp git repo. A recording script stands in for specctx. No network.
set -euo pipefail
here=$(cd "$(dirname "$0")/../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
unset SPECCTX_RERUN GITHUB_EVENT_NAME INPUT_RERUN INPUT_BASE INPUT_STRICT INPUT_MARKDOWN INPUT_VERSION
git -C "$work" init -q
git -C "$work" -c user.name=t -c user.email=t@t commit -q --allow-empty -m init
cat > "$work/fake" <<'FAKE'
#!/usr/bin/env bash
echo "$*" >> "$FAKE_LOG"
FAKE
chmod +x "$work/fake"
export FAKE_LOG="$work/calls.log"
export INPUT_SPECCTX="$work/fake"
export INPUT_MARKDOWN="docs/*.md"
run() { : > "$FAKE_LOG"; (cd "$work" && bash "$here/action/run.sh" 2>"$work/err"); }

# SCN-DIST-010-1 the rerun command line
GITHUB_EVENT_NAME=pull_request INPUT_RERUN=true INPUT_BASE=origin/main run
[ "$(cat "$FAKE_LOG")" = "gate --strict --rerun --base origin/main" ] || { cat "$FAKE_LOG"; exit 1; }
GITHUB_EVENT_NAME=push INPUT_RERUN=true INPUT_BASE="" run
[ "$(cat "$FAKE_LOG")" = "gate --strict --rerun" ] || { cat "$FAKE_LOG"; exit 1; }
echo "ok: rerun builds gate --strict --rerun --base <ref>"

# SCN-DIST-010-2 the default command line
INPUT_RERUN=false INPUT_BASE=origin/main run
[ "$(cat "$FAKE_LOG")" = "gate --strict --markdown docs/*.md" ] || { cat "$FAKE_LOG"; exit 1; }
echo "ok: the default gate has no --rerun and no --base"

# SCN-DIST-011-1 the event guard
set +e
GITHUB_EVENT_NAME=pull_request_target INPUT_RERUN=true run
code=$?
set -e
[ "$code" = 1 ] || { echo "guard exit was $code"; exit 1; }
[ ! -s "$FAKE_LOG" ] || { echo "the guard still called specctx"; exit 1; }
[ "$(wc -l < "$work/err")" = 1 ] || { cat "$work/err"; exit 1; }
echo "ok: pull_request_target is refused with one line"

# SCN-DIST-011-2 the other events
for ev in pull_request push; do
  GITHUB_EVENT_NAME=$ev INPUT_RERUN=true run
  grep -q -- "--rerun" "$FAKE_LOG" || { echo "no rerun on $ev"; exit 1; }
done
GITHUB_EVENT_NAME=pull_request_target INPUT_RERUN=false run
grep -q "^gate --strict --markdown" "$FAKE_LOG" || { cat "$FAKE_LOG"; exit 1; }
echo "ok: pull_request, push, and a default gate on pull_request_target run"

# SCN-DIST-011-3 every other event, and an empty one, is refused with one line
for ev in workflow_run schedule workflow_dispatch ""; do
  set +e
  GITHUB_EVENT_NAME=$ev INPUT_RERUN=true run
  code=$?
  set -e
  [ "$code" = 1 ] || { echo "guard exit was $code on '$ev'"; exit 1; }
  [ ! -s "$FAKE_LOG" ] || { echo "the guard still called specctx on '$ev'"; exit 1; }
  [ "$(wc -l < "$work/err")" = 1 ] || { cat "$work/err"; exit 1; }
done
echo "ok: other events are refused with one line"

# SCN-VER-013-1 a push that creates a branch has forty zeros as its base. The real CLI prints one line and passes.
mkdir -p "$work/openspec"
zero=$(printf '0%.0s' $(seq 1 40))
set +e
out=$(cd "$work" && GITHUB_EVENT_NAME=push INPUT_RERUN=true INPUT_BASE="$zero" INPUT_SPECCTX="node $here/dist/cli.js" bash "$here/action/run.sh" 2>&1)
code=$?
set -e
[ "$code" = 0 ] || { echo "zero base exit was $code"; echo "$out"; exit 1; }
[ "$out" = "rerun: base is the zero commit (a new branch), nothing to compare" ] || { echo "$out"; exit 1; }
echo "ok: a zero base passes with one line"
