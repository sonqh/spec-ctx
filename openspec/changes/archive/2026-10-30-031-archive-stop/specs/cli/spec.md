## MODIFIED Requirements

### Requirement: REQ-CLI-007 Next steps and project detection
Every command except `init`, `--help`, and `--version` SHALL exit 2 with `not an OpenSpec project (no openspec/ under <root>)` and write nothing when `openspec/` is missing. `status` SHALL end with `next: <command>` from `specctx next`. `task next`, `init`, and `adopt --dry-run` SHALL end with a `next:` line from a fixed table. `init` with every file present and equal SHALL print `nothing to do` and exit 0. `adopt` with no header to change SHALL write no `adopt-report.md`.

Refs: REQ-LOOP-001

#### Scenario: SCN-CLI-007-1 Not a project
- **WHEN** `specctx status` runs in an empty folder
- **THEN** it exits 2, prints the message, and no `.ctx/` folder exists after

#### Scenario: SCN-CLI-007-2 Status next step
- **WHEN** `status` runs and a task is open and no task is current
- **THEN** the last line is `next: specctx task start <t>`, with the same command as `next --json`

#### Scenario: SCN-CLI-007-3 Init twice
- **WHEN** `init --all` runs twice in a row
- **THEN** the second run prints `nothing to do` and exits 0

#### Scenario: SCN-CLI-007-4 Adopt with nothing to do
- **WHEN** `adopt` runs on a project where every header has an ID
- **THEN** it prints `nothing to adopt`, exits 0, and no `adopt-report.md` exists

#### Scenario: SCN-CLI-007-5 Status with no active change
- **WHEN** `status` runs and no folder exists under `openspec/changes/` except `archive`
- **THEN** the last line is `next: <openspec> new change <name>`, with the same command as `next --json`

#### Scenario: SCN-CLI-007-6 Status with every task done
- **WHEN** `status` runs and every task of the active change has `[x]` and evidence
- **THEN** the last line is `next: specctx gate --strict` before a passing gate, and `next: <openspec> archive <c> -y` after one under `[loop] archive = "auto"`. Under `"ask"` it is the archive question of REQ-LOOP-007. Each equals the command of `next --json`

#### Scenario: SCN-CLI-007-7 Status with no command
- **WHEN** `status` runs and the OpenSpec status command exits 1
- **THEN** the last line is `next: none` and `status` exits 0

