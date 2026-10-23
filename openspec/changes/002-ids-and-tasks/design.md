# Design

## Context

Change 001 gives a read-only engine. This change adds the three writes an agent needs during a session: an ID, a checkbox, a handoff. Each write goes through one command so the state stays consistent.

## Goals / Non-Goals

**Goals:**
- No ID is ever allocated twice, even across branches, with a readable rule for conflicts.
- A ticked task always has evidence, and stale evidence is visible.
- A fresh session can start from `status` and `handoff` alone.

**Non-Goals:**
- Locking between concurrent agents. A merge conflict in `retired-ids.md` or `tasks.md` is the signal.
- Running Verify in a sandbox. The command runs in the project root with the user's shell.

## Decisions

- ID allocation reads the index, not a counter file. Next = max canonical and archived and retired number for that code, plus one. Alternative: a counter file. Rejected because it drifts from the tree and conflicts on merge without saying why. Follows ADR-002.
- Evidence file per task at `.ctx/evidence/<change>/<group>.<n>.json`, sorted keys, committed. Fields: `task`, `reqs`, `verify` (command, exit, stdout_sha256, stderr_tail), `files` (path to sha256 for every code and test file tagged with a cited REQ), `at` (ISO time), `kind` (`command` or `manual`). Follows ADR-004.
- `task done` ticks the checkbox by editing only the two characters `[ ]` to `[x]` on the task line. It never rewrites the rest of the file. Creates no ADR.
- `task next` returns the first open task in the lowest numbered active change whose earlier tasks in the same group are done. Alternative: a `blockedBy` field. Rejected for 002 because OpenSpec tasks are ordered lists and the order already encodes dependency. Creates no ADR.
- Verify parsing: the first code span after the literal `Verify:` on the task line. Several spans joined with ` && `. No span means `kind: manual`. Creates no ADR.
- Handoff is generated, not hand written. Fields: active change, current task, done since last handoff, open questions carried from the previous handoff, evidence summary. Agents append to `open_questions` with `specctx handoff ask "<text>"`. Follows ADR-004.
- `stale-evidence` compares digests of tagged files at `done` time with the tree now. Only files tagged with a REQ the task cites count. Follows ADR-004.

## Risks / Trade-offs

- A Verify command that passes in one shell and fails in another. Mitigation: evidence records the command and its exit. CI reruns `check --strict`, which compares digests only, not the command.
- Evidence files add commits. Mitigation: small sorted JSON, one per task.
- Allocation across two branches can produce the same number. Mitigation: `check` reports `duplicate-id` after merge, and the retire flow documents the fix.
