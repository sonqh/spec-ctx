# Handoff
change: 003-distribution
current: none
base: none
as_of: 2026-10-24T00:12:39.985Z
done:
- 003/1.1
- 003/1.2
- 003/2.1
- 003/2.2
- 003/3.1
- 003/3.2
- 003/5.1
- 003/5.2
reopened:
- 003/5.1 tests/gov/governance.test.ts changed for the schemas/ lint path (at 2026-10-24T00:12:39.567Z)
- 003/5.2 tests/gov/governance.test.ts changed for the schemas/ lint path (at 2026-10-24T00:12:39.657Z)
- 003/3.2 tests/action/selftest.sh gained the github: version case of REQ-DIST-008 (at 2026-10-24T01:37:32.166Z)
open_questions:
- 003/3.3 publish: approve npm publish of spec-ctx 0.1.0? Needs the NPM_TOKEN secret, tag v0.1.0, and a moving tag v0 for the action. (task none, 2026-10-24)
- 003/4.1 agentrc: removing tools/ctx and tests/ctx leaves 12 REQ-CTX, 5 REQ-BOOT, 3 REQ-GOV main requirements uncovered and 40 scenarios untested. Remove and retire them in an agentrc change, or port the Python tests to run against spec-ctx? (task none, 2026-10-24)
- 003/4.2 and 5.3 wait for 4.1. Python removal follows agentrc running on the npm package. (task none, 2026-10-24)
- docs/upstream-issue.md: the parallel merge plan page was blocked. Check its summary against the real file before opening the issue. (task none, 2026-10-24)
- Engines accept REQ-[A-Z]+ (SCN-CHK-002-1 uses REQ-X-003). The 001 design says [A-Z]{2,6}. Keep the wider pattern? (task none, 2026-10-24)
resolved:
next: 003/3.3  Publish `v0.1.0`. Smoke test `npx spec-ctx@0.1.0 --version` in a clean temp dir.
evidence: 8 task(s), 8 command, 0 manual
