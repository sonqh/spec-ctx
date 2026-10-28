# Handoff
change: none
current: none
base: 2026-10-26T08:46:23.500Z
as_of: none
done:
reopened:
- 013/1.1 init.ts and its test changed in 1.2 (at 2026-10-26T13:29:07.371Z)
- 014/1.1 tests/config.test.ts still expected exit 2 for an existing spec-ctx.toml (at 2026-10-27T02:15:44.490Z)
- 014/1.2 tests/config.test.ts still expected exit 2 for an existing spec-ctx.toml (at 2026-10-27T02:15:47.465Z)
- 016/1.1 test files changed in 2.2 (at 2026-10-27T06:25:41.361Z)
- 016/2.1 test files changed in 2.2 (at 2026-10-27T06:25:45.334Z)
- 017/1.1 src/cli/workflow.ts changed in 3.2 (the task start hint) (at 2026-10-27T07:00:11.752Z)
- 017/2.1 init.ts and its test changed in 2.2 (at 2026-10-27T07:00:15.610Z)
- 018/1.1 init.ts and its test changed in 2.1 (at 2026-10-27T08:29:15.538Z)
- 018/1.2 init.ts and its test changed in 2.1 (at 2026-10-27T08:29:19.469Z)
- 019/1.1 workflow.ts and the task tests changed in 2.1 (at 2026-10-28T12:37:27.269Z)
- 019/1.2 workflow.ts and the task tests changed in 2.1 (at 2026-10-28T12:37:30.441Z)
- 019/1.3 workflow.ts and the task tests changed in 2.1 (at 2026-10-28T12:37:33.730Z)
open_questions:
resolved:
- Q17 006 REQ-CLI-001 delta was written before the 005 archive. Strict validate refused it for dropping SCN-CLI-001-6. I added stats to its command list and copied SCN-CLI-001-6 from main into the 006 block, with no other change. Confirm. (task none, 2026-10-24) answer: confirmed in 29623bc: stats in the list, SCN-CLI-001-6 copied
- Q18 BLOCKER 006/1.2: gate step 4 fails on this repo: spec-length: fail REQ-CHK-003 504 chars. REQ-CHK-003 is a MODIFIED block in the 003 check delta. Strict validate skips MODIFIED text, but the main spec check after the 003 archive would fail. Proposed edit, 499 chars, same meaning: 'a warning line' becomes 'a warning'. A trial with that edit passed all 13 ci-local steps. I reverted it. No 006 commit is pushed. 003/3.6 reopened on stale evidence and stays open until the fix. 006/3.1 waits too. (task none, 2026-10-24) answer: 29623bc: REQ-CHK-003 under 500 chars. 003/3.6 redone
- Q19 Scenario conflict: the 003 delta of REQ-CLI-004 says a missing python3 skips the linters (SCN-CLI-004-3), and says 'three gates' and 'linters ship under scripts/'. REQ-LINT-003 removes the skip, and gate now has four steps. The SCN-CLI-004-3 test now checks the new behavior and names SCN-LINT-003-1. Update the 003 delta before 003 archives? (task none, 2026-10-24) answer: 29623bc: 003 REQ-CLI-004 and SCN-CLI-004-3 name specctx lint, no python3
- Q20 The Python scripts are gone. CLAUDE.md (lint line, stack line), DELEGATION.md, ADR-005, and REQ-GOV-003 in the main spec still name scripts/*-lint.py. I did not edit CLAUDE.md or the ADR. Who edits them, and in which change? (task none, 2026-10-24) answer: 29623bc edited CLAUDE.md, DELEGATION.md, ADR-005. 006 MODIFIED REQ-GOV-003
- Q21 003/5.1 and 003/5.2 Verify commands call python3 scripts/*-lint.py. I redid both before the scripts left. A later reopen cannot pass. Change both to specctx lint? (task none, 2026-10-24) answer: 003/5.1 and 5.2 Verify now call specctx lint. Both redone
- Q22 REQ-LINT-002 asks for test lines from the Python selftest. The tells selftest has no line for 8 rules (not-x-but-y, emoji-heading, sales-word, title-case-heading, stacked-qualifier, serves-as, closer, repeated-closer). Those tests use my lines, which the Python script flagged and passed. Confirm. (task none, 2026-10-24) answer: confirmed. Noted in docs/verification/006.md
- Q23 Python bugs kept, per the rules: tells reports repeated-closer at the first substring match, so the line can be wrong. tells blanks every token with a slash (and/or) as a URL. tells rejects 'a.md --json b.md' with exit 2. tells accepts a negative --baseline. Stderr text of usage errors names specctx lint and is not byte identical to argparse. Stdout and exit codes match. (task none, 2026-10-24) answer: kept as documented behavior in docs/verification/006.md. A later change fixes them
- Q24 OpenSpec does not write archived: into .openspec.yaml (the 005 archive has schema and created only). The 006 design says it does. status reads archived when present, else the folder date, then the folder name. Confirm. (task none, 2026-10-24) answer: fallback to the folder date stays. Noted in docs/verification/006.md
- Q25 BLOCKER 008/3.2 and 008/3.4: the parity goldens cannot stay unchanged. tests/fixtures/parity-golden/check.out and check-strict.out end with 'N finding(s)'. REQ-CHK-004 (008/D6) replaces that line with '<n> findings in <m> files (<h> hard, <a> advisory)' and per rule hint lines. status.out ends with 'uncovered active REQs in main: 104'. 008/D7 adds a 'next: ...' line to status. So bash tests/parity/run.sh fails on check, check --strict, and status, while the brief says goldens must not change and the proposal says the parity goldens do not change. Options: A) allow one re-record of those three goldens with run.sh --record and a note in docs/verification/008.md, B) keep the old check and status output when stdout is not a TTY or under a flag (adds a mode the design does not name), C) drop the summary and the status next line from 008. 3.2, 3.3, 3.4, 4.1, 4.2 and the archive wait on this. Also open: does 'advisory' in the summary count the manual-evidence warnings? (task none, 2026-10-25) answer: Option A. Re-record check.out, check-strict.out, and status.out once with tests/parity/run.sh --record. The parity rule protects the index and bundle output. D6 and D7 change check and status output on purpose. index.json and the bundle goldens stay. Advisory counts every warning-level finding, manual-evidence included. Hard counts only the rules that set exit 1.
- Q26 BLOCKER 012/2.2: gate spec-length fails, REQ-GOV-008 in the 012 delta has 553 chars (limit 500). Proposed text, gate passes in a trial (reverted): 'recorded in order' becomes 'in order', the done sentence becomes 'A failing `task done`, the edit, and a passing `task done`.', 'with the head of the handoff' becomes 'and the handoff head', 'All SVGs under 400 kB together' becomes 'The SVGs under 400 kB in all'. SCN-GOV-008-1 still names The task stays open. (task 012/2.2, 2026-10-26) answer: approved the shorter text
- and 16 more in .ctx/questions.json
next: no open task
evidence: 0 task(s), 0 command, 0 manual
