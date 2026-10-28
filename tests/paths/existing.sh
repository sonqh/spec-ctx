#!/usr/bin/env bash
# Covers: REQ-ADOPT-006, REQ-ADOPT-009
# SCN-ADOPT-006-1 SCN-ADOPT-009-2 the existing path on the no-ID fixture, on upstream OpenSpec: init --all, adopt --dry-run, adopt,
# baseline write. It ends with gate --strict exit 0.
set -euo pipefail
here=$(cd "$(dirname "$0")/../.." && pwd)
[ -f "$here/dist/cli.js" ] || (cd "$here" && bun run build >/dev/null)
specctx="node $here/dist/cli.js"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cp -R "$here/tests/fixtures/no-id-repo/." "$work/"
cd "$work"
# a tree like a real project: one archived change without IDs and one delta header that matches no main requirement
mkdir -p openspec/changes/archive/2026-01-01-old/specs/user-auth
printf '## ADDED Requirements\n\n### Requirement: Old header\nText.\n\n#### Scenario: Old case\n- a\n' > openspec/changes/archive/2026-01-01-old/specs/user-auth/spec.md
printf '\n### Requirement: Lockout policy\nThe system SHALL lock an account after five failures.\n\n#### Scenario: Five failures\n- **WHEN** a user fails five times\n- **THEN** the account locks\n' >> openspec/changes/add-mfa/specs/user-auth/spec.md
# prose that breaks the lint rules. The gate lints nothing by default (022/D1), so the file stays out of the baseline.
mkdir -p docs
printf '# Notes\n\nOne thing \xe2\x80\x94 another; a third.\n' > docs/notes.md
$specctx init --all >/dev/null
# the dry run exits 1 when headers need an ID, and its last line says why (SCN-ADOPT-001-3)
if dry=$($specctx adopt --dry-run); then echo "adopt --dry-run found nothing on the no-ID fixture"; exit 1; fi
printf "%s\n" "$dry" | tail -n 1 | grep -qE "^exit 1: [0-9]+ headers need an ID\. Next: specctx adopt$"
$specctx adopt
$specctx baseline write
$specctx gate --strict
# the ticked legacy tasks stay in the baseline as done-without-evidence (ADR-006 item 11)
grep -q '"done-without-evidence add-mfa/1.1"' .ctx/baseline.json
if grep -q '"lint docs/notes.md' .ctx/baseline.json; then echo "the baseline holds lint lines without a [gate] markdown key"; exit 1; fi
echo "existing path: gate --strict exit 0"
