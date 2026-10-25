# spec-governance Specification

## Purpose
Rules this repository holds itself to. The same rules ship to users through the schema bundle in change 003.

## Requirements

### Requirement: REQ-GOV-001 ID on every artifact
Every requirement, scenario, task, and design decision in this repo SHALL carry an ID per ADR-002. Every code file that implements a requirement SHALL carry its tag. Every test that covers one SHALL carry `Covers:`.

Refs: ADR-002

#### Scenario: SCN-GOV-001-1 Check passes
- **WHEN** `specctx check --strict` runs on this repository before archive
- **THEN** it prints `0 findings`

### Requirement: REQ-GOV-002 IDs never reused
A removed ID SHALL be added to `decisions/retired-ids.md` with date and reason. `check` SHALL report `reused-id` when a retired ID appears as a canonical entry.

#### Scenario: SCN-GOV-002-1 Retired ID reappears
- **WHEN** `retired-ids.md` lists `REQ-QRY-009` and a spec defines it
- **THEN** `check` exits 1 with `reused-id REQ-QRY-009`

### Requirement: REQ-GOV-003 Writing style and gates
Every markdown file SHALL pass `specctx lint tells --baseline 0` and `specctx lint ste --baseline 0 --disable synonym-rotation`. The pre-commit hook and CI SHALL run both through `specctx gate`, `specctx check --strict`, and `openspec validate --all --strict`.

Refs: ADR-005

#### Scenario: SCN-GOV-003-1 CI gate
- **WHEN** a push adds a markdown file with a semicolon
- **THEN** the `specs` CI job fails

### Requirement: REQ-GOV-006 README order
`README.md` SHALL open with the title and one sentence that names the evidence gate first and the context ratio second. Both SHALL come from the newest `docs/metrics/*.md`. A quickstart of three commands SHALL follow, with the install form that works today first. Then one `task start` excerpt of at most 12 lines and a `## Why` list of three lines that each cite a metric. Maintainer content SHALL live in `docs/CONTRIBUTING.md`. The config reference SHALL list `SPECCTX_OPENSPEC`.

Refs: REQ-GOV-003

#### Scenario: SCN-GOV-006-1 First screen
- **WHEN** a reader opens `README.md`
- **THEN** the first 25 lines contain the value sentence, the quickstart, and the excerpt, and no SVG

#### Scenario: SCN-GOV-006-2 Maintainer content moved
- **WHEN** `grep -c "^## Develop" README.md` runs
- **THEN** it prints 0 and `docs/CONTRIBUTING.md` has that section

#### Scenario: SCN-GOV-006-3 Current ratio
- **WHEN** the test reads the value sentence and lists `docs/metrics/`
- **THEN** the sentence names `Verify` before `context ratio` and cites the newest metrics file by name
