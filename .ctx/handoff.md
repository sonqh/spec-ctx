# Handoff
change: 054-recall-benchmark
current: none
base: 2026-11-05T04:05:13.438Z
as_of: 2026-11-06T15:00:12.696Z
done:
- 054/1.1
- 054/1.2
- 054/2.1
- 054/2.2
reopened:
- 054/1.1 stale evidence: tests/stat/recall.test.ts (at 2026-11-06T14:59:26.914Z)
- 054/1.2 stale evidence: tests/stat/recall.test.ts (at 2026-11-06T14:59:42.942Z)
- 054/2.1 stale evidence: tests/stat/recall.test.ts (at 2026-11-06T14:59:49.157Z)
open_questions:
resolved:
- Q80 plan ready for 052-check-deferred. Approve to start the tasks? (task 052-check-deferred, 2026-11-03) answer: Owner approved 2026-11-03. Include the change with deltas and no task. Edit the two baseline.test.ts assertions, do not change fixtures. 051 merges first.
- Q81 archive 052-check-deferred? (task 052-check-deferred, 2026-11-03) answer: Owner approved the archive on 2026-11-03.
- Q82 plan ready for 055-governance-deferred. Approve to start the tasks? (task 055-governance-deferred, 2026-11-05) answer: Owner approved the 055 plan on 2026-11-05, with the edits of both reviews. Merge 055 into main after its archive stop.
- Q83 archive 055-governance-deferred? (task 055-governance-deferred, 2026-11-05) answer: Owner approved on 2026-11-05 the archive and the merge of 055 into main. Architect: ready to archive, no blocker.
- Q84 plan ready for 056-evidence-hygiene. Approve to start the tasks? (task 056-evidence-hygiene, 2026-11-05) answer: Approved by the lead after PM and architect reviews, with edits. D2 yes: the lead untracks the 30 committed fail files with git rm --cached at commit. D6 and D7 accepted. D5 redaction: strip a trailing slash from root and home, add the realpath of root, replace the longest path first, match only when the character before is not a letter, digit, dot, underscore, or dash, wrap realpathSync in try/catch, state Windows is out of scope. Add a macOS realpath unit case. D4: add a scenario for current.json that names another task. writeEvidence copies started_at only when bundle_chars is present, so cycle time keeps its meaning. If the current.json write fails, count fail files as before and say so in design. Cut SCN-TASK-008-3. Task 1.1 Verify adds plan-stop, repair-verify, and stats metrics tests. Task 3.1 Verify adds a grep that .ctx/evidence/056 holds no /home/ or /Users/ path.
- Q85 archive 056-evidence-hygiene? (task 056-evidence-hygiene, 2026-11-05) answer: Approved by the lead after the architect review of the diff: ready to archive, no blocker. ci:local passes 14 steps. Follow-up: a window test for the current.json write failure path.
- Q86 plan ready for 057-run-journal. Approve to start the tasks? (task 057-run-journal, 2026-11-05) answer: Approved by the lead after PM and architect reviews, with edits. ADR-009 states the owner decisions. Add an ADR-009 pointer to the ADR-008 Consequences line about the 30 day stop, and add to the CLAUDE.md Direction bullet: ADR-007 scope rules and layer 1 priority still apply. D2: keep the fallback for bug intake, but only when main set cmd to ? in the parse error, group, or unknown command branch, and never when argv has --root. lint and help never get it. D3: only context emits context-has-code-or-test, bundle emits none. Export parseProvenance next to provenance in src/graph/bundle.ts, anchored on ^-- (\S+) \| , no new BundleResult field. Run contextSignals only when io.journal is set. D4: make frames relative to the package root before the node_modules test, convert file URLs with fileURLToPath, skip stack line 1. D5: the preload stays. Journal-on tests pass SPECCTX_JOURNAL=1 explicitly. Drop the timing assertion in 3.1 and record on and off timing in docs/verification/057.md.
- Q87 archive 057-run-journal? (task 057-run-journal, 2026-11-05) answer: Approved by the lead after the architect diff review: ready to archive, no blocker. Follow-ups filed as issues: non-absolute frames in errInfo, and report ignores --json.
- Q88 plan ready for 054-recall-benchmark. Approve to start the tasks? (task 054-recall-benchmark, 2026-11-04) answer: Owner approved on 2026-11-05 with the lead's recommendations: the governance test bug is a separate change 055 that merges first, the fixture labels come from done tasks of archived fixture changes with real commits, the fixture runs as committed.
- Q89 review the labels in bench/recall/ before the baseline run (task 054-recall-benchmark, 2026-11-06) answer: Approved by the lead on 2026-11-06 under the authority the owner gave. Fixture labels use candidates open, seed 54, sample 20: 196 requirement labels, 1 code label, 0 test labels. Known limit: the fixture scans tests/** but its tests sit in test/, so test recall is n/a there (finding for the one-path change).
- and 79 more in .ctx/questions.json
next: 054/3.1  Run `bash scripts/recall.sh --out docs/metrics --date <today>`. Run it again with `--out` set to a temp dir. Compare recall, misses, and sha256 of the two JSON files (SCN-STAT-006-4 on the real data). Write `docs/verification/054.md` with the two tables, the label sha256 values, the machine, the Node version, the result of the compare, and the findings of 054 design. Add a paragraph under `## Unreleased` in `CHANGELOG.md`, headed `Change 054-recall-benchmark.`, that names REQ-STAT-006. Both files follow the writing rules of `CLAUDE.md`.
evidence: 4 task(s), 4 command, 0 manual
