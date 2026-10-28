# Proposal

## Why

ADR-006 item 7 ends the fork of OpenSpec. The fork covered one case: a delta header that keeps the ID of a main requirement and changes its title, with no RENAMED block. Upstream OpenSpec matches delta headers by text. At archive it refuses a MODIFIED header whose text differs from main. It accepts a RENAMED block whose FROM and TO lines carry the headers. spec-ctx can tell the user what upstream will need before the archive runs. A `check` rule is deterministic, needs no upstream change, and its hint prints the exact block to paste.

## What Changes

- `check` gets a hard rule `retitle-needs-renamed`. It fires on a requirement header inside a MODIFIED or REMOVED block of an active change. The ID must exist in `openspec/specs` with another title. The delta file must have no RENAMED pair whose TO line carries that header.
- The finding prints `file:line  retitle-needs-renamed  <ID>  "<old>" -> "<new>"`. The `--json` output gains a `detail` field for that trailing text. No field is renamed.
- The hint of the rule prints the RENAMED block to paste, with `<ID>`, `<old title>`, and `<new title>` as placeholders. The finding line carries the ID and both titles.
- REQ-CHK-001 lists the rule and gets SCN-CHK-001-7.

Out of scope: a RENAMED block that upstream writes on its own, and any change to `adopt`, which already reads RENAMED lines.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `check`: REQ-CHK-001.

## Impact

- `src/check/check.ts`, `src/check/hints.ts`, `src/cli/commands.ts` (the finding line).
- `tests/check/base.test.ts`.
- `README.md`, `CHANGELOG.md`.
