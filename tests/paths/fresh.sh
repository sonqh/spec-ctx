#!/usr/bin/env bash
# Covers: REQ-ADOPT-006
# SCN-ADOPT-006-2 the fresh path: openspec init, then specctx init --all, ends with gate --strict exit 0.
set -euo pipefail
here=$(cd "$(dirname "$0")/../.." && pwd)
[ -f "$here/dist/cli.js" ] || (cd "$here" && bun run build >/dev/null)
specctx="node $here/dist/cli.js"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cd "$work"
npx -y @fission-ai/openspec@1.14.3 init --tools none --no-animation . >/dev/null 2>&1
$specctx init --all >/dev/null
$specctx status >/dev/null 2>&1
$specctx gate --strict
echo "fresh path: gate --strict exit 0"
