#!/usr/bin/env bash
# Covers: REQ-DIST-005, REQ-DIST-008
# Runs the action script on this repository, then on a temp copy with a planted semicolon.
set -euo pipefail
here=$(cd "$(dirname "$0")/../.." && pwd)
[ -f "$here/dist/cli.js" ] || (cd "$here" && bun run build >/dev/null)
grep -q 'using: composite' "$here/action.yml"
for input in version strict rerun base; do grep -q "^  $input:" "$here/action.yml"; done
grep -q 'default: latest' "$here/action.yml"

export INPUT_SPECCTX="node $here/dist/cli.js"
export INPUT_MARKDOWN="openspec/**/*.md decisions/*.md docs/**/*.md skills/**/*.md *.md"
export SPECCTX_ACTION_PATH="$here"

# SCN-DIST-005-1 on a clean tree the three gates pass
(cd "$here" && bash action/run.sh >/dev/null)
echo "ok: the action passes on a clean tree"

# a markdown file with a semicolon fails the lint gate
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cp -R "$here/openspec" "$here/decisions" "$here/spec-ctx.toml" "$work/"
printf '# Bad\n\nThe tool reads the file; it writes the index.\n' > "$work/decisions/bad.md"
# non-strict, so the copy without tests passes check and only the lint gate can fail
set +e
out=$(cd "$work" && INPUT_STRICT=false INPUT_MARKDOWN="decisions/*.md" bash "$here/action/run.sh" 2>&1)
code=$?
set -e
[ "$code" != 0 ] || { echo "the action passed with a semicolon in decisions/bad.md"; exit 1; }
echo "$out" | grep -q "check: ok" || { echo "check did not pass first"; echo "$out"; exit 1; }
echo "$out" | grep -q "semicolon" || { echo "the failure was not the semicolon"; echo "$out"; exit 1; }
# SCN-DIST-008-2 a github: version goes to npx unchanged. A fake npx records the calls.
fake="$work/bin"
mkdir -p "$fake"
cat > "$fake/npx" <<'NPX'
#!/usr/bin/env bash
echo "npx $*" >> "$NPX_LOG"
echo "check: ok"
NPX
chmod +x "$fake/npx"
export NPX_LOG="$work/npx.log"
(cd "$work" && PATH="$fake:$PATH" INPUT_SPECCTX="" INPUT_VERSION="github:sonqh/spec-ctx#main" INPUT_MARKDOWN="openspec/specs/**/*.md" bash "$here/action/run.sh" >/dev/null)
grep -q "^npx -y github:sonqh/spec-ctx#main gate --strict --markdown " "$NPX_LOG" || { cat "$NPX_LOG"; exit 1; }
: > "$NPX_LOG"
(cd "$work" && PATH="$fake:$PATH" INPUT_SPECCTX="" INPUT_VERSION="0.1.0" INPUT_MARKDOWN="openspec/specs/**/*.md" bash "$here/action/run.sh" >/dev/null)
grep -q "^npx -y spec-ctx@0.1.0 gate --strict --markdown " "$NPX_LOG" || { cat "$NPX_LOG"; exit 1; }
echo "ok: the version input takes an npm version or a github: spec"
bash "$here/tests/action/rerun.sh" >/dev/null
bash "$here/tests/action/rerun-job.sh" >/dev/null
bash "$here/tests/action/rerun-docs.sh" >/dev/null
echo "ok: the rerun input, the CI job, and the docs"
echo "selftest: the action passes clean and fails on a lint error"
