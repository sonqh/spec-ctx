## MODIFIED Requirements

### Requirement: REQ-GOV-001 ID on every artifact
Every requirement, scenario, task, and design decision in this repo SHALL carry an ID per ADR-002. Every code file that implements a requirement SHALL carry its tag. Every test that covers one SHALL carry `Covers:`.

Refs: ADR-002

#### Scenario: SCN-GOV-001-1 Check passes
- **WHEN** `specctx check --strict` runs on this repository before archive
- **THEN** it prints `0 findings`

#### Scenario: SCN-GOV-001-2 Check passes with an open change
- **WHEN** `specctx check --strict` runs on a copy of this repository with an active change that holds an open task
- **THEN** it exits 0, prints `0 findings`, and the only other lines are `manual-evidence` warnings and `deferred:` notices, one of them for that change
