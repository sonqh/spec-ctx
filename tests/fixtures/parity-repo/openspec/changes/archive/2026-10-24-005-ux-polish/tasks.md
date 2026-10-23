# Tasks

## 1. Spec reconciliation (no code)

- [x] 1.1 Confirm the code matches the six MODIFIED requirements: REQ-ELIC-001 field sourcing, REQ-IMP-004, REQ-CLD-006, REQ-ADPT-005, REQ-APPLY-001 `remove`, and the conditional sandbox prompt. Add a test for each scenario that has none. [REQ-ELIC-001, REQ-IMP-004, REQ-CLD-006, REQ-ADPT-005, REQ-APPLY-001, REQ-APPLY-002] Verify: tests for SCN-ELIC-001-2, SCN-ELIC-001-3, SCN-CLD-006-2, SCN-ADPT-005-2, SCN-APPLY-001-2, SCN-APPLY-002-2 pass.
- [x] 1.2 Remove the `rules` entry from the import draft and the `imported-notes` handling in elicit. Print `kept in place` in the report. [REQ-IMP-004] Verify: test for SCN-IMP-004-1 and the five import fixtures pass.

## 2. Content fixes

- [x] 2.1 Add the framework table to `src/ic/languages.ts` and use it in compile. [REQ-IC-010] Verify: tests for SCN-IC-010-1 and SCN-IC-010-2. Regenerate goldens and review the diff.
- [x] 2.2 Write the generated profile with enum comments and the extensions example. [REQ-PROF-012] Verify: tests for SCN-PROF-012-1 and SCN-PROF-012-2. Reload test shows comments do not break parsing.
- [x] 2.3 Add the example line to reference validation errors. [REQ-PROF-013] Verify: test for SCN-PROF-013-1.

## 3. Elicit flow

- [x] 3.1 Move preview text to the clack `hint` field. Keep titles on one line. [REQ-ELIC-002] Verify: tests for SCN-ELIC-002-1 and SCN-ELIC-002-2 through the scripted prompter.
- [x] 3.2 Default name from `git config user.name`. Repeat on empty. Remove the role default. Error on missing name or role in `--answers` mode. [REQ-ELIC-008] Verify: tests for SCN-ELIC-008-1, SCN-ELIC-008-2, SCN-ELIC-008-3. The git call is mocked.
- [x] 3.3 Add the extensions question with validation and the syntax hint. [REQ-ELIC-009] Verify: tests for SCN-ELIC-009-1 and SCN-ELIC-009-2. Update the three answers fixtures.
- [x] 3.4 Ask once about agents that are not installed. Write `enabled: false` on "disable". Print the notice once per run on stderr for enabled agents only. [REQ-ELIC-010] Verify: tests for SCN-ELIC-010-1 and SCN-ELIC-010-2.
- [x] 3.5 Add intro and outro to `init`. [REQ-ELIC-007] Verify: tests for SCN-ELIC-007-1 and SCN-ELIC-007-2 with the scripted prompter and captured stdout.

## 4. CLI output

- [x] 4.1 Group help into `Commands` and `Advanced`. Remove `audit`. Add `--version`. Add the `Terms` section. [REQ-CLI-001, REQ-CLI-006, REQ-CLI-010] Verify: tests for SCN-CLI-001-2, SCN-CLI-006-1, SCN-CLI-010-1. `ste-lint.py --baseline 0` on the help output.
- [x] 4.2 Summary table by default with `+N -M` for updates. Full diff only with `--diff`. Totals line. [REQ-CLI-008] Verify: tests for SCN-CLI-008-1 and SCN-CLI-008-2.
- [x] 4.3 Filter `degraded:` lines to written agents. Keep all in `--json`. [REQ-CLI-009] Verify: test for SCN-CLI-009-1.
- [x] 4.4 Unify not-ready errors to end with `Run: agentrc init`. [REQ-CLI-007] Verify: test for SCN-CLI-007-1 and the existing SCN-PROF-001-3 test.
- [x] 4.5 Route child process stderr to `--verbose` only. [REQ-CLI-004] Verify: test for SCN-CLI-004-2 with a failing fake fetch.

## 5. Apply and revert messages

- [x] 5.1 Add the apply outro, in text and in `--json`. [REQ-APPLY-010] Verify: test for SCN-APPLY-010-1.
- [x] 5.2 Add the revert follow-up line and `revert --list`. [REQ-APPLY-007] Verify: tests for SCN-APPLY-007-2 and SCN-APPLY-007-3.
- [x] 5.3 Add `Next: agentrc init` to the import report. [REQ-IMP-006] Verify: test for SCN-IMP-006-1.

## 6. Catalog errors

- [x] 6.1 Build fetch errors from `{item, source, cause, fix}` and format them in one function. Exit 1 on any failure. [REQ-CAT-009] Verify: tests for SCN-CAT-009-1 and SCN-CAT-009-2 with a fake source.

## 7. Close

- [x] 7.1 Run a manual first run in a temp HOME with `script` and paste the cleaned transcript into `docs/verification/005.md`. Check each P0 item from the product review against it. [REQ-ELIC-007] Verify: the transcript shows intro, hints, summary, confirm, outro, and no `degraded: codex` line.
- [x] 7.2 Update README `Use` section for the new flow. Tag code and tests. Run `ctx check --strict`, `openspec validate --all --strict`, both linters. [REQ-GOV-001] Verify: all exit 0.

## Workflow follow-up

- Archive with `/opsx:archive 005-ux-polish`, then `python3 tools/ctx/ctx.py build`.
