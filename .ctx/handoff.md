# Handoff
change: 054-recall-benchmark
current: none
base: 2026-11-03T17:51:25.551Z
as_of: none
done:
reopened:
open_questions:
- Q82 plan ready for 054-recall-benchmark. Approve to start the tasks? (task 054-recall-benchmark, 2026-11-04)
resolved:
- Q72 plan ready for 049-index-same-ms-stale. Approve to start the tasks? (task 049-index-same-ms-stale, 2026-10-30) answer: Approved by the lead after product manager and architect review, with the edits in the lead's brief to the implementing engineer: a pre-wait instead of rebuild rounds, clock fixes, skip .ctx in the walk, smaller test loops, honest before numbers.
- Q73 archive 049-index-same-ms-stale? (task 049-index-same-ms-stale, 2026-10-30) answer: Approved by the lead after the architect diff review: no blocker.
- Q74 plan ready for 050-requested-context-always-kept. Approve to start the tasks? (task 050-requested-context-always-kept, 2026-11-03) answer: Approved by the lead. D3 keep the main version. D10 print a requested decision once. D11 a negative --budget exits 2. Keep the tool light and easy to use.
- Q75 archive 050-requested-context-always-kept? (task 050-requested-context-always-kept, 2026-11-03) answer: Approved by the lead after the architect review of the diff. ci:local passes.
- Q76 plan ready for 051-try-it. Approve to start the tasks? (task 051-try-it, 2026-11-03) answer: Owner approved 2026-11-03. Add context add-mfa/1.1 to the README block. The try.sh test requires src/login.ts. One manual run against spec-ctx@0.4.1 is enough. Owner also asked to shorten the README: new task 2.2.
- Q77 archive 051-try-it? (task 051-try-it, 2026-11-03) answer: Owner approved the archive on 2026-11-03.
- Q78 plan ready for 053-try-offline. Approve to start the tasks? (task 053-try-offline, 2026-11-03) answer: Owner approved the plan and the lead's recommendations on 2026-11-04: merge the 053 PR after its archive stop, the benchmark becomes 054, write.test.ts is the one named exception to 022/D3, the whole-run npx guard is a later change.
- Q79 archive 053-try-offline? (task 053-try-offline, 2026-11-03) answer: Owner approved the merge of the 053 PR after its archive stop on 2026-11-04. Architect: ready to archive, no blocker.
- Q80 plan ready for 052-check-deferred. Approve to start the tasks? (task 052-check-deferred, 2026-11-03) answer: Owner approved 2026-11-03. Include the change with deltas and no task. Edit the two baseline.test.ts assertions, do not change fixtures. 051 merges first.
- Q81 archive 052-check-deferred? (task 052-check-deferred, 2026-11-03) answer: Owner approved the archive on 2026-11-03.
- and 71 more in .ctx/questions.json
next: 054/1.1  Write `tests/stat/recall.test.ts` first, with `Covers: REQ-STAT-006`. It holds one case for each scenario of REQ-STAT-006. The cases build a temp project from `tests/fixtures/ctx-repo`, init git in it, and write a label file there. SCN-STAT-006-1 has one task that matches every label and one with a code miss and a test miss. SCN-STAT-006-2 sets a small `budget` in the label file so that one labelled entry is omitted. SCN-STAT-006-3 covers the three causes of exit 2. SCN-STAT-006-5 runs the sample twice with one seed and once with another. Run the file before the script exists. Every case must fail. Then write `scripts/recall.mjs` with Node APIs only, as 054/D1 to 054/D5, 054/D7, and 054/D9 say. It spawns `node dist/cli.js context <task> --json --budget <budget>` with `cwd` at the root of the label file. Tag it with `// REQ-STAT-006`.
evidence: 0 task(s), 0 command, 0 manual
