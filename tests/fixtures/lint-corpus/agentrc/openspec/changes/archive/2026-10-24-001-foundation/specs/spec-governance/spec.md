# Spec Delta

## Purpose

Defines the rules every spec, decision, and task in this repository must follow. IDs stay stable. Links resolve. Prose stays readable by people and agents.

## ADDED Requirements

### Requirement: REQ-GOV-001 ID on every artifact
Every `### Requirement:` header SHALL start with a REQ ID. Every `#### Scenario:` header SHALL start with the SCN ID of its requirement plus a sequence number. Every ADR file SHALL start with its ADR ID. IDs SHALL follow ADR-005.

Refs: ADR-005, REQ-CTX-007

#### Scenario: SCN-GOV-001-1 Header without ID
- **WHEN** a spec has `### Requirement: Profile location`
- **THEN** `ctx check` reports `missing-id` with the file and line

### Requirement: REQ-GOV-002 IDs never reused
A retired ID SHALL be listed in `decisions/retired-ids.md` with the date and reason. `ctx check` SHALL fail when a retired ID appears in an active spec.

#### Scenario: SCN-GOV-002-1 Reuse attempt
- **WHEN** REQ-PROF-004 is listed as retired and a new spec defines REQ-PROF-004
- **THEN** `ctx check` reports `reused-id`

### Requirement: REQ-GOV-003 Writing style
All markdown under `openspec/`, `decisions/`, and the repository root SHALL pass `scripts/tells-lint.py` and `scripts/ste-lint.py` from the ste-humanize skill with `--baseline 0`, except lines inside code fences and tables.

Refs: ADR-006

#### Scenario: SCN-GOV-003-1 Dash in prose
- **WHEN** a proposal contains an em dash in a sentence
- **THEN** CI fails on `tells-lint.py` with the line number

### Requirement: REQ-GOV-004 Task cites requirement
Every checkbox line in `tasks.md` SHALL contain at least one `[REQ-...]` citation and a verification clause starting with `Verify:`.

#### Scenario: SCN-GOV-004-1 Task without REQ
- **WHEN** a task line reads `- [ ] 1.1 Add zod`
- **THEN** `ctx check` reports `task-without-req`

### Requirement: REQ-GOV-005 Pre-commit gate
A pre-commit hook SHALL run `ctx check` and `openspec validate --all` on staged markdown. A failing check SHALL block the commit.

#### Scenario: SCN-GOV-005-1 Blocked commit
- **WHEN** a commit adds a dangling `Refs:` target
- **THEN** the commit is rejected with the `ctx check` output
