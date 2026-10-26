#!/usr/bin/env bash
# Covers: REQ-GOV-007 (SCN-GOV-007-1, SCN-GOV-007-2, SCN-GOV-007-3)
set -euo pipefail
root=$(cd "$(dirname "$0")/../.." && pwd)
msg='package.json version changed. A version bump publishes to npm. Use a commit subject that starts with "release:".'
fail() { echo "FAIL: $*" >&2; exit 1; }
d=$(mktemp -d); trap 'rm -rf "$d"' EXIT
cd "$d"
git init -q .
git config user.email t@example.com; git config user.name t
mkdir scripts; cp "$root/scripts/version-guard.sh" scripts/
printf '{\n  "version": "0.1.0",\n  "scripts": {\n    "a": "x"\n  }\n}\n' > package.json
git add -A; git commit -qm init
run() { # subject
  local f; f=$(mktemp); printf '%s\n' "$1" > "$f"
  set +e; out=$(bash scripts/version-guard.sh "$f" 2>&1); code=$?; set -e; rm -f "$f"
}
# SCN-GOV-007-1
sed -i 's/"0.1.0"/"0.1.1"/' package.json; git add package.json
run "fix typo"
[ "$code" = 1 ] || fail "SCN-GOV-007-1 exit $code"
[ "$out" = "$msg" ] || fail "SCN-GOV-007-1 message: $out"
# env subject fallback
set +e; out=$(SPECCTX_COMMIT_SUBJECT="fix typo" bash scripts/version-guard.sh 2>&1); code=$?; set -e
[ "$code" = 1 ] || fail "env subject exit $code"
# SCN-GOV-007-2
run "release: 0.1.1"
[ "$code" = 0 ] || fail "SCN-GOV-007-2 exit $code: $out"
git reset -q --hard
# SCN-GOV-007-3
sed -i 's/"a": "x"/"a": "y"/' package.json; git add package.json
run "fix typo"
[ "$code" = 0 ] || fail "SCN-GOV-007-3 exit $code: $out"
echo "version guard: ok"
