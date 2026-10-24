# spec-governance

## MODIFIED Requirements

### Requirement: REQ-GOV-001 ID on every artifact
Every `### Requirement:` header SHALL start with a REQ ID. Every `#### Scenario:` header SHALL start with the SCN ID of its requirement plus a sequence number. Every ADR file SHALL start with its ADR ID. IDs SHALL follow ADR-005. `specctx check` from sonqh/spec-ctx SHALL be the tool that enforces this.

Refs: ADR-005

#### Scenario: SCN-GOV-001-1 Header without ID
- **WHEN** a spec has `### Requirement: Profile location`
- **THEN** `specctx check` reports `missing-id` with the file and line

### Requirement: REQ-GOV-002 IDs never reused
A retired ID SHALL be listed in `decisions/retired-ids.md` with the date and reason. A reason for an ID moved to another project SHALL name the replacement ID there. `specctx check` SHALL fail when a retired ID appears in an active spec.

#### Scenario: SCN-GOV-002-1 Reuse attempt
- **WHEN** REQ-PROF-004 is listed as retired and a new spec defines REQ-PROF-004
- **THEN** `specctx check` reports `reused-id`

#### Scenario: SCN-GOV-002-2 Moved IDs
- **WHEN** `retired-ids.md` is read after this change
- **THEN** every REQ-CTX and REQ-BOOT row names a spec-ctx requirement

### Requirement: REQ-GOV-004 Task cites requirement
Every checkbox line in `tasks.md` SHALL contain at least one `[REQ-...]` citation and a `Verify:` clause. New tasks SHALL write the Verify clause as a command in a code span, so `specctx task done` can run it. A task SHALL be ticked only by `specctx task done`.

#### Scenario: SCN-GOV-004-1 Task without REQ
- **WHEN** a task line reads `- [ ] 1.1 Add zod`
- **THEN** `specctx check` reports `task-without-req`

#### Scenario: SCN-GOV-004-2 Hand ticked task
- **WHEN** a task is `[x]` and no evidence file exists under `.ctx/evidence/`
- **THEN** `specctx check --strict` reports `done-without-evidence`

### Requirement: REQ-GOV-005 Pre-commit gate
A pre-commit hook SHALL run `specctx check` on staged markdown. A pre-push hook SHALL run `scripts/ci-local.sh`: `specctx gate --strict`, `bun run typecheck`, `bun run test`, the help text lint. The same steps SHALL be the CI jobs. CI SHALL run on `push` to `main` and `pull_request` only, with `concurrency` and `cancel-in-progress`. Both hooks SHALL call `specctx` through `scripts/specctx.sh`. `SPECCTX_SKIP_PUSH_GATE=1` SHALL skip the push hook and print `push gate skipped`.

#### Scenario: SCN-GOV-005-1 Blocked commit
- **WHEN** a commit adds a dangling `Refs:` target
- **THEN** the commit is rejected with the `specctx check` output

#### Scenario: SCN-GOV-005-3 Blocked push
- **WHEN** a vitest test fails and `git push` runs with the hooks enabled
- **THEN** the push is rejected and the output names the failing step

#### Scenario: SCN-GOV-005-2 One install source
- **WHEN** the hook and CI are searched for `spec-ctx`
- **THEN** only `scripts/specctx.sh` and the action reference name the source

## ADDED Requirements

### Requirement: REQ-GOV-006 Session start through spec-ctx
Every agent session SHALL start with the `specctx-bootstrap` skill. The skills SHALL be installed by `specctx init --skills` into `.claude/skills/` and `.agents/skills/`. The `bootstrap-context` skill SHALL be removed. `CLAUDE.md` SHALL name the loop: `status`, `task next`, `task start`, `task done`, `handoff write`.

#### Scenario: SCN-GOV-006-1 Skills present
- **WHEN** the tree is listed after this change
- **THEN** `.claude/skills/specctx-bootstrap`, `specctx-next`, and `specctx-done` exist and `bootstrap-context` does not

#### Scenario: SCN-GOV-006-2 No Python engine
- **WHEN** the tree is searched for `ctx.py`
- **THEN** there are no matches outside `openspec/changes/archive/` and `docs/`
