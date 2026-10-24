#!/usr/bin/env bash
# Covers: REQ-ADOPT-006
# SCN-ADOPT-006-1 the existing path on the no-ID fixture: init --all, adopt --dry-run, adopt,
# task backfill, baseline write. It ends with gate --strict exit 0.
set -euo pipefail
here=$(cd "$(dirname "$0")/../.." && pwd)
[ -f "$here/dist/cli.js" ] || (cd "$here" && bun run build >/dev/null)
specctx="node $here/dist/cli.js"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cp -R "$here/tests/fixtures/no-id-repo/." "$work/"
cd "$work"
$specctx init --all >/dev/null
# the dry run exits 1 when headers need an ID
if $specctx adopt --dry-run >/dev/null; then echo "adopt --dry-run found nothing on the no-ID fixture"; exit 1; fi
$specctx adopt
$specctx task backfill --manual "adopted"
$specctx baseline write
$specctx gate --strict
echo "existing path: gate --strict exit 0"
