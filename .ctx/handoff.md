# Handoff
change: 053-try-offline
current: none
base: 2026-11-03T16:50:55.119Z
as_of: none
done:
reopened:
open_questions:
- Q78 plan ready for 053-try-offline. Approve to start the tasks? (task 053-try-offline, 2026-11-03)
resolved:
- Q68 plan ready for 048-review-fixes. Approve to start the tasks? (task 048-review-fixes, 2026-10-30) answer: Approved by the lead after product manager and architect review, with plan edits in the lead's brief to the implementing engineer.
- Q69 archive 048-review-fixes? (task 048-review-fixes, 2026-10-30) answer: Architect blocker: a plan rejection deadlocks a change once every task is [x], because stageOf stores stage archive even with --plan. Fix stageOf, REQ-LOOP-007, and extend SCN-LOOP-015-4.
- Q70 archive 048-review-fixes? (task 048-review-fixes, 2026-10-30) answer: Approved by the lead after the architect blocker was fixed: stageOf returns plan first with --plan, and SCN-LOOP-015-4 covers reject, re-ask and approve.
- Q71 plan ready for 049-flaky-run-prefix. Approve to start the tasks? (task 049-flaky-run-prefix, 2026-10-30) answer: Plan rejected after product manager and architect review: fix the engine freshness rule (layer 1), not the test helper. Re-plan as 049-index-same-ms-stale.
- Q72 plan ready for 049-index-same-ms-stale. Approve to start the tasks? (task 049-index-same-ms-stale, 2026-10-30) answer: Approved by the lead after product manager and architect review, with the edits in the lead's brief to the implementing engineer: a pre-wait instead of rebuild rounds, clock fixes, skip .ctx in the walk, smaller test loops, honest before numbers.
- Q73 archive 049-index-same-ms-stale? (task 049-index-same-ms-stale, 2026-10-30) answer: Approved by the lead after the architect diff review: no blocker.
- Q74 plan ready for 050-requested-context-always-kept. Approve to start the tasks? (task 050-requested-context-always-kept, 2026-11-03) answer: Approved by the lead. D3 keep the main version. D10 print a requested decision once. D11 a negative --budget exits 2. Keep the tool light and easy to use.
- Q75 archive 050-requested-context-always-kept? (task 050-requested-context-always-kept, 2026-11-03) answer: Approved by the lead after the architect review of the diff. ci:local passes.
- Q76 plan ready for 051-try-it. Approve to start the tasks? (task 051-try-it, 2026-11-03) answer: Owner approved 2026-11-03. Add context add-mfa/1.1 to the README block. The try.sh test requires src/login.ts. One manual run against spec-ctx@0.4.1 is enough. Owner also asked to shorten the README: new task 2.2.
- Q77 archive 051-try-it? (task 051-try-it, 2026-11-03) answer: Owner approved the archive on 2026-11-03.
- and 67 more in .ctx/questions.json
next: 053/1.1  Write the guard of 053/D3 first. In `tests/gov/try-script.test.ts`, add SCN-GOV-013-4 with `Covers: REQ-GOV-013`. In `tests/gov/try-readme.test.ts`, add SCN-GOV-012-4 with `Covers: REQ-GOV-012`. Each test makes a recording `npx` in a fresh temp dir outside the run `TMPDIR`. It puts that dir first on the `PATH` of its spawn. After the run, it expects that the record file does not exist. The `try.sh` case also sets `SPECCTX_OPENSPEC` to `npx -y @fission-ai/openspec@latest` in the spawn env, so the override of 053/D1 is under test. Run both files on the current code with `npx vitest run`. Both new cases must fail. Save the failing output for task 2.1. Then export `SPECCTX_OPENSPEC` in `scripts/try.sh` as 053/D1 says, and pass `OPENSPEC_STUB` in the env of the README block spawn as 053/D2 says. Tag the script line with `# REQ-GOV-013`. The other cases of both files must pass with no change.
evidence: 0 task(s), 0 command, 0 manual
