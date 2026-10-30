## MODIFIED Requirements

### Requirement: REQ-SKL-003 Plan and archive steps
`specctx-run` SHALL take the change name of `plan` from the request in kebab case and read requirements with `specctx bundle` or `specctx query`, never `openspec show`. The plan stop SHALL run the command that `next` prints. `archive` SHALL run the steps of `operations.archive.guidance`, then the `command` field, then the post-archive checks. The skill SHALL name `npx -y @fission-ai/openspec@latest` for an absent `[gate] openspec`.

Refs: REQ-SKL-001, REQ-LOOP-005, REQ-LOOP-009

#### Scenario: SCN-SKL-003-1 Plan steps
- **WHEN** the test reads `skills/specctx-run/SKILL.md`
- **THEN** it names `kebab case`, `specctx bundle`, `specctx query`, `openspec show`, and `specctx next --json` in the `plan` bullet, and it does not name `plan ready for`

#### Scenario: SCN-SKL-003-2 Archive steps
- **WHEN** the test reads `skills/specctx-run/SKILL.md`
- **THEN** it names `operations.archive.guidance`, the `command` field, and `npx -y @fission-ai/openspec@latest`, and it does not name `openspec-archive-change`

## ADDED Requirements

### Requirement: REQ-SKL-006 Block, sync, and warnings
`specctx-run` SHALL name `specctx bundle <REQ> --block` under the rule that forbids `openspec show`. It SHALL say that a MODIFIED block keeps every scenario title unchanged. It SHALL name `bun run build && node dist/cli.js init --skills --force` for the skill copies. It SHALL warn that `gate` counts the Refs line, and that the CHANGELOG entry goes under `## Unreleased`. The drift test message SHALL name the same command.

Refs: REQ-SKL-002, REQ-SKL-003, REQ-QRY-004

#### Scenario: SCN-SKL-006-1 Block rule
- **WHEN** the test reads `skills/specctx-run/SKILL.md`
- **THEN** the rule with `openspec show` names `--block` and says that a MODIFIED block keeps every scenario title

#### Scenario: SCN-SKL-006-2 Sync line
- **WHEN** the test reads the skill and `tests/init/drift.test.ts`
- **THEN** both name `bun run build && node dist/cli.js init --skills --force`

#### Scenario: SCN-SKL-006-3 Warnings
- **WHEN** the test reads `skills/specctx-run/SKILL.md`
- **THEN** it names `Refs line`, `500`, and `## Unreleased`
