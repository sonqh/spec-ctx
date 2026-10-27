# Proposal

## Why

On 2026-10-27 the existing path ran on a fork of Fission-AI/OpenSpec with `spec-ctx@0.1.1`. The README path is `init --all`, `adopt --dry-run`, `adopt`, `task backfill`, `baseline write`, `gate --strict`. REQ-ADOPT-006 says it ends with exit 0. On that repository it ended with exit 1 and 1617 `missing-id` findings. 1547 of them sit in the 85 archived changes, which `adopt` never writes by REQ-ADOPT-001. 70 sit in one active change whose MODIFIED headers match no main requirement. `baseline write` records no `missing-id`, so the gate stays red with no exit for a stranger. The no-ID fixture has an empty archive and no unmatched delta, so no test saw it. The same run showed two smaller gaps. `task start` on a task that cites no REQ prints only the footer `-- bundle 0 chars`, with no hint. `query --kind REQ` returns nothing because the kind is lower case in the index. `docs/dogfood/openspec.md` holds the run.

## What Changes

- `check` skips `missing-id` on archived entries, as it already does for `req-without-scn`. An archived change is history. Its headers keep their text.
- `baseline write` also records the `missing-id` findings of active changes, keyed by file and header text. The gate then passes on day one. A header that loses its ID after the baseline still fires.
- `task start` prints one hint line before the footer when the task cites no REQ. The line names `specctx query <term> --change <change> --kind req` and the bracket citation to add.
- `query --kind` accepts the kind in any case.
- REQ-CHK-001 gets SCN-CHK-001-6. REQ-ADOPT-005 gets SCN-ADOPT-005-4 and SCN-ADOPT-005-5. REQ-TASK-002 gets SCN-TASK-002-4. REQ-QRY-001 gets SCN-QRY-001-4.

Out of scope: IDs inside archived changes, a change-wide bundle, the CAP derivation rules, and the exit code of `adopt --dry-run`.

## Capabilities

### Modified Capabilities
- `check`: REQ-CHK-001.
- `adopt-existing`: REQ-ADOPT-005.
- `task-workflow`: REQ-TASK-002.
- `query`: REQ-QRY-001.

## Impact

- `src/index/scan.ts`, `src/baseline/baseline.ts`, `src/cli/workflow.ts`, `src/graph/query.ts`, `src/cli/commands.ts`, `src/check/hints.ts`.
- `tests/check/base.test.ts`, `tests/baseline/baseline.test.ts`, `tests/tasks/*.test.ts`, `tests/query/*.test.ts`, `tests/paths/existing.sh`.
- `CHANGELOG.md`, the help text of `query`.
