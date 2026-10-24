#!/usr/bin/env bash
# REQ-DIST-005 the three gates of the spec-ctx GitHub Action. It runs in the project root.
set -euo pipefail
action_path=${SPECCTX_ACTION_PATH:-$(cd "$(dirname "$0")/.." && pwd)}
specctx=${INPUT_SPECCTX:-}
[ -n "$specctx" ] || specctx="npx -y spec-ctx@${INPUT_VERSION:-latest}"
strict=""
[ "${INPUT_STRICT:-true}" = "true" ] && strict="--strict"

echo "spec-ctx: check $strict"
$specctx build >/dev/null
$specctx check $strict

echo "spec-ctx: markdown linters"
shopt -s globstar nullglob
files=()
for g in ${INPUT_MARKDOWN:-openspec/**/*.md decisions/*.md *.md}; do
  for f in $g; do files+=("$f"); done
done
fail=0
for f in "${files[@]}"; do
  python3 "$action_path/scripts/tells-lint.py" --baseline 0 "$f" >/dev/null || { python3 "$action_path/scripts/tells-lint.py" --baseline 0 "$f"; fail=1; }
  python3 "$action_path/scripts/ste-lint.py" --baseline 0 --disable synonym-rotation "$f" >/dev/null || { python3 "$action_path/scripts/ste-lint.py" --baseline 0 --disable synonym-rotation "$f"; fail=1; }
done
[ "$fail" = 0 ] || exit 1
echo "linted ${#files[@]} markdown file(s)"

echo "spec-ctx: openspec validate --all $strict"
npx -y @fission-ai/openspec@latest validate --all $strict --no-interactive
