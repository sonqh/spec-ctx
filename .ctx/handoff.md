# Handoff
change: none
current: none
base: 2026-11-05T08:47:17.888Z
as_of: none
done:
reopened:
open_questions:
- Q86 plan ready for 057-run-journal. Approve to start the tasks? (task 057-run-journal, 2026-11-05)
resolved:
- Q76 plan ready for 051-try-it. Approve to start the tasks? (task 051-try-it, 2026-11-03) answer: Owner approved 2026-11-03. Add context add-mfa/1.1 to the README block. The try.sh test requires src/login.ts. One manual run against spec-ctx@0.4.1 is enough. Owner also asked to shorten the README: new task 2.2.
- Q77 archive 051-try-it? (task 051-try-it, 2026-11-03) answer: Owner approved the archive on 2026-11-03.
- Q78 plan ready for 053-try-offline. Approve to start the tasks? (task 053-try-offline, 2026-11-03) answer: Owner approved the plan and the lead's recommendations on 2026-11-04: merge the 053 PR after its archive stop, the benchmark becomes 054, write.test.ts is the one named exception to 022/D3, the whole-run npx guard is a later change.
- Q79 archive 053-try-offline? (task 053-try-offline, 2026-11-03) answer: Owner approved the merge of the 053 PR after its archive stop on 2026-11-04. Architect: ready to archive, no blocker.
- Q80 plan ready for 052-check-deferred. Approve to start the tasks? (task 052-check-deferred, 2026-11-03) answer: Owner approved 2026-11-03. Include the change with deltas and no task. Edit the two baseline.test.ts assertions, do not change fixtures. 051 merges first.
- Q81 archive 052-check-deferred? (task 052-check-deferred, 2026-11-03) answer: Owner approved the archive on 2026-11-03.
- Q82 plan ready for 055-governance-deferred. Approve to start the tasks? (task 055-governance-deferred, 2026-11-05) answer: Owner approved the 055 plan on 2026-11-05, with the edits of both reviews. Merge 055 into main after its archive stop.
- Q83 archive 055-governance-deferred? (task 055-governance-deferred, 2026-11-05) answer: Owner approved on 2026-11-05 the archive and the merge of 055 into main. Architect: ready to archive, no blocker.
- Q84 plan ready for 056-evidence-hygiene. Approve to start the tasks? (task 056-evidence-hygiene, 2026-11-05) answer: Approved by the lead after PM and architect reviews, with edits. D2 yes: the lead untracks the 30 committed fail files with git rm --cached at commit. D6 and D7 accepted. D5 redaction: strip a trailing slash from root and home, add the realpath of root, replace the longest path first, match only when the character before is not a letter, digit, dot, underscore, or dash, wrap realpathSync in try/catch, state Windows is out of scope. Add a macOS realpath unit case. D4: add a scenario for current.json that names another task. writeEvidence copies started_at only when bundle_chars is present, so cycle time keeps its meaning. If the current.json write fails, count fail files as before and say so in design. Cut SCN-TASK-008-3. Task 1.1 Verify adds plan-stop, repair-verify, and stats metrics tests. Task 3.1 Verify adds a grep that .ctx/evidence/056 holds no /home/ or /Users/ path.
- Q85 archive 056-evidence-hygiene? (task 056-evidence-hygiene, 2026-11-05) answer: Approved by the lead after the architect review of the diff: ready to archive, no blocker. ci:local passes 14 steps. Follow-up: a window test for the current.json write failure path.
- and 75 more in .ctx/questions.json
next: no open task
evidence: 0 task(s), 0 command, 0 manual
