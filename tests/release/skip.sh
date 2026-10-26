#!/usr/bin/env bash
# Covers: REQ-DIST-004 (SCN-DIST-004-3)
set -euo pipefail
cd "$(dirname "$0")/../.."
fail() { echo "FAIL: $*" >&2; exit 1; }
v=$(npm view smol-toml version)
out=$(SPECCTX_RELEASE_PACKAGE=smol-toml SPECCTX_RELEASE_VERSION="$v" bash scripts/release-check.sh)
echo "$out" | grep -qx "smol-toml@$v is on npm. Nothing to publish." || fail "skip message: $out"
echo "$out" | grep -qx "publish=false" || fail "expected publish=false: $out"
out=$(SPECCTX_RELEASE_PACKAGE=smol-toml SPECCTX_RELEASE_VERSION=999.0.0 bash scripts/release-check.sh)
echo "$out" | grep -qx "publish=true" || fail "expected publish=true: $out"
echo "$out" | grep -q "Nothing to publish" && fail "unexpected skip message"
echo "release skip: ok"
