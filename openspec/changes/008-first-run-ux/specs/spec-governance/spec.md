# spec-governance (delta)

## ADDED Requirements

### Requirement: REQ-GOV-006 README order
`README.md` SHALL open with the title and one sentence that says what the tool does, with the measured context ratio from `docs/metrics/`. A quickstart of three commands SHALL follow, with the install form that works today first. Then one real `task start` excerpt of at most 12 lines. The demo and the rest follow. Maintainer content (`Develop`, `Layout`, `IDs`, the gate steps) SHALL live in `docs/CONTRIBUTING.md`. The config reference SHALL list `SPECCTX_OPENSPEC`.

Refs: REQ-GOV-003

#### Scenario: SCN-GOV-006-1 First screen
- **WHEN** a reader opens `README.md`
- **THEN** the first 25 lines contain the value sentence, the quickstart, and the excerpt, and no SVG

#### Scenario: SCN-GOV-006-2 Maintainer content moved
- **WHEN** `grep -c "^## Develop" README.md` runs
- **THEN** it prints 0 and `docs/CONTRIBUTING.md` has that section
