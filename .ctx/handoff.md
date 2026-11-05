# Handoff
change: 054-recall-benchmark
current: 054/2.2
base: 2026-11-05T04:02:15.225Z
as_of: 2026-11-05T04:03:18.900Z
done:
- 054/2.1
reopened:
open_questions:
resolved:
- Q75 archive 050-requested-context-always-kept? (task 050-requested-context-always-kept, 2026-11-03) answer: Approved by the lead after the architect review of the diff. ci:local passes.
- Q76 plan ready for 051-try-it. Approve to start the tasks? (task 051-try-it, 2026-11-03) answer: Owner approved 2026-11-03. Add context add-mfa/1.1 to the README block. The try.sh test requires src/login.ts. One manual run against spec-ctx@0.4.1 is enough. Owner also asked to shorten the README: new task 2.2.
- Q77 archive 051-try-it? (task 051-try-it, 2026-11-03) answer: Owner approved the archive on 2026-11-03.
- Q78 plan ready for 053-try-offline. Approve to start the tasks? (task 053-try-offline, 2026-11-03) answer: Owner approved the plan and the lead's recommendations on 2026-11-04: merge the 053 PR after its archive stop, the benchmark becomes 054, write.test.ts is the one named exception to 022/D3, the whole-run npx guard is a later change.
- Q79 archive 053-try-offline? (task 053-try-offline, 2026-11-03) answer: Owner approved the merge of the 053 PR after its archive stop on 2026-11-04. Architect: ready to archive, no blocker.
- Q80 plan ready for 052-check-deferred. Approve to start the tasks? (task 052-check-deferred, 2026-11-03) answer: Owner approved 2026-11-03. Include the change with deltas and no task. Edit the two baseline.test.ts assertions, do not change fixtures. 051 merges first.
- Q81 archive 052-check-deferred? (task 052-check-deferred, 2026-11-03) answer: Owner approved the archive on 2026-11-03.
- Q82 plan ready for 055-governance-deferred. Approve to start the tasks? (task 055-governance-deferred, 2026-11-05) answer: Owner approved the 055 plan on 2026-11-05, with the edits of both reviews. Merge 055 into main after its archive stop.
- Q83 archive 055-governance-deferred? (task 055-governance-deferred, 2026-11-05) answer: Owner approved on 2026-11-05 the archive and the merge of 055 into main. Architect: ready to archive, no blocker.
- Q84 plan ready for 054-recall-benchmark. Approve to start the tasks? (task 054-recall-benchmark, 2026-11-04) answer: Owner approved on 2026-11-05 with the lead's recommendations: the governance test bug is a separate change 055 that merges first, the fixture labels come from done tasks of archived fixture changes with real commits, the fixture runs as committed.
- and 74 more in .ctx/questions.json
next: 054/2.2  Clone the fixture at 8899171 with history into a temp dir. Write `bench/recall/openspec-fixture.json` there the same way, with the done tasks of its archived changes as candidates. Set `commit` to the full sha. Run `--check` against the clone. Then run `node dist/cli.js handoff ask --change 054-recall-benchmark "review the labels in bench/recall/ before the baseline run"` and stop. Task 3.1 starts only after the owner approves.
evidence: 3 task(s), 3 command, 0 manual
