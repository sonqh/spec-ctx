#!/usr/bin/env bash
# Covers: REQ-SCH-003
# SCN-SCH-003-7 the templates and the fragment work on a fresh upstream project with the stock spec-driven schema.
# No schema folder is installed. ADR-006 item 8.
set -euo pipefail
here=$(cd "$(dirname "$0")/../.." && pwd)
openspec="npx -y @fission-ai/openspec@1.14.3"
[ -f "$here/dist/cli.js" ] || (cd "$here" && bun run build >/dev/null)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cd "$work"
$openspec init --tools none --no-animation . >/dev/null 2>&1

# the bundle has no schema.yaml. Only the templates, the fragment, and the README ship.
[ ! -f "$here/schemas/spec-driven-ids/schema.yaml" ] || { echo "schemas/spec-driven-ids/schema.yaml must not exist"; exit 1; }
node "$here/dist/cli.js" init --schema --root "$work" >/dev/null
[ ! -d openspec/schemas ] || { echo "init --schema installed a schema folder"; exit 1; }
grep -q '^schema: spec-driven$' openspec/config.yaml || { echo "the schema line changed"; head -1 openspec/config.yaml; exit 1; }
tpl=openspec/templates/spec-driven-ids
for f in proposal.md design.md spec.md tasks.md; do [ -f "$tpl/$f" ] || { echo "missing $tpl/$f"; exit 1; }; done
echo "ok: templates in $tpl, schema stays spec-driven"

# the templates carry the ID placeholders and the config carries the ID and task done rules
grep -q '### Requirement: REQ-<CAP>-NNN' $tpl/spec.md
grep -q '#### Scenario: SCN-<CAP>-NNN-1' $tpl/spec.md
grep -q 'Refs:' $tpl/design.md
grep -q 'Verify: `' $tpl/tasks.md
grep -q 'specctx id new REQ' openspec/config.yaml
grep -q 'Close each task only with `specctx task done <id>`' openspec/config.yaml
! grep -q 'mark complete' openspec/config.yaml || { echo "mark complete is still in the config"; exit 1; }
echo "ok: placeholders and rules"

# the project still validates on upstream with the merged config
$openspec validate --all >/dev/null 2>&1 || { $openspec validate --all; exit 1; }
echo "ok: openspec validate --all with the merged rules"

# SCN-SCH-001-2 a spec that keeps the placeholder is a missing-id finding. The rule stays in check after REQ-SCH-001 went.
mkdir -p openspec/changes/001-demo/specs/demo
cp $tpl/spec.md openspec/changes/001-demo/specs/demo/spec.md
set +e
out=$(node "$here/dist/cli.js" check --root "$work" 2>/dev/null)
code=$?
set -e
[ "$code" = 1 ] || { echo "check exit $code, want 1"; exit 1; }
echo "$out" | grep -q 'missing-id  REQ-<CAP>-NNN' || { echo "no missing-id finding"; echo "$out"; exit 1; }
echo "ok: placeholder caught as missing-id"

# REQ-SCH-003 the config fragment holds rules and operations
grep -q '^rules:' "$here/schemas/spec-driven-ids/config-fragment.yaml"
grep -q '^operations:' "$here/schemas/spec-driven-ids/config-fragment.yaml"
echo "schema: valid"
