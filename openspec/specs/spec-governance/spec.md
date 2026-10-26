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

### Requirement: REQ-GOV-004 Local gate before push
`.githooks/pre-push` SHALL run `scripts/ci-local.sh`, which runs the same steps as the CI workflow: `specctx gate --strict`, `bun run typecheck`, `bun run test`, `bun run test:node`, and the help text lint. A failing step SHALL block the push. `SPECCTX_SKIP_PUSH_GATE=1` SHALL skip the hook and print `push gate skipped` so the skip is visible in the terminal. `CLAUDE.md` SHALL state the rule: run `bun run ci:local` before every push.

Refs: REQ-GOV-003, REQ-CLI-004

#### Scenario: SCN-GOV-004-1 Blocked push
- **WHEN** a test fails and `git push` runs with the hook enabled
- **THEN** the push is rejected and the output names the failing step

#### Scenario: SCN-GOV-004-2 Same steps as CI
- **WHEN** `scripts/ci-local.sh` and `.github/workflows/ci.yml` are compared
- **THEN** every `run:` command of the `code` and `specs` jobs appears in the script

### Requirement: REQ-GOV-005 CI runs once per push
The CI workflow SHALL run on `push` to `main` and on `pull_request` only. It SHALL set `concurrency` with `cancel-in-progress: true` keyed by ref, so a new push cancels the run of the previous one. The `code` job SHALL run only when `src/**`, `tests/**`, `package.json`, or `bun.lock` changed.

#### Scenario: SCN-GOV-005-1 Docs only push
- **WHEN** a push changes only `docs/*.md`
- **THEN** the `specs` job runs and the `code` job is skipped

#### Scenario: SCN-GOV-005-2 Two pushes in a row
- **WHEN** a second push lands while the first run is in progress
- **THEN** the first run is cancelled

### Requirement: REQ-GOV-007 A version bump is a release
`version` in `package.json` SHALL change only in a commit whose subject starts with `release:`. The pre-commit hook SHALL reject any other staged change to that field with the message `package.json version changed. A version bump publishes to npm. Use a commit subject that starts with "release:".` `CLAUDE.md` SHALL state the rule.

Refs: REQ-DIST-004, REQ-GOV-003

#### Scenario: SCN-GOV-007-1 Bump without the subject
- **WHEN** a commit changes `version` in `package.json` and its subject is `fix typo`
- **THEN** the pre-commit hook exits 1 with the message above

#### Scenario: SCN-GOV-007-2 Bump with the subject
- **WHEN** a commit changes `version` and its subject is `release: 0.1.1`
- **THEN** the pre-commit hook passes

#### Scenario: SCN-GOV-007-3 Other package.json edits
- **WHEN** a commit changes a script in `package.json` and not `version`
- **THEN** the pre-commit hook passes
