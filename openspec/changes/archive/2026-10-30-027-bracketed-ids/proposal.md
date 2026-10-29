# Proposal

## Why

Upstream OpenSpec PR Fission-AI/OpenSpec#1979 is open and ready for review. It makes OpenSpec read a stable ID at the start of a requirement or scenario header, inside square brackets: `### Requirement: [AUTH-3] Users sign in`. Our IDs match its pattern once they sit in brackets. Today spec-ctx reads only the bare form. A header `### Requirement: [REQ-UA-001] Session timeout` gives `missing-id` and drops the entry from the index. If #1979 merges and users follow upstream, spec-ctx breaks. This change reads both forms now and lets a project choose the form that spec-ctx writes.

## What Changes

- The scan reads an ID in a requirement or scenario header in the bare form and in the bracketed form. Both forms give the same entry ID and the same title. A delta in one form matches a main entry in the other form.
- A bracket that holds anything other than a spec-ctx ID is not an ID. `[AUTH-3] Users sign in` still gives `missing-id`.
- New key `[ids] brackets` in `spec-ctx.toml`, a boolean with the default false.
- With `brackets = true`, `adopt` writes `[REQ-...]` and `[SCN-...]` into headers, and `adopt --dry-run` prints that form. A header that has an ID in either form stays as it is.
- With `brackets = true`, `id new REQ` and `id new SCN` print the bracketed form. `--for` accepts both forms.
- The `retitle-needs-renamed` rule reads bracketed headers and bracketed RENAMED lines. Its hint says to write each ID in the form of its header.
- ADR-002 gets one line under Consequences about the two forms.

Out of scope: code tags, `Covers:` tags, `Refs:` lines, and task citations keep the bare form. The config fragment and the templates keep the bare form until upstream merges #1979.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `index`: REQ-IDX-006 added.
- `adopt-existing`: REQ-ADOPT-010 added.
- `id-allocation`: REQ-IDS-004 added.

## Impact

- `src/index/scan.ts`, `src/adopt/plan.ts`, `src/ids/ids.ts`, `src/check/check.ts`, `src/check/hints.ts`, `src/config.ts`.
- `tests/index/`, `tests/adopt/`, `tests/ids/`, `tests/check/`, `tests/config.test.ts`.
- `decisions/ADR-002-id-scheme.md`, `README.md`, `CHANGELOG.md`.
