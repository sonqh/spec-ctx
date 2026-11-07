# Handoff
change: none
current: none
base: 2026-11-07T00:51:30.103Z
as_of: none
done:
reopened:
- 061/2.1 stale evidence: src/init/next.ts (at 2026-11-07T01:02:59.635Z)
- 061/5.1 stale evidence: src/init/next.ts (at 2026-11-07T01:03:12.190Z)
- 063/1.1 stale evidence: src/adopt/plan.ts (at 2026-11-07T01:23:49.847Z)
- 063/1.1 stale evidence: src/adopt/plan.ts (at 2026-11-07T01:25:39.018Z)
- 063/2.1 stale evidence: src/adopt/plan.ts (at 2026-11-07T01:25:47.974Z)
- 063/3.1 stale evidence: src/adopt/plan.ts (at 2026-11-07T01:26:02.657Z)
open_questions:
resolved:
- Q99 archive 060-useful-bundle? (task 060-useful-bundle, 2026-11-06) answer: Approved by the lead on 2026-11-07, same grounds as Q97. Every task has fresh evidence after the lead's fixes.
- Q100 plan ready for 061-one-path. Approve to start the tasks? (task 061-one-path, 2026-11-06) answer: Approved by the lead on 2026-11-07 after PM and architect reviews, with edits. (1) Add MODIFIED REQ-CLI-007: drop init from the fixed-table sentence, say init follows REQ-DIST-017; cite it in task 2.1. (2) Add MODIFIED REQ-ADOPT-006: the existing path is init --all, adopt, context <task>, then baseline write as the gate step; cite it in task 4.1. (3) Keep the subject rule in the adopt line: 'To gate the old debt later, run <run> baseline write and commit it with a subject that starts with baseline:'. (4) Cut files and caps from init --json; needs_id and next only. (5) D1 blocker: buildIndex always writes .ctx/index.json, so there is no in-memory build. Use loadIndex(root, cfg) in init and in the adopt tail, and rewrite D1 and the test to say init may write the gitignored .ctx/index.json. (6) Narrow the fallback to UsageExit and ConfigError so a TypeError still surfaces. (7) Do not claim the first open task equals what next picks; say it is nextTask's deterministic pick by file and line in the lowest active change. (8) Name tests/init/run-key.test.ts (lines 42 and 63 assert the old status tail) in task 2.1. (9) Task 5.1 times init on the OpenSpec fork fixture too (clone sonqh/OpenSpec-spec-ctx at 8899171), not only on this repo.
- Q101 archive 061-one-path? (task 061-one-path, 2026-11-07) answer: Approved by the lead on 2026-11-07 after the architect diff review. One fix applied: a skills refresh never writes an untracked index (detectNext skips the index load when .gitignore lacks .ctx/index.json and no index exists). The other suggestion contradicted SCN-DIST-017-5 and was not taken.
- Q102 archive 061-one-path? (task 061-one-path, 2026-11-07) answer: Approved by the lead on 2026-11-07, same grounds as the previous archive question.
- Q103 plan ready for 063-readable-caps. Approve to start the tasks? (task 063-readable-caps, 2026-11-07) answer: Approved by the lead on 2026-11-07. Lead-written plan for ADR-008 item 7, small and in layer 1. No PM review: the scope is fixed by ADR-008. Architect diff review at the archive stop.
- Q104 archive 063-readable-caps? (task 063-readable-caps, 2026-11-07) answer: Approved by the lead on 2026-11-07 after the architect diff review, with the three changes applied: families in adopt --json, a family with no letters is not listed, the report wording.
- Q105 plan ready for 062-trust-labels. Approve to start the tasks? (task 062-trust-labels, 2026-11-07) answer: Approved by the lead on 2026-11-07. Plan drafted by the engineer and finished by the lead after the agent stopped. Layer 1, ADR-008 item 6. Architect diff review at the archive stop.
- Q106 task 062/3.1 failed Verify 3 times. Last: (fail) spec governance > SCN-GOV-001-2 check --strict passes with an active change that holds an open task (055/D2) [703.34ms]. What should change? (task 062/3.1, 2026-11-07) answer: The lead fixes the Verify of 3.1.
- Q107 task 062/3.1 failed Verify 3 times. Last: (fail) spec governance > SCN-GOV-001-2 check --strict passes with an active change that holds an open task (055/D2) [587.29ms]. What should change? (task 062/3.1, 2026-11-07) answer: The lead repairs the stale tasks in order.
- Q108 archive 062-trust-labels? (task 062-trust-labels, 2026-11-07) answer: Approved by the lead on 2026-11-07 after the architect diff review, with both changes applied: a damaged evidence file reads stale as check does, and the reason table test names the class of every reason.
- and 98 more in .ctx/questions.json
next: no open task
evidence: 0 task(s), 0 command, 0 manual
