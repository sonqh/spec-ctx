# Handoff
change: 003-distribution
current: none
base: 2026-10-24T02:15:51.704Z
as_of: 2026-10-24T02:34:03.424Z
done:
- 003/4.1
reopened:
open_questions:
- docs/upstream-issue.md: the parallel merge plan page was blocked. Check its summary against the real file before opening the issue. (task none, 2026-10-24)
- 003/4.1 blocked by a spec gap: a main requirement that an active REMOVED block names stays canonical and active, so check --strict reports it uncovered and scenario-untested, and a retired row makes it reused-id. agentrc 007 cannot pass strict before archive. See the agentrc handoff for options A, B, C. (task none, 2026-10-24)
- spec-ctx and agentrc are private repos. On a runner, npx github:sonqh/spec-ctx fails with git exit 128 (no credentials). spec-ctx CI now passes the job token to git. agentrc CI needs a token that can read spec-ctx (a PAT secret), plus the spec-ctx setting that lets other repos of the owner use its action, or a public spec-ctx, or the npm publish. (task none, 2026-10-24)
- SCN-DIST-008-2 says the action calls npx -y github:sonqh/spec-ctx#main check --strict. The modified REQ-DIST-005 says the action runs specctx gate, so the call is now gate --strict. The test follows REQ-DIST-005. Update the scenario text? (task none, 2026-10-24)
- REQ-IDS-003 says id retire exits 2 while the ID is a canonical entry. An archived copy stays canonical when no other copy exists, so no removed ID could ever be retired. The engine now treats only a non-archived canonical copy as in use, as SCN-IDS-003-2 describes. Update the requirement text to match? (task none, 2026-10-24)
- Two engine fixes found by the agentrc archive: a retire reason that names a live replacement ID (REQ-CLI-001) gave reused-id, so only the first ID of a line counts as retired. An archived REMOVED block has no scenario, so req-without-scn now skips archived entries. REQ-CHK-001 and REQ-GOV-002 do not spell out either case. Confirm. (task none, 2026-10-24)
- 003/4.2 needs a spec decision. (1) REQ-DIST-003 (parity harness, SCN-DIST-003-1 runs tests/parity/run.sh with both engines) is an active main requirement, and REQ-DIST-007 removes tests/parity and tools/ctx. Add a REMOVED block for REQ-DIST-003 to the 003 distribution delta, or rewrite it to compare the TypeScript engine with the recorded Python goldens in tests/fixtures/parity-golden? SCN-IDX-002-3, SCN-QRY-003-4 and SCN-CHK-002-2 already pass against those goldens. (2) The 4.2 Verify grep can never pass: the 003 tasks.md, its distribution delta, the parity fixture, openspec/config.yaml, DELEGATION.md, and .ctx/index.json name ctx.py. Narrow it like agentrc 2.2 (skip openspec/, tests/fixtures/, .ctx/), and edit config.yaml and DELEGATION.md? (task none, 2026-10-24)
resolved:
- Engines accept REQ-[A-Z]+ (SCN-CHK-002-1 uses REQ-X-003). The 001 design says [A-Z]{2,6}. Keep the wider pattern? (task none, 2026-10-24) answer: keep [A-Z]{2,6}. SCN-CHK-002-1 now uses REQ-XX-003 (003/3.5)
- 003/4.2 and 5.3 wait for 4.1. Python removal follows agentrc running on the npm package. (task none, 2026-10-24) answer: order set: 3.4, 3.5, agentrc 007, then 4.1, 4.2, 5.3
- 003/4.1 agentrc: removing tools/ctx and tests/ctx leaves 12 REQ-CTX, 5 REQ-BOOT, 3 REQ-GOV main requirements uncovered and 40 scenarios untested. Remove and retire them in an agentrc change, or port the Python tests to run against spec-ctx? (task none, 2026-10-24) answer: retire the engine specs in agentrc change 007-adopt-spec-ctx
- 003/3.3 publish: approve npm publish of spec-ctx 0.1.0? Needs the NPM_TOKEN secret, tag v0.1.0, and a moving tag v0 for the action. (task none, 2026-10-24) answer: publish postponed until the user adds NPM_TOKEN. 3.3 stays open
next: 003/3.3  Publish `v0.1.0`. Smoke test `npx spec-ctx@0.1.0 --version` in a clean temp dir.
evidence: 13 task(s), 13 command, 0 manual
