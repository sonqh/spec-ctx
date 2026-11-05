# Proposal

## Why

Three bugs in the evidence that `task done` writes.

- Fail files go into git. A fail file is a log of one failed Verify run on one machine. `check`, `gate`, and `stats` skip them. Only `next` and `task done` read them. This repository tracks 30 of them, and `init` gives adopters no way to keep them out.
- A fresh clone can raise the attempt cap question on its first failure. `windowStart` in `src/loop/fails.ts` counts every fail file of the task when `.ctx/current.json` does not name the task. That file is per session and stays out of git. So fail files from another clone count. The repair command that `next` prints runs `task done` with no `task start`, so it meets this case. A reproduction in a temp dir gave `attempt: 3` and a cap question on the first local failure.
- Evidence keeps machine paths. The stderr tail of a Verify run can hold the project root and the home directory. 18 committed fail files hold `/home/claude`. The cap question text quotes the same tail and goes into `.ctx/questions.json`.

## What changes

- `task done` keeps `.ctx/evidence/.gitignore` with the line `*.fail-*.json` when it writes a fail file. Existing adopters get it with no `init` run. `init` and its four `.gitignore` lines stay as they are.
- The attempt window counts only fail files from the current session on this machine. With no `current.json` for the task, no fail file counts. A failed `task done` for such a task writes `current.json`, so the cap still stops a loop that never ran `task start`.
- `task done` replaces the project root with `.` and the home directory with `~` in the stderr tail of evidence, in fail files, and in the cap question. `verify.command` stays as the task line has it.
- Spec: ADDED REQ-LOOP-017, REQ-LOOP-018, REQ-TASK-008. MODIFIED REQ-LOOP-002, scenario SCN-LOOP-002-3.

## Layers and benefit

- Layer 2, a bug fix in evidence integrity. ADR-008 allows bug fixes during the freeze.
- It keeps the links true (ADR-007 item 4). The loop on a fresh clone asks a human only after real local failures. Committed evidence holds no machine paths, so a stranger can share a repository built with spec-ctx.

## Out of scope

- A rewrite of committed evidence. That would make it stale.
- A change to `check`, `gate`, `stats`, or `init`.
- A version bump.
