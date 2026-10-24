#!/usr/bin/env bash
# Covers: REQ-LINT-001
# SCN-LINT-001-1 lint parity. The goldens are the output of the Python linters on the corpus.
#   bash tests/lint/parity.sh            compare `specctx lint` with the goldens
#   bash tests/lint/parity.sh --record   write the goldens from scripts/*-lint.py
set -euo pipefail
cd "$(dirname "$0")/../.."
CORPUS=tests/fixtures/lint-corpus
GOLD=tests/fixtures/lint-golden
AGENTRC_SHA=79994d7b23dbc818a135d702790f1026258a7fc2

if [ "${1:-}" != "--record" ]; then
  [ -f dist/cli.js ] || bun run build >/dev/null
  exec node tests/lint/parity.mjs "$CORPUS" "$GOLD"
fi

# Hidden folders such as .claude get a "dot" prefix, so no tool loads the copied skills.
undot() { printf '%s' "$1" | sed -E 's#(^|/)\.#\1dot.#g'; }

# The corpus is built once. A rebuild needs SPECCTX_LINT_CORPUS=rebuild and agentrc at the pinned commit.
if [ ! -d "$CORPUS" ] || [ "${SPECCTX_LINT_CORPUS:-}" = rebuild ]; then
  rm -rf "$CORPUS"
  mkdir -p "$CORPUS/spec-ctx" "$CORPUS/agentrc" "$CORPUS/selftest"
  git ls-files -z '*.md' ':!tests/fixtures/lint-corpus' | while IFS= read -r -d '' f; do
    t="$CORPUS/spec-ctx/$(undot "$f")"
    mkdir -p "$(dirname "$t")"
    git show "HEAD:$f" > "$t"
  done
  AGENTRC=${SPECCTX_AGENTRC:-../agentrc}
  git -C "$AGENTRC" ls-tree -r -z --name-only "$AGENTRC_SHA" | while IFS= read -r -d '' f; do
    case "$f" in *.md) ;; *) continue ;; esac
    t="$CORPUS/agentrc/$(undot "$f")"
    mkdir -p "$(dirname "$t")"
    git -C "$AGENTRC" show "$AGENTRC_SHA:$f" > "$t"
  done
  # the inputs of both selftests, one file per input
  python3 -I - "$CORPUS/selftest" scripts <<'PY'
import importlib.util, io, contextlib, os, sys
out, scripts = sys.argv[1], sys.argv[2]
for name in ("tells", "ste"):
    spec = importlib.util.spec_from_file_location(name, os.path.join(scripts, f"{name}-lint.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    seen, real = [], mod.lint
    def rec(text, *a, **k):
        if text not in seen and len(text) < 65536:
            seen.append(text)
        return real(text, *a, **k)
    mod.lint = rec
    with contextlib.redirect_stdout(io.StringIO()):
        mod.selftest()
    for i, text in enumerate(seen, 1):
        with open(os.path.join(out, f"{name}-{i:03d}.md"), "w", encoding="utf-8", newline="") as fh:
            fh.write(text)
PY
  printf 'spec-ctx: git HEAD %s\nagentrc: %s\nselftest: inputs of tells-lint.py and ste-lint.py --selftest\n' "$(git rev-parse HEAD)" "$AGENTRC_SHA" > "$CORPUS/SOURCE.txt"
fi

rm -rf "$GOLD"
mkdir -p "$GOLD"
# mode name, linter, flags. The first two are the CI flags.
MODES=(
  "tells|tells|--baseline 0"
  "ste|ste|--baseline 0 --disable synonym-rotation"
  "ste-all|ste|--baseline 0"
  "tells-json|tells|--json"
  "ste-json|ste|--json"
)
n=0
while IFS= read -r -d '' f; do
  rel=${f#"$CORPUS"/}
  mkdir -p "$GOLD/$(dirname "$rel")"
  for m in "${MODES[@]}"; do
    IFS='|' read -r mode lint flags <<< "$m"
    # shellcheck disable=SC2086
    set +e; python3 "scripts/$lint-lint.py" $flags "$f" > "$GOLD/$rel.$mode.out" 2>/dev/null; code=$?; set -e
    echo "exit: $code" >> "$GOLD/$rel.$mode.out"
  done
  n=$((n + 1))
done < <(find "$CORPUS" -name '*.md' -type f -print0 | LC_ALL=C sort -z)
for lint in tells ste; do
  set +e; python3 "scripts/$lint-lint.py" --selftest > "$GOLD/selftest.$lint.out" 2>&1; code=$?; set -e
  echo "exit: $code" >> "$GOLD/selftest.$lint.out"
done
echo "lint parity: recorded $n files"
