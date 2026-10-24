# Handoff
change: none
current: none
base: 2026-10-24T01:53:01.249Z
as_of: none
done:
reopened:
- 007/1.1 tests tagged REQ-GOV-005 changed for the pre-push gate (3.3) (at 2026-10-24T02:20:17.660Z)
- 007/3.1 tests tagged REQ-GOV-005 changed for the pre-push gate (3.3) (at 2026-10-24T02:20:19.481Z)
open_questions:
- ctx status names the last archived change by folder name. 005 and 006 share the date 2026-10-24, so status prints 006 although 005 came later. Add a time to the archive folder name or accept it.
resolved:
- CI: spec-ctx is private. The runner cannot npx github:sonqh/spec-ctx (git exit 128) and cannot use sonqh/spec-ctx@main as an action without the owner setting. Needs a PAT secret with read access to spec-ctx and a git url rewrite in ci.yml, or a public spec-ctx, or the npm publish. (task none, 2026-10-24) answer: CI checks reachability. Without access specs-skipped passes and scripts/ci-local.sh is the primary gate. No PAT.
- 007/2.2: the Verify grep as written can never pass (007 tasks.md, the spec-governance delta, and .ctx/index.json name ctx.py). It now also skips openspec/ and .ctx/. Confirm. (task none, 2026-10-24) answer: confirmed. The narrowed 2.2 Verify is in f1280d8.
- 007 blocked: while 007 is active, the main copies of the 12 REQ-CTX and 5 REQ-BOOT requirements stay canonical and active (spec-ctx REQ-IDX-003). check --strict reports 17 uncovered and 35 scenario-untested, so the Verify of 3.2 and 4.1 fails before archive. Retired-ids rows (2.1) would add 17 reused-id. Options: A) spec-ctx exempts a main entry that an active REMOVED block names from uncovered, scenario-untested, and reused-id (changes REQ-CHK-002 and REQ-GOV-002 in spec-ctx 003). B) archive 007 with 2.1, 2.2, 3.2, 4.1 open and close them in the archive. C) split the REMOVED deltas into their own change. (task none, 2026-10-24) answer: spec-ctx exempts pending REMOVED IDs from uncovered and scenario-untested. 2.1 ran after archive.
next: no open task
evidence: 0 task(s), 0 command, 0 manual
