# spec-governance

## ADDED Requirements

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
