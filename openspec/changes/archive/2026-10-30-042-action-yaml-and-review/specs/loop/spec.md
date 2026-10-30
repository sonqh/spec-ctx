## MODIFIED Requirements

### Requirement: REQ-LOOP-011 Rerun line is not the gate
`next` SHALL judge the gate from the last line of `.ctx/gate-log.jsonl` whose `steps` is not exactly `["rerun"]`. The line counts only when `ok` is true and `strict` is true. A line without a `strict` key SHALL not count. A line from `gate --rerun` SHALL never count as a passing gate.

Refs: REQ-LOOP-001, REQ-CLI-009

#### Scenario: SCN-LOOP-011-1 Rerun after a failed gate
- **WHEN** every task has `[x]` and evidence, the last gate line has `ok: false`, and a later `rerun` line has `ok: true`
- **THEN** `next --json` prints `action: gate`

#### Scenario: SCN-LOOP-011-2 Rerun after a passing gate
- **WHEN** a passing gate line follows the newest evidence and a later `rerun` line has `ok: false`
- **THEN** `next --json` does not print `action: gate`

#### Scenario: SCN-LOOP-011-3 Non-strict pass
- **WHEN** every task has `[x]` and evidence, and the last gate line has `ok: true` and `strict: false` or no `strict` key
- **THEN** `next --json` prints `action: gate`
