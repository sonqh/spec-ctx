# Handoff
change: 003-distribution
current: none
base: 2026-10-24T00:12:39.985Z
as_of: 2026-10-24T01:40:51.255Z
done:
- 003/3.2
- 003/3.4
- 003/3.5
reopened:
- 003/3.2 tests/action/selftest.sh gained the github: version case of REQ-DIST-008 (at 2026-10-24T01:37:32.166Z)
- 003/3.4 tests/install/git.sh reports its error and CI passes a short SHA (at 2026-10-24T01:57:19.043Z)
open_questions:
- docs/upstream-issue.md: the parallel merge plan page was blocked. Check its summary against the real file before opening the issue. (task none, 2026-10-24)
- 003/4.1 blocked by a spec gap: a main requirement that an active REMOVED block names stays canonical and active, so check --strict reports it uncovered and scenario-untested, and a retired row makes it reused-id. agentrc 007 cannot pass strict before archive. See the agentrc handoff for options A, B, C. (task none, 2026-10-24)
resolved:
- Engines accept REQ-[A-Z]+ (SCN-CHK-002-1 uses REQ-X-003). The 001 design says [A-Z]{2,6}. Keep the wider pattern? (task none, 2026-10-24) answer: keep [A-Z]{2,6}. SCN-CHK-002-1 now uses REQ-XX-003 (003/3.5)
- 003/4.2 and 5.3 wait for 4.1. Python removal follows agentrc running on the npm package. (task none, 2026-10-24) answer: order set: 3.4, 3.5, agentrc 007, then 4.1, 4.2, 5.3
- 003/4.1 agentrc: removing tools/ctx and tests/ctx leaves 12 REQ-CTX, 5 REQ-BOOT, 3 REQ-GOV main requirements uncovered and 40 scenarios untested. Remove and retire them in an agentrc change, or port the Python tests to run against spec-ctx? (task none, 2026-10-24) answer: retire the engine specs in agentrc change 007-adopt-spec-ctx
- 003/3.3 publish: approve npm publish of spec-ctx 0.1.0? Needs the NPM_TOKEN secret, tag v0.1.0, and a moving tag v0 for the action. (task none, 2026-10-24) answer: publish postponed until the user adds NPM_TOKEN. 3.3 stays open
next: 003/3.3  Publish `v0.1.0`. Smoke test `npx spec-ctx@0.1.0 --version` in a clean temp dir.
evidence: 10 task(s), 10 command, 0 manual
