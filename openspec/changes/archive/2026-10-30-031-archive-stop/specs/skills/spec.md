## ADDED Requirements

### Requirement: REQ-SKL-004 Gate at the plan step and the archive approval
The `plan` step of `specctx-run` SHALL run `specctx gate --strict` before the plan stop. The skill SHALL name `specctx id new --count <n>` for several IDs of one kind. The `archive` step SHALL run `specctx handoff ask --change <c> "archive <c>?"` when `human` is true, and SHALL run the archive steps when `human` is false after an approval. The skill SHALL stay under 60 lines and pass both linters.

Refs: REQ-SKL-001, REQ-SKL-003, REQ-LOOP-007

#### Scenario: SCN-SKL-004-1 Plan step
- **WHEN** the test reads `skills/specctx-run/SKILL.md`
- **THEN** the `plan` bullet names `specctx gate --strict` and `specctx id new --count <n>`

#### Scenario: SCN-SKL-004-2 Archive step
- **WHEN** the test reads `skills/specctx-run/SKILL.md`
- **THEN** the `archive` bullet names `specctx handoff ask --change <c> "archive <c>?"` and the case after the approval, and the `repair` bullet runs the command in the `command` field
