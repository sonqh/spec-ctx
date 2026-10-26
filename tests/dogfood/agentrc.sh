#!/usr/bin/env bash
# Covers: REQ-DIST-006 (SCN-DIST-006-1)
# agentrc runs on the published package: a shallow clone passes check --strict with it.
# Needs the network. Skips with exit 0 when the clone fails.
set -euo pipefail
cd "$(dirname "$0")/../.."
version=$(node -p 'require("./package.json").version')
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
if ! git clone -q --depth 1 https://github.com/sonqh/agentrc "$tmp/agentrc" 2>/dev/null; then
  echo "dogfood: cannot clone agentrc. Skipped."
  exit 0
fi
cd "$tmp/agentrc"
test -f spec-ctx.toml || { echo "FAIL: agentrc has no spec-ctx.toml" >&2; exit 1; }
test ! -d tools/ctx || { echo "FAIL: agentrc still has tools/ctx" >&2; exit 1; }
if npm view "spec-ctx@$version" version >/dev/null 2>&1; then
  npx -y "spec-ctx@$version" check --strict
else
  node "$OLDPWD/dist/cli.js" check --strict
fi
echo "dogfood: agentrc passes check --strict"
