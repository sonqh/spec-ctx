# session-bootstrap

## MODIFIED Requirements

### Requirement: REQ-BOOT-002 Bootstrap steps
The skill SHALL run, in order: `ctx status`, read `openspec/config.yaml` context, read the active change's `proposal.md` and `tasks.md`, then `ctx bundle` for the IDs cited by the chosen task with `--budget 6000`. `ctx build` is not a separate step because every command rebuilds a stale index. When `status` prints `no active change`, the skill SHALL read `open_questions` from `.ctx/handoff.md` and stop with a list of them for the user. It SHALL not read `openspec/specs/` directly.

Refs: REQ-CTX-008, REQ-CTX-010

#### Scenario: SCN-BOOT-002-1 Task with two REQs
- **WHEN** the chosen task cites `[REQ-CLD-002, REQ-APPLY-003]`
- **THEN** the session reads `ctx bundle REQ-CLD-002 REQ-APPLY-003 --budget 6000` and nothing else from specs

#### Scenario: SCN-BOOT-002-2 Nothing active
- **WHEN** `ctx status` prints `no active change`
- **THEN** the skill lists the open questions and asks the user which change to start
