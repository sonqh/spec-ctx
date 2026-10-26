# cli (delta)

## ADDED Requirements

### Requirement: REQ-CLI-008 Color on a TTY
Human output SHALL use color only when stdout is a TTY, `NO_COLOR` is unset, and `TERM` is not `dumb`, or when `FORCE_COLOR` is set. Green marks a `done <task>` line. Red marks `Verify failed`, every hard finding of `check`, and `stale-evidence`. Dim marks `next:` lines and the summary line of `check`. Without color the bytes SHALL equal the output of today. `--json` SHALL never carry an escape code.

Refs: REQ-CLI-002

#### Scenario: SCN-CLI-008-1 Pipe stays plain
- **WHEN** `specctx check` runs with stdout in a pipe
- **THEN** the output holds no byte `\x1b`

#### Scenario: SCN-CLI-008-2 Forced color
- **WHEN** `FORCE_COLOR=1 specctx check --strict` runs on a tree with one hard finding
- **THEN** the finding line starts with `\x1b[31m` and the summary line starts with `\x1b[2m`

#### Scenario: SCN-CLI-008-3 NO_COLOR wins
- **WHEN** `NO_COLOR=1 FORCE_COLOR=1 specctx status` runs
- **THEN** the output holds no byte `\x1b`
