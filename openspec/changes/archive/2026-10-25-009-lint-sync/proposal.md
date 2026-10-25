# Proposal

## Why

Three loose ends after 008 and after ste-humanize-skill change 002.

- ste-humanize-skill commit `60bc25a` changed two rules in `tells-lint.py`. `not-x-its-y` now matches across a dash or a colon. `stock-word` matches inflections. The TypeScript port in `src/lint/` still has the old patterns, and `tests/fixtures/lint-golden/` holds the old output. REQ-LINT-001 promises the same bytes.
- `check` prints `0 findings` since 008. Three scenarios in the main specs and the 003 delta still say `0 finding(s)`.
- The README value sentence names the context ratio only. The product review and the metrics say the stronger claim is the evidence gate. A checkbox turns on only when its Verify command passes. 19 of 42 reopens caught stale evidence. The sentence also cites the 2026-10-24 ratio, and 2026-10-25 exists.

## What Changes

- Port the two rule fixes into `src/lint/`. Re-record the lint goldens against `scripts/` of ste-humanize-skill at `60bc25a`. Pin that commit in `tests/lint/parity.sh`.
- Replace `0 finding(s)` with `0 findings` in SCN-GOV-001-1, SCN-CHK-003-1, and the 003 delta. REQ-CHK-001 belongs to 003, so its text changes inside 003.
- The README value sentence names both the evidence gate and the context ratio, and reads the ratio from the newest `docs/metrics/*.md`. A `Why` list of three lines follows the excerpt.

Out of scope: new lint rules, the `scripts/lint.py` wrapper of ste-humanize-skill, color.

## Capabilities

### Modified Capabilities
- `linters`: the oracle commit and the two rule fixes.
- `spec-governance`: the scenario wording and the README value sentence.

## Impact

- `src/lint/tells.ts` (or the rule table file), `tests/fixtures/lint-golden/`, `tests/lint/parity.sh`, `openspec/specs/spec-governance/spec.md`, `openspec/changes/003-distribution/specs/check/spec.md`, `openspec/changes/003-distribution/specs/schema-bundle/spec.md`, `README.md`, `tests/gov/readme.test.ts`.
- The 003 delta edit is a wording fix inside a pending change. No ID changes.
