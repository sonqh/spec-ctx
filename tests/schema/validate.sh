#!/usr/bin/env bash
# Covers: REQ-SCH-001, REQ-SCH-003
# Copies the schema bundle into a fresh OpenSpec project in a temp dir and validates it.
set -euo pipefail
here=$(cd "$(dirname "$0")/../.." && pwd)
openspec="npx -y @fission-ai/openspec@1.14.3"
[ -f "$here/dist/cli.js" ] || (cd "$here" && bun run build >/dev/null)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cd "$work"
$openspec init --tools none --no-animation . >/dev/null 2>&1

# SCN-SCH-001-1 the bundle validates in a fresh project
mkdir -p openspec/schemas
cp -R "$here/schemas/spec-driven-ids" openspec/schemas/
$openspec schema validate spec-driven-ids >/dev/null
echo "ok: openspec schema validate spec-driven-ids"

# the templates carry the ID placeholders and the instructions name specctx id new
grep -q '### Requirement: REQ-<CAP>-NNN' openspec/schemas/spec-driven-ids/templates/spec.md
grep -q '#### Scenario: SCN-<CAP>-NNN-1' openspec/schemas/spec-driven-ids/templates/spec.md
grep -q 'Refs:' openspec/schemas/spec-driven-ids/templates/design.md
grep -q 'Verify: `' openspec/schemas/spec-driven-ids/templates/tasks.md
grep -q 'specctx id new REQ' openspec/schemas/spec-driven-ids/schema.yaml
grep -q 'specctx task done' openspec/schemas/spec-driven-ids/schema.yaml
echo "ok: placeholders and instructions"

# SCN-SCH-001-2 a spec that keeps the placeholder is a missing-id finding
mkdir -p openspec/changes/001-demo/specs/demo
cp openspec/schemas/spec-driven-ids/templates/spec.md openspec/changes/001-demo/specs/demo/spec.md
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
