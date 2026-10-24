# spec-governance

## Purpose

Rules this repository holds itself to. The same rules ship to users through the schema bundle in change 003.

## ADDED Requirements

### Requirement: REQ-GOV-001 ID on every artifact
Every requirement, scenario, task, and design decision in this repo SHALL carry an ID per ADR-002. Every code file that implements a requirement SHALL carry its tag. Every test that covers one SHALL carry `Covers:`.

Refs: ADR-002

#### Scenario: SCN-GOV-001-1 Check passes
- **WHEN** `specctx check --strict` runs on this repository before archive
- **THEN** it prints `0 finding(s)`

### Requirement: REQ-GOV-002 IDs never reused
A removed ID SHALL be added to `decisions/retired-ids.md` with date and reason. `check` SHALL report `reused-id` when a retired ID appears as a canonical entry.

#### Scenario: SCN-GOV-002-1 Retired ID reappears
- **WHEN** `retired-ids.md` lists `REQ-QRY-009` and a spec defines it
- **THEN** `check` exits 1 with `reused-id REQ-QRY-009`

### Requirement: REQ-GOV-003 Writing style and gates
Every markdown file SHALL pass `scripts/tells-lint.py --baseline 0` and `scripts/ste-lint.py --baseline 0 --disable synonym-rotation`. The pre-commit hook and CI SHALL run both linters, `specctx check --strict`, and `openspec validate --all --strict`.

Refs: ADR-005

#### Scenario: SCN-GOV-003-1 CI gate
- **WHEN** a push adds a markdown file with a semicolon
- **THEN** the `specs` CI job fails
