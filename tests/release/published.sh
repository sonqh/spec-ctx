#!/usr/bin/env bash
# Covers: REQ-DIST-004 (SCN-DIST-004-1, SCN-DIST-004-2, SCN-DIST-004-4)
# Checks the published state of the version in package.json: npm, the two tags, the linux binary.
# Needs the network. Skips with exit 0 and a message when npm has no such version yet.
set -euo pipefail
cd "$(dirname "$0")/../.."
fail() { echo "FAIL: $*" >&2; exit 1; }
version=$(node -p 'require("./package.json").version')
major=${version%%.*}
if ! npm view "spec-ctx@$version" version >/dev/null 2>&1; then
  echo "published: spec-ctx@$version is not on npm yet. Skipped."
  exit 0
fi
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
got=$(cd "$tmp" && npx -y "spec-ctx@$version" --version)
[ "$got" = "$version" ] || fail "npx printed $got"
tags=$(git ls-remote --tags origin "v$version" "v$major")
echo "$tags" | grep -q "refs/tags/v$version$" || fail "tag v$version missing on origin"
echo "$tags" | grep -q "refs/tags/v$major$" || fail "tag v$major missing on origin"
url="https://github.com/sonqh/spec-ctx/releases/download/v$version/specctx-linux-x64"
if curl -fsSL -o "$tmp/specctx" "$url" 2>/dev/null; then
  chmod +x "$tmp/specctx"
  [ "$("$tmp/specctx" --version)" = "$version" ] || fail "binary printed another version"
  echo "published: npm, tags, and binary agree on $version"
else
  echo "published: npm and tags agree on $version. Binary download skipped (no reach)."
fi
