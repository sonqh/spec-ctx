# Handoff
change: 003-distribution
current: none
base: 2026-10-24T02:51:21.004Z
as_of: 2026-10-24T04:45:25.743Z
done:
- 003/2.1
- 003/4.2
- 003/5.1
- 003/5.2
- 003/5.3
- 006/1.1
- 006/1.2
- 006/1.3
- 006/2.1
- 006/2.2
- 006/2.3
- 006/2.4
- 006/2.5
reopened:
- 005/1.1 stale-evidence 005/1.1 src/tasks/evidence.ts src/cli/workflow.ts: reopen keeps its reason (2.1) (at 2026-10-24T03:53:32.801Z)
- 005/2.1 stale-evidence 005/2.1 tests/stats/metrics.test.ts: type fix for the typecheck step (at 2026-10-24T03:55:28.665Z)
- 005/1.1 stale-evidence 005/1.1 tests/stats/metrics.test.ts: type fix for the typecheck step (at 2026-10-24T03:55:35.601Z)
- 003/3.6 stale-evidence 003/3.6 src/cli/gate.ts tests/cli/gate.test.ts (006/1.2 adds the spec-length step) (at 2026-10-24T04:09:19.881Z)
- 006/1.3 stale-evidence 006/1.3 (help, main, and parity.sh changed in 2.4) (at 2026-10-24T04:36:47.734Z)
- 006/2.1 stale-evidence 006/2.1 (help, main, and parity.sh changed in 2.4) (at 2026-10-24T04:36:48.115Z)
- 006/2.2 stale-evidence 006/2.2 (help, main, and parity.sh changed in 2.4) (at 2026-10-24T04:38:45.488Z)
- 006/2.3 stale-evidence 006/2.3 (help, main, and parity.sh changed in 2.4) (at 2026-10-24T04:38:45.815Z)
- 006/1.2 stale-evidence 006/1.2 (006/2.5 switches to specctx lint) (at 2026-10-24T04:41:25.208Z)
- 006/1.3 stale-evidence 006/1.3 (006/2.5 switches to specctx lint) (at 2026-10-24T04:41:25.634Z)
- 006/2.1 stale-evidence 006/2.1 (006/2.5 switches to specctx lint) (at 2026-10-24T04:41:26.066Z)
- 006/2.2 stale-evidence 006/2.2 (006/2.5 switches to specctx lint) (at 2026-10-24T04:43:29.552Z)
- 006/2.3 stale-evidence 006/2.3 (006/2.5 switches to specctx lint) (at 2026-10-24T04:43:29.918Z)
- 006/2.4 stale-evidence 006/2.4 (006/2.5 switches to specctx lint) (at 2026-10-24T04:43:30.285Z)
- 003/2.1 stale-evidence 003/2.1 (006/2.5 switches to specctx lint) (at 2026-10-24T04:43:39.771Z)
- 003/4.2 stale-evidence 003/4.2 (006/2.5 switches to specctx lint) (at 2026-10-24T04:43:40.371Z)
- 003/5.1 stale-evidence 003/5.1 (006/2.5 switches to specctx lint) (at 2026-10-24T04:43:41.341Z)
- 003/5.2 stale-evidence 003/5.2 (006/2.5 switches to specctx lint) (at 2026-10-24T04:43:41.746Z)
- 003/5.3 stale-evidence 003/5.3 tests/gov/governance.test.ts (006/2.5 switches to specctx lint) (at 2026-10-24T04:43:47.898Z)
- 003/5.1 Verify or task text changed in 29623bc: specctx lint in place of the Python scripts (at 2026-10-24T04:53:36.937Z)
- 003/5.2 Verify or task text changed in 29623bc: specctx lint in place of the Python scripts (at 2026-10-24T04:53:37.615Z)
- 006/2.5 Verify or task text changed in 29623bc: specctx lint in place of the Python scripts (at 2026-10-24T04:53:38.057Z)
open_questions:
resolved:
- Engines accept REQ-[A-Z]+ (SCN-CHK-002-1 uses REQ-X-003). The 001 design says [A-Z]{2,6}. Keep the wider pattern? (task none, 2026-10-24) answer: keep [A-Z]{2,6}. SCN-CHK-002-1 now uses REQ-XX-003 (003/3.5)
- 003/4.2 and 5.3 wait for 4.1. Python removal follows agentrc running on the npm package. (task none, 2026-10-24) answer: order set: 3.4, 3.5, agentrc 007, then 4.1, 4.2, 5.3
- 003/4.1 agentrc: removing tools/ctx and tests/ctx leaves 12 REQ-CTX, 5 REQ-BOOT, 3 REQ-GOV main requirements uncovered and 40 scenarios untested. Remove and retire them in an agentrc change, or port the Python tests to run against spec-ctx? (task none, 2026-10-24) answer: retire the engine specs in agentrc change 007-adopt-spec-ctx
- 003/3.3 publish: approve npm publish of spec-ctx 0.1.0? Needs the NPM_TOKEN secret, tag v0.1.0, and a moving tag v0 for the action. (task none, 2026-10-24) answer: publish postponed until the user adds NPM_TOKEN. 3.3 stays open
- 003/4.2 needs a spec decision. (1) REQ-DIST-003 (parity harness, SCN-DIST-003-1 runs tests/parity/run.sh with both engines) is an active main requirement, and REQ-DIST-007 removes tests/parity and tools/ctx. Add a REMOVED block for REQ-DIST-003 to the 003 distribution delta, or rewrite it to compare the TypeScript engine with the recorded Python goldens in tests/fixtures/parity-golden? SCN-IDX-002-3, SCN-QRY-003-4 and SCN-CHK-002-2 already pass against those goldens. (2) The 4.2 Verify grep can never pass: the 003 tasks.md, its distribution delta, the parity fixture, openspec/config.yaml, DELEGATION.md, and .ctx/index.json name ctx.py. Narrow it like agentrc 2.2 (skip openspec/, tests/fixtures/, .ctx/), and edit config.yaml and DELEGATION.md? (task none, 2026-10-24) answer: Option 2: golden harness (REQ-DIST-003 MODIFIED, SCN-DIST-003-2). 4.2 Verify narrowed. Done in 4.2.
- Two engine fixes found by the agentrc archive: a retire reason that names a live replacement ID (REQ-CLI-001) gave reused-id, so only the first ID of a line counts as retired. An archived REMOVED block has no scenario, so req-without-scn now skips archived entries. REQ-CHK-001 and REQ-GOV-002 do not spell out either case. Confirm. (task none, 2026-10-24) answer: confirmed in REQ-CHK-001 (SCN-CHK-001-4, SCN-CHK-001-5)
- REQ-IDS-003 says id retire exits 2 while the ID is a canonical entry. An archived copy stays canonical when no other copy exists, so no removed ID could ever be retired. The engine now treats only a non-archived canonical copy as in use, as SCN-IDS-003-2 describes. Update the requirement text to match? (task none, 2026-10-24) answer: REQ-IDS-003 MODIFIED, SCN-IDS-003-3
- SCN-DIST-008-2 says the action calls npx -y github:sonqh/spec-ctx#main check --strict. The modified REQ-DIST-005 says the action runs specctx gate, so the call is now gate --strict. The test follows REQ-DIST-005. Update the scenario text? (task none, 2026-10-24) answer: SCN-DIST-008-2 now says gate --strict
- spec-ctx and agentrc are private repos. On a runner, npx github:sonqh/spec-ctx fails with git exit 128 (no credentials). spec-ctx CI now passes the job token to git. agentrc CI needs a token that can read spec-ctx (a PAT secret), plus the spec-ctx setting that lets other repos of the owner use its action, or a public spec-ctx, or the npm publish. (task none, 2026-10-24) answer: spec-ctx CI uses the job token. agentrc CI checks reachability and skips. Making spec-ctx public is with the user.
- 003/4.1 blocked by a spec gap: a main requirement that an active REMOVED block names stays canonical and active, so check --strict reports it uncovered and scenario-untested, and a retired row makes it reused-id. agentrc 007 cannot pass strict before archive. See the agentrc handoff for options A, B, C. (task none, 2026-10-24) answer: pending REMOVED exemption in REQ-CHK-002 (SCN-CHK-002-3)
- docs/upstream-issue.md: the parallel merge plan page was blocked. Check its summary against the real file before opening the issue. (task none, 2026-10-24) answer: checked against the real plan in 9516269
- 004 REQ-ADOPT-004 appends a digit on a CAP collision (SCN-ADOPT-004-2 expects UA2). IDs only allow [A-Z]{2,6} (REQ-CHK-001, 003/3.5), so REQ-UA2-001 is no ID and id new rejects UA2. Use a letter instead (UA then UAB), or widen the pattern to [A-Z][A-Z0-9]{1,5}? Also a one-word capability such as cli gives one letter. I take the first two letters (CL) for now. 2.2 waits on this. (task 004/2.1, 2026-10-24) answer: letters only: TEL for one segment, UPA on a collision (fac3905)
- 004 REQ-ADOPT-002 rolls back on any check finding not in the baseline, and the baseline holds strict rules only. A plain OpenSpec project has tasks with no [REQ-...] and often no Verify:, so check reports task-without-req and task-without-verify before and after adopt. adopt would always roll back, and the existing path cannot end with gate --strict 0. Roll back only on findings that adopt adds (diff against the pre-write check)? And how should the existing path clear task-without-req? 2.3 and 4.1 wait on this. (task none, 2026-10-24) answer: check before and after, only new findings roll back, baseline covers legacy task rules (fac3905)
- 004 REQ-CHK-002 delta copies the 002 text: REQ-X-003 (now invalid, codes have 2 to 6 letters), no pending REMOVED exemption, no SCN-CHK-002-3, both engines. 003 also MODIFIES REQ-CHK-002. Whichever archives last overwrites the other. Rebase the 004 block on the 003 text and add SCN-CHK-002-4? The baseline filter also lives only in a scenario, not in the requirement text. 3.1 waits on this. (task none, 2026-10-24) answer: 004 REQ-CHK-002 rebased on the 003 text with the baseline sentence (fac3905)
- Archive order: 004 is ready (10 of 10 done, strict 0 findings, validate 12 passed). 003 stays active for 3.3, and it still holds a MODIFIED block for REQ-CHK-002. If 004 archives now, its REQ-CHK-002 text goes to main, but the 003 block stays canonical while 003 is active and overwrites main when 003 archives later. The baseline sentence and SCN-CHK-002-4 would then be lost. A) archive 004 now and drop the REQ-CHK-002 block from the 003 check delta, B) hold 004 until 003 archives. (task none, 2026-10-24) answer: Option A. 576607c drops the REQ-CHK-002 block from 003
- 004 archive held: after archive, openspec validate --all --strict fails on the main check spec because REQ-CHK-002 text is 535 characters (limit 500). I undid the archive locally, nothing was committed. Proposed text, 489 characters, same meaning: replace the last two sentences with: An ID named by a `## REMOVED` block of an active change SHALL be exempt from `uncovered` and `scenario-untested` until archive. A finding in `.ctx/baseline.json` SHALL be dropped in strict and non-strict mode and counted in a final line `baselined: <n>`. Or split the baseline rule into its own requirement. (task none, 2026-10-24) answer: Option A in 7c2a339, REQ-CHK-002 is 422 characters. 004 archived.
- 006 REQ-CLI-001 delta was written before the 005 archive. Strict validate refused it for dropping SCN-CLI-001-6. I added stats to its command list and copied SCN-CLI-001-6 from main into the 006 block, with no other change. Confirm. (task none, 2026-10-24) answer: confirmed in 29623bc: stats in the list, SCN-CLI-001-6 copied
- BLOCKER 006/1.2: gate step 4 fails on this repo: spec-length: fail REQ-CHK-003 504 chars. REQ-CHK-003 is a MODIFIED block in the 003 check delta. Strict validate skips MODIFIED text, but the main spec check after the 003 archive would fail. Proposed edit, 499 chars, same meaning: 'a warning line' becomes 'a warning'. A trial with that edit passed all 13 ci-local steps. I reverted it. No 006 commit is pushed. 003/3.6 reopened on stale evidence and stays open until the fix. 006/3.1 waits too. (task none, 2026-10-24) answer: 29623bc: REQ-CHK-003 under 500 chars. 003/3.6 redone
- Scenario conflict: the 003 delta of REQ-CLI-004 says a missing python3 skips the linters (SCN-CLI-004-3), and says 'three gates' and 'linters ship under scripts/'. REQ-LINT-003 removes the skip, and gate now has four steps. The SCN-CLI-004-3 test now checks the new behavior and names SCN-LINT-003-1. Update the 003 delta before 003 archives? (task none, 2026-10-24) answer: 29623bc: 003 REQ-CLI-004 and SCN-CLI-004-3 name specctx lint, no python3
- The Python scripts are gone. CLAUDE.md (lint line, stack line), DELEGATION.md, ADR-005, and REQ-GOV-003 in the main spec still name scripts/*-lint.py. I did not edit CLAUDE.md or the ADR. Who edits them, and in which change? (task none, 2026-10-24) answer: 29623bc edited CLAUDE.md, DELEGATION.md, ADR-005. 006 MODIFIED REQ-GOV-003
- 003/5.1 and 003/5.2 Verify commands call python3 scripts/*-lint.py. I redid both before the scripts left. A later reopen cannot pass. Change both to specctx lint? (task none, 2026-10-24) answer: 003/5.1 and 5.2 Verify now call specctx lint. Both redone
- REQ-LINT-002 asks for test lines from the Python selftest. The tells selftest has no line for 8 rules (not-x-but-y, emoji-heading, sales-word, title-case-heading, stacked-qualifier, serves-as, closer, repeated-closer). Those tests use my lines, which the Python script flagged and passed. Confirm. (task none, 2026-10-24) answer: confirmed. Noted in docs/verification/006.md
- Python bugs kept, per the rules: tells reports repeated-closer at the first substring match, so the line can be wrong. tells blanks every token with a slash (and/or) as a URL. tells rejects 'a.md --json b.md' with exit 2. tells accepts a negative --baseline. Stderr text of usage errors names specctx lint and is not byte identical to argparse. Stdout and exit codes match. (task none, 2026-10-24) answer: kept as documented behavior in docs/verification/006.md. A later change fixes them
- OpenSpec does not write archived: into .openspec.yaml (the 005 archive has schema and created only). The 006 design says it does. status reads archived when present, else the folder date, then the folder name. Confirm. (task none, 2026-10-24) answer: fallback to the folder date stays. Noted in docs/verification/006.md
next: 003/3.3  Publish `v0.1.0`. Smoke test `npx spec-ctx@0.1.0 --version` in a clean temp dir.
evidence: 22 task(s), 22 command, 0 manual
