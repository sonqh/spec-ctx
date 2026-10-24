# Tasks

## 1. Elicit

- [x] 1.1 Implement the twelve-question flow with `@clack/prompts`, defaults, and preview lines sourced from the mapping table. [REQ-ELIC-001, REQ-ELIC-002] Verify: `tests/elicit/flow.test.ts` drives the flow with an answers file and asserts twelve prompts and preview text for SCN-ELIC-002-1.
- [x] 1.2 Implement inline validation and prompt repeat. [REQ-ELIC-004] Verify: test for SCN-ELIC-004-1.
- [x] 1.3 Implement `--answers` mode and golden profiles for three answer files. [REQ-ELIC-005] Verify: SCN-ELIC-005-1 golden test.
- [x] 1.4 Implement `(imported)` defaults and "accept imported". [REQ-ELIC-003] Verify: test for SCN-ELIC-003-1.
- [x] 1.5 Implement `--assist` with provider interface, file list confirmation, and `(suggested)` defaults. [REQ-ELIC-006] Verify: tests for SCN-ELIC-006-1 and SCN-ELIC-006-2 with a mocked provider.

## 2. Import

- [x] 2.1 Implement source reading with the secrets guard. [REQ-IMP-001] Verify: test for SCN-IMP-001-1.
- [x] 2.2 Implement inference rules with source paths. [REQ-IMP-002] Verify: tests for SCN-IMP-002-1 and SCN-IMP-002-2.
- [x] 2.3 Implement draft write and three-section report. [REQ-IMP-003] Verify: test for SCN-IMP-003-1.
- [x] 2.4 Implement `imported-notes` rule for unmapped prose. [REQ-IMP-004] Verify: test for SCN-IMP-004-1.
- [x] 2.5 Build five import fixtures from real setups (trailofbits template, claude-code-starter output, a bare `/init` CLAUDE.md, a Codex-only setup, a mixed setup). Add golden drafts and `expected.json`. [REQ-IMP-005] Verify: SCN-IMP-005-1 passes for all five.

## 3. Init flow

- [x] 3.1 Wire `init` to import, elicit, `plan --diff`, confirm, apply, and keep `--no-elicit`. [REQ-CLI-001, REQ-APPLY-004] Verify: `tests/e2e/init-full.test.ts` with an answers file completes and leaves a lockfile.
- [x] 3.2 Tag code and tests, run `ctx check --strict`, `openspec validate --all --strict`, both linters. [REQ-GOV-001] Verify: all exit 0.

## Workflow follow-up

- Archive with `/opsx:archive 003-elicit-import`, then `python3 tools/ctx/ctx.py build`.
