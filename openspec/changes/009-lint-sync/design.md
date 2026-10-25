# Design

## Context

All three items are small. The lint sync is the one with a procedure, because the oracle lives in another repository.

## Goals / Non-Goals

**Goals:**
- `tests/lint/parity.sh` passes against the oracle at `60bc25a`.
- No `0 finding(s)` remains in specs or deltas.
- The README first sentence sells the evidence gate first and the context ratio second, with a current number.

**Non-Goals:**
- Any rule change beyond the two the oracle made.

## Decisions

- D1 Oracle pin. `tests/lint/parity.sh` gets `ORACLE_SHA=60bc25ad7b5bd35f7fa14d5586d5b0e79a08e722` and a check: when `SPECCTX_LINT_ORACLE` is set and is a git checkout, its `HEAD` must equal `ORACLE_SHA`, else exit 2 with the two SHAs. The recorded goldens then say which oracle made them. Modifies REQ-LINT-001.
- D2 Port the two fixes by reading the oracle's two regexes and copying them. `not-x-its-y` accepts `,`, `.`, `:`, `;`, em dash, en dash, or ` - ` before `it's` or `it is`. `stock-word` gets the inflection suffixes `s`, `es`, `d`, `ed`, `ing` for verbs and the plural for nouns, as the oracle does. The selftest cases of the oracle join the TypeScript selftest.
- D3 Wording. SCN-GOV-001-1 changes through a MODIFIED block in this change. The other three places sit inside the 003 deltas: the REQ-CHK-001 text, SCN-CHK-003-1, and SCN-SCH-002-1. A task of this change edits those three in place. A requirement cannot be MODIFIED by two active changes, so a 009 delta is not an option there.
- D4 README sentence. `spec-ctx lets a coding agent tick an OpenSpec task only after its Verify command passes, and hands it the spec text of that one task, a context ratio of <ratio> (docs/metrics/<date>.md).` The ratio and date come from the newest file under `docs/metrics/`. `tests/gov/readme.test.ts` checks that the cited file is the newest one. A `## Why` section of three lines follows the excerpt: checkboxes that lie, context that overflows, evidence that goes stale. Each line cites a metric from the same file. Modifies REQ-GOV-006.

## Risks / Trade-offs

- The oracle pin makes `parity.sh --record` fail when ste-humanize-skill moves on. That is the point. A new record is a conscious bump of `ORACLE_SHA`.
- The README test couples the README to the metrics file name. `stats --write` writes one per day, so the newest file is deterministic.

## Open Questions

None.
