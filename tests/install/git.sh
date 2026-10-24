#!/usr/bin/env bash
# Covers: REQ-DIST-008
# SCN-DIST-008-1 npx installs spec-ctx from git and builds it with Node only. Bun stays off the PATH.
set -euo pipefail
ref=${1:-main}
# SPECCTX_GIT_SPEC replaces the spec, for example git+file:///path/to/spec-ctx#<sha> before a push
spec=${SPECCTX_GIT_SPEC:-github:sonqh/spec-ctx#$ref}
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
path=""
IFS=: read -ra parts <<< "$PATH"
for d in "${parts[@]}"; do [ -x "$d/bun" ] || path="${path:+$path:}$d"; done
cd "$work"
set +e
out=$(PATH="$path" npm_config_cache="$work/cache" npx -y "$spec" --version 2>"$work/err")
code=$?
set -e
if [ "$code" != 0 ]; then
  echo "npx exited $code"
  tail -20 "$work/err"
  # CI shows annotations without a login, so the cause goes there too
  [ -n "${GITHUB_ACTIONS:-}" ] && echo "::error::git install failed: $(tail -5 "$work/err" | tr '\n' ' ')"
  exit 1
fi
echo "$out" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' || { echo "unexpected output: $out"; exit 1; }
echo "git install: spec-ctx $out from $spec without bun"
