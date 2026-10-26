#!/usr/bin/env bash
# REQ-DIST-004 decide whether the release workflow publishes.
# Prints the version. Writes publish=true or publish=false to $GITHUB_OUTPUT, or to stdout when unset.
# Overrides for tests: SPECCTX_RELEASE_VERSION, SPECCTX_RELEASE_PACKAGE.
set -euo pipefail
cd "$(dirname "$0")/.."
version="${SPECCTX_RELEASE_VERSION:-$(node -p 'require("./package.json").version')}"
pkg="${SPECCTX_RELEASE_PACKAGE:-$(node -p 'require("./package.json").name')}"
echo "version=$version"
out=$(mktemp)
trap 'rm -f "$out"' EXIT
if npm view "$pkg@$version" version >"$out" 2>&1 && [ -s "$out" ]; then
  publish=false
  echo "$pkg@$version is on npm. Nothing to publish."
elif grep -q 'E404' "$out"; then
  publish=true
else
  cat "$out" >&2
  echo "release-check: cannot reach npm" >&2
  exit 1
fi
echo "publish=$publish" >> "${GITHUB_OUTPUT:-/dev/stdout}"
