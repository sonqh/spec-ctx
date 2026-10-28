#!/usr/bin/env bash
# Covers: REQ-SCH-002
# SCN-SCH-002-1 a change written from the templates on the stock spec-driven schema archives and its IDs survive into openspec/specs/.
set -euo pipefail
here=$(cd "$(dirname "$0")/../.." && pwd)
openspec="npx -y @fission-ai/openspec@1.14.3"
specctx="node $here/dist/cli.js"
[ -f "$here/dist/cli.js" ] || (cd "$here" && bun run build >/dev/null)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cp -R "$here/tests/fixtures/schema-project/." "$work/"
cd "$work"
grep -q '^schema: spec-driven$' openspec/config.yaml || { echo "the fixture must use the stock schema"; exit 1; }

reqs=$(grep -ohE '^### Requirement: REQ-[A-Z]+-[0-9]{3}' openspec/changes/001-export/specs -r | awk '{print $3}' | sort -u)
[ -n "$reqs" ] || { echo "no REQ IDs in the fixture change"; exit 1; }

# close the tasks the way an agent does, then archive
$specctx task done 001/1.1 >/dev/null 2>&1
$specctx task done 001/1.2 >/dev/null 2>&1
$specctx check --strict >/dev/null 2>&1 || { $specctx check --strict; exit 1; }
$openspec validate --all --strict >/dev/null 2>&1 || { $openspec validate --all --strict; exit 1; }
$openspec archive 001-export --yes >/dev/null 2>&1 || { $openspec archive 001-export --yes; exit 1; }
[ ! -d openspec/changes/001-export ] || { echo "the change was not archived"; exit 1; }

for r in $reqs; do
  n=$(grep -rhcE "^### Requirement: $r " openspec/specs | awk '{s+=$1} END {print s}')
  [ "$n" = 1 ] || { echo "$r appears $n times in openspec/specs"; exit 1; }
done
echo "ok: $(echo "$reqs" | wc -l | tr -d ' ') REQ IDs survive archive once each"

out=$($specctx check --strict 2>/dev/null)
[ "$out" = "0 findings" ] || { echo "$out"; exit 1; }
$openspec validate --all --strict >/dev/null 2>&1
echo "roundtrip: 0 findings after archive"
