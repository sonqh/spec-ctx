## ADDED Requirements

### Requirement: REQ-CLI-009 Gate rerun mode
`specctx gate --rerun [--base <ref>] [--json]` SHALL run only the rerun step, and the default gate SHALL not run it. It prints one line per closed task, exits 1 on any failure, and exits 0 otherwise. It appends one line with `rerun` in `steps` to `.ctx/gate-log.jsonl` and writes no evidence. When the env holds `SPECCTX_RERUN`, it prints one line and exits 0.

Refs: REQ-CLI-004, REQ-VER-005

#### Scenario: SCN-CLI-009-1 Default gate skips the rerun
- **WHEN** `specctx gate --strict` runs
- **THEN** the gate log line has no `rerun` in `steps`, and the output has no `rerun:` line

#### Scenario: SCN-CLI-009-2 Rerun only
- **WHEN** `specctx gate --rerun` runs and every closed task passes
- **THEN** it prints one `ok` line per task, exits 0, runs no `check` or `validate` step, and the new gate log line has `steps` equal to `rerun`

#### Scenario: SCN-CLI-009-3 Recursion guard
- **WHEN** the env holds `SPECCTX_RERUN=1` and `specctx gate --rerun` runs
- **THEN** it prints one line that names the guard, runs no Verify command, and exits 0

#### Scenario: SCN-CLI-009-4 JSON object
- **WHEN** `specctx gate --rerun --json` runs
- **THEN** it prints one JSON object with the keys `base`, `merge_base`, `ok`, and `tasks`, and each task has `id`, `status`, and `kind`

#### Scenario: SCN-CLI-009-5 No evidence and a usage error
- **WHEN** `gate --rerun` runs, then `gate --rerun extra` runs
- **THEN** the first run leaves `.ctx/evidence/` unchanged, and the second exits 2
