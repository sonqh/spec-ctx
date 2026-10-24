# Tasks

## 1. Repository and tooling

- [x] 1.1 Create package.json (name agentrc, Node 22, bun compatible), tsconfig strict, vitest, and `bin: agentrc`. [REQ-CLI-001] Verify: `bun install && bun run test` passes with zero tests.
- [x] 1.2 Copy `scripts/ste-lint.py` and `scripts/tells-lint.py` from sonqh/ste-humanize-skill into `scripts/`. [REQ-GOV-003] Verify: `python3 scripts/tells-lint.py --selftest` prints ok.
- [x] 1.3 Add `.github/workflows/ci.yml` running `openspec validate --all --strict`, `python3 tools/ctx/ctx.py check --strict`, both linters on markdown, and `bun run test`. [REQ-GOV-003, REQ-GOV-005] Verify: workflow file parses and runs on a pull request.
- [x] 1.4 Add a pre-commit hook via `.githooks/pre-commit` and `git config core.hooksPath .githooks` documented in README. [REQ-GOV-005] Verify: a commit with a dangling Refs line is rejected.

## 2. Context engine

- [x] 2.1 Implement `tools/ctx/ctx.py build` scanning the sources in REQ-CTX-001 and writing a sorted `.ctx/index.json`. [REQ-CTX-001, REQ-CTX-002] Verify: `tests/ctx/test_build.py` asserts every ID in `tests/fixtures/ctx-repo/` is indexed and two builds are byte-identical.
- [x] 2.2 Implement `query`, `related`, `bundle` with `--budget` and `--depth`. [REQ-CTX-004, REQ-CTX-005, REQ-CTX-006] Verify: `tests/ctx/test_query.py` covers SCN-CTX-004-1, SCN-CTX-005-1, SCN-CTX-006-1, SCN-CTX-006-2.
- [x] 2.3 Implement `check` with rules duplicate-id, dangling-ref, req-without-scn, missing-id, reused-id, task-without-req, and `--strict` uncovered and unknown-task-req. [REQ-CTX-007, REQ-GOV-001, REQ-GOV-002, REQ-GOV-004] Verify: `tests/ctx/test_check.py` has one failing fixture per rule.
- [x] 2.4 Implement `status`. [REQ-CTX-008] Verify: output on this repo lists four active changes with task counts.
- [x] 2.5 Measure build time on the CI runner with 2,000 generated files. [REQ-CTX-003] Verify: `tests/ctx/test_perf.py` asserts under 1.0 s.

## 3. Bootstrap skill and CLAUDE.md

- [x] 3.1 Write `.claude/skills/bootstrap-context/SKILL.md` per REQ-BOOT-002 and REQ-BOOT-003, and symlink it to `.agents/skills/bootstrap-context/SKILL.md`. [REQ-BOOT-001, REQ-BOOT-002, REQ-BOOT-003, REQ-BOOT-005] Verify: CI step `diff` of the two files is empty.
- [x] 3.2 Implement handoff write and read in the skill text and add `.ctx/handoff.md` to `.gitignore`. [REQ-BOOT-004] Verify: manual run of SCN-BOOT-004-1 recorded in `docs/verification/001.md`.
- [x] 3.3 Write root `CLAUDE.md` and `AGENTS.md` (one-liner `@CLAUDE.md`) stating the ctx-first rule, the ID scheme, the writing rule, and the commands. [REQ-BOOT-002, REQ-GOV-003] Verify: both files pass both linters.

## 4. Profile schema

- [x] 4.1 Implement `src/profile/schema.ts` with zod for REQ-PROF-002 to REQ-PROF-009 including defaults and the autonomy-sandbox rule. [REQ-PROF-002, REQ-PROF-003, REQ-PROF-004, REQ-PROF-005, REQ-PROF-006, REQ-PROF-007, REQ-PROF-008, REQ-PROF-009] Verify: `tests/profile/schema.test.ts` has one test per scenario SCN-PROF-002-1 to SCN-PROF-009-1.
- [x] 4.2 Implement `src/profile/load.ts` resolving the path per REQ-PROF-001. [REQ-PROF-001] Verify: tests for SCN-PROF-001-1 to SCN-PROF-001-3.
- [x] 4.3 Generate `schema/profile.schema.json` in a build script and add a test that fixtures pass both validators. [REQ-PROF-010] Verify: `tests/profile/jsonschema.test.ts` passes on `tests/fixtures/profiles/*.yaml`.
- [x] 4.4 Implement `agentrc validate` output format and `--json`. [REQ-PROF-011] Verify: test for SCN-PROF-011-1.

## 5. IntermediateConfig and adapter contract

- [x] 5.1 Define `src/ic/types.ts` and zod schema for REQ-IC-002 to REQ-IC-008. [REQ-IC-002, REQ-IC-003, REQ-IC-004, REQ-IC-005, REQ-IC-006, REQ-IC-007, REQ-IC-008] Verify: `tests/ic/schema.test.ts` rejects each invalid shape named in the scenarios.
- [x] 5.2 Add prose blocks under `src/ic/blocks/` for verbosity, explanations, report_format, and a build step that embeds them. [REQ-IC-009] Verify: blocks pass both linters and SCN-IC-009-1 test passes.
- [x] 5.3 Implement `src/ic/compile.ts` from profile to IC with no catalog (empty arrays) and prove purity. [REQ-IC-001, REQ-IC-003, REQ-IC-004, REQ-IC-005] Verify: golden files `tests/golden/ic/*.json` for five profiles, and SCN-IC-001-1 test.
- [x] 5.4 Define `src/adapters/types.ts` with `AgentAdapter`, `Artifact`, `Capabilities`, and a `MockAdapter` used by tests. [REQ-ADPT-001, REQ-ADPT-002, REQ-ADPT-004, REQ-ADPT-005] Verify: `tests/adapters/contract.test.ts` runs the shared contract suite against MockAdapter.
- [x] 5.5 Implement config dir resolution helper per REQ-ADPT-003. [REQ-ADPT-003] Verify: tests for SCN-ADPT-003-1 and SCN-ADPT-003-2.

## 6. Verification

- [x] 6.1 Tag every implemented REQ in code and tests, then run `ctx check --strict`. [REQ-GOV-001, REQ-CTX-007] Verify: exit 0.
- [x] 6.2 Run `openspec validate --all --strict` and both linters on all markdown. [REQ-GOV-003] Verify: exit 0.

## Workflow follow-up

- Archive with `/opsx:archive 001-foundation`, then `python3 tools/ctx/ctx.py build`.
