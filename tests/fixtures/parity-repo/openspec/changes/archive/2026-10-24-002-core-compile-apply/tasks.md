# Tasks

## 1. Apply pipeline

- [x] 1.1 Implement `src/apply/plan.ts`: compile, render, read, classify create/update/unchanged/skip. [REQ-APPLY-001] Verify: `tests/apply/plan.test.ts` covers SCN-APPLY-001-1 and asserts no filesystem writes with a temp home.
- [x] 1.2 Implement managed-block read and write for markdown and TOML comment syntax. [REQ-APPLY-003, REQ-ADPT-005] Verify: tests for SCN-APPLY-003-1 and SCN-CLD-002-1 on fixture files.
- [x] 1.3 Implement merge-json with owned-key list and `_agentrc` marker. [REQ-APPLY-003, REQ-CLD-004, REQ-CLD-006] Verify: tests for SCN-CLD-004-1 and SCN-CLD-006-1.
- [x] 1.4 Implement merge-toml with `smol-toml` and owned-table list. [REQ-APPLY-003, REQ-CDX-003] Verify: test for SCN-CDX-003-1 with a `[profiles.work]` fixture.
- [x] 1.5 Implement unified diff output per artifact. [REQ-APPLY-002] Verify: test for SCN-APPLY-002-1 compares against a golden diff.
- [x] 1.6 Implement confirmation, `--yes`, and TTY detection. [REQ-APPLY-004] Verify: test for SCN-APPLY-004-1 with stdin not a TTY exits 3.
- [x] 1.7 Implement backups with 10-set retention and atomic temp-then-rename writes. [REQ-APPLY-006, REQ-APPLY-008] Verify: tests for SCN-APPLY-006-1 and SCN-APPLY-008-1 (inject EACCES on the third artifact).
- [x] 1.8 Implement lockfile write and `status` drift comparison. [REQ-APPLY-005] Verify: test for SCN-APPLY-005-1.
- [x] 1.9 Implement `revert`. [REQ-APPLY-007] Verify: test for SCN-APPLY-007-1 leaves the temp home empty.
- [x] 1.10 Implement the secrets path guard and the under-config-dir path check. [REQ-APPLY-009] Verify: test for SCN-APPLY-009-1 with a mock adapter returning `auth.json`.

## 2. Claude Code adapter

- [x] 2.1 Implement `detect()` and config dir resolution. [REQ-CLD-001] Verify: test for SCN-CLD-001-1.
- [x] 2.2 Render `CLAUDE.md` managed block with `@rules/` imports. [REQ-CLD-002] Verify: golden files for five profiles and SCN-CLD-002-2.
- [x] 2.3 Render `rules/<id>.md` with `paths:` frontmatter. [REQ-CLD-003] Verify: test for SCN-CLD-003-1.
- [x] 2.4 Render `settings.json` owned keys, hooks as `jq` matchers, sorted unique deny list. [REQ-CLD-004, REQ-CLD-005] Verify: tests for SCN-CLD-004-2 and SCN-CLD-005-1, plus a shell test that the rendered hook exits 2 on `git push origin main`.
- [x] 2.5 Render skills directories from cache with digest-based replace. [REQ-CLD-007] Verify: test for SCN-CLD-007-1.
- [x] 2.6 Declare the capability table and run the shared contract suite. [REQ-CLD-008, REQ-ADPT-001] Verify: `tests/adapters/contract.test.ts` passes for claude-code and SCN-CLD-008-1 passes.

## 3. Codex adapter

- [x] 3.1 Implement `detect()` with `CODEX_HOME`. [REQ-CDX-001] Verify: test for SCN-CDX-001-1.
- [x] 3.2 Render `AGENTS.md` managed block with inlined rules. [REQ-CDX-002] Verify: golden files for five profiles and SCN-CDX-002-1.
- [x] 3.3 Render `config.toml` sandbox, approval, and `[mcp_servers.*]`. [REQ-CDX-003] Verify: test for SCN-CDX-003-2.
- [x] 3.4 Render hook and permission fallbacks as rule text and record degradations. [REQ-CDX-004, REQ-CDX-006] Verify: tests for SCN-CDX-004-1 and SCN-CDX-006-1.
- [x] 3.5 Copy skills to `~/.agents/skills`. [REQ-CDX-005] Verify: test for SCN-CDX-005-1.
- [x] 3.6 Run the shared contract suite for codex. [REQ-ADPT-001] Verify: passes.

## 4. CLI

- [x] 4.1 Wire commands, global flags, exit codes, and stubs for `import` and `audit`. [REQ-CLI-001, REQ-CLI-002, REQ-CLI-003] Verify: tests for SCN-CLI-001-1, SCN-CLI-002-1, SCN-CLI-003-1.
- [x] 4.2 Implement output style and `--json` discipline. [REQ-CLI-004] Verify: test for SCN-CLI-004-1.
- [x] 4.3 Write all help text in Strict STE and lint it in CI. [REQ-CLI-005] Verify: CI step pipes `--help` of every command into `ste-lint.py` with exit 0.

## 5. End-to-end and verification

- [x] 5.1 Add `tests/e2e/init.test.ts` that runs `agentrc init --yes` against a temp HOME with both agents detected, then `status`, then `revert`. [REQ-APPLY-001, REQ-APPLY-005, REQ-APPLY-007] Verify: all three steps exit 0 and the home is empty after revert.
- [x] 5.2 Tag code and tests, run `ctx check --strict`, `openspec validate --all --strict`, both linters. [REQ-GOV-001] Verify: all exit 0.

## Workflow follow-up

- Archive with `/opsx:archive 002-core-compile-apply`, then `python3 tools/ctx/ctx.py build`.
