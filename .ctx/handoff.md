# Handoff
change: none
current: none
base: 2026-10-30T02:41:24.171Z
as_of: none
done:
reopened:
open_questions:
resolved:
- Q25 BLOCKER 008/3.2 and 008/3.4: the parity goldens cannot stay unchanged. tests/fixtures/parity-golden/check.out and check-strict.out end with 'N finding(s)'. REQ-CHK-004 (008/D6) replaces that line with '<n> findings in <m> files (<h> hard, <a> advisory)' and per rule hint lines. status.out ends with 'uncovered active REQs in main: 104'. 008/D7 adds a 'next: ...' line to status. So bash tests/parity/run.sh fails on check, check --strict, and status, while the brief says goldens must not change and the proposal says the parity goldens do not change. Options: A) allow one re-record of those three goldens with run.sh --record and a note in docs/verification/008.md, B) keep the old check and status output when stdout is not a TTY or under a flag (adds a mode the design does not name), C) drop the summary and the status next line from 008. 3.2, 3.3, 3.4, 4.1, 4.2 and the archive wait on this. Also open: does 'advisory' in the summary count the manual-evidence warnings? (task none, 2026-10-25) answer: Option A. Re-record check.out, check-strict.out, and status.out once with tests/parity/run.sh --record. The parity rule protects the index and bundle output. D6 and D7 change check and status output on purpose. index.json and the bundle goldens stay. Advisory counts every warning-level finding, manual-evidence included. Hard counts only the rules that set exit 1.
- Q26 BLOCKER 012/2.2: gate spec-length fails, REQ-GOV-008 in the 012 delta has 553 chars (limit 500). Proposed text, gate passes in a trial (reverted): 'recorded in order' becomes 'in order', the done sentence becomes 'A failing `task done`, the edit, and a passing `task done`.', 'with the head of the handoff' becomes 'and the handoff head', 'All SVGs under 400 kB together' becomes 'The SVGs under 400 kB in all'. SCN-GOV-008-1 still names The task stays open. (task 012/2.2, 2026-10-26) answer: approved the shorter text
- Q27 task 024/3.1 failed Verify 3 times. Last: $ bash scripts/ci-local.sh. What should change? (task 024/3.1, 2026-10-28) answer: Two lint rises: the lead handoff file sat in docs/ (moved out, it is not part of the repo) and one 26 word sentence in the 024 loop delta (split).
- Q28 plan ready for 030-status-next. Approve to start the tasks? (task 030-status-next, 2026-10-29) answer: approved by the lead. Accept the status slowdown: status and next must agree (ADR-006). D6 is right, keep all three lines.
- Q29 plan ready for 031-archive-stop. Approve to start the tasks? (task 031-archive-stop, 2026-10-30) answer: approved by the lead. Gate on the plan artifacts passed, spec-length ok.
- Q30 archive 031-archive-stop? (task 031-archive-stop, 2026-10-30) answer: archive approved by the lead. The REQ-CLI-007 delta added after plan approval is accepted, it follows from REQ-LOOP-007.
- Q31 plan ready for 032-bracketed-templates. Approve to start the tasks? (task 032-bracketed-templates, 2026-10-30) answer: approved by the lead.
- Q32 archive 032-bracketed-templates? (task 032-bracketed-templates, 2026-10-30) answer: archive approved by the lead. fresh-brackets.sh passed on upstream 1.15.0.
- Q33 plan ready for 033-dogfood-friction. Approve to start the tasks? (task 033-dogfood-friction, 2026-10-30) answer: Approved by the lead. Keep the chained command in next for stale tasks. For task 5.1 run tests/parity/run.sh --record once before task done and write the note in docs/verification/033.md. Do not add a bundle command for full MODIFIED blocks in this change.
- Q34 archive 033-dogfood-friction? (task 033-dogfood-friction, 2026-10-30) answer: Approved by the lead after diff review. Run the archive guidance, then the archive command next prints.
- and 24 more in .ctx/questions.json
next: no open task
evidence: 0 task(s), 0 command, 0 manual
