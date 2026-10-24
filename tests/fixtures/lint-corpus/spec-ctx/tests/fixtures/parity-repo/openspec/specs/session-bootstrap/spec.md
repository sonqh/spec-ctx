# session-bootstrap Specification

## Purpose
Defines how a fresh agent session (Claude Code, Codex, or an Opus subagent) loads the minimum context for one task. It never reads the whole repository.

## Requirements

### Requirement: REQ-BOOT-001 Bootstrap skill exists
The repository SHALL contain `.claude/skills/bootstrap-context/SKILL.md`. Its description SHALL trigger on "start a session", "bootstrap", and "what should I work on". It SHALL also trigger on any first message that names a change or a task ID.

Refs: REQ-CTX-008

#### Scenario: SCN-BOOT-001-1 Fresh session
- **WHEN** a new Claude Code session starts in the repo and the user names a task
- **THEN** the skill runs before any spec file is read

### Requirement: REQ-BOOT-002 Bootstrap steps
The skill SHALL run, in order: `ctx status`, read `openspec/config.yaml` context, read the active change's `proposal.md` and `tasks.md`, then `ctx bundle` for the IDs the chosen task cites with `--budget 6000`. No separate `ctx build` step: every command rebuilds a stale index. On `no active change` the skill SHALL list `open_questions` from `.ctx/handoff.md` and stop. It SHALL not read `openspec/specs/` directly.

Refs: REQ-CTX-008, REQ-CTX-010

#### Scenario: SCN-BOOT-002-1 Task with two REQs
- **WHEN** the chosen task cites `[REQ-CLD-002, REQ-APPLY-003]`
- **THEN** the session reads `ctx bundle REQ-CLD-002 REQ-APPLY-003 --budget 6000` and nothing else from specs

#### Scenario: SCN-BOOT-002-2 Nothing active
- **WHEN** `ctx status` prints `no active change`
- **THEN** the skill lists the open questions and asks the user which change to start

### Requirement: REQ-BOOT-003 Context budget
The bootstrap SHALL load at most 10,000 characters of spec text before implementation starts. When the bundle is truncated, the skill SHALL list the omitted IDs so the agent can request them one at a time.

#### Scenario: SCN-BOOT-003-1 Truncated bundle
- **WHEN** the bundle prints `truncated: 3 entries omitted`
- **THEN** the skill prints the three IDs and continues

### Requirement: REQ-BOOT-004 Session handoff
At the end of a session the agent SHALL write `.ctx/handoff.md`. The file SHALL hold the change name, the task IDs completed, the task IDs in progress, and open questions. The bootstrap skill SHALL read this file first when it exists and delete it after reading.

#### Scenario: SCN-BOOT-004-1 Resume
- **WHEN** `.ctx/handoff.md` says task `002/3.2` is in progress
- **THEN** the next session starts on `002/3.2` and bundles its REQs

### Requirement: REQ-BOOT-005 Same skill for Codex
The same skill content SHALL be available at `.agents/skills/bootstrap-context/SKILL.md` for Codex, kept identical by a symlink or by CI diff.

#### Scenario: SCN-BOOT-005-1 Drift check
- **WHEN** the two SKILL.md files differ
- **THEN** CI fails with a diff
