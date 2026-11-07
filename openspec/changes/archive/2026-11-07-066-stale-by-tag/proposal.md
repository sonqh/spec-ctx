# Proposal

## Why

`task done` writes into the evidence `files` every code and test file that carries a tag of a cited requirement. `taggedFiles` in `src/tasks/evidence.ts` does it. The task may not have touched those files. A later task that edits one of them makes the earlier task `stale-evidence`. The engineers hit this in changes 059 to 062, and again in 065. Each hit costs one `task reopen` and one `task done` per task.

The one-file-per-task rule does not prevent it. The citation graph reaches files that no task names.

Measured on the evidence of changes 059 to 065 (27 live evidence files, 23 `reopened` copies):

- 165 recorded files. 107 of them (65 percent) are in no task line and in no Verify command. They came from a tag.
- 23 of 27 evidence files hold at least one such file.
- 40 of the 107 sit in a file that the change did not edit at all, so no task of that change touched it.

The method is in `docs/verification/066.md`.

## What changes

- `task done` records three kinds of file.
  - Each file that the task line names in backticks.
  - Each file that the Verify command names.
  - Each file that the git diff touched since `task start`.
- A tag alone adds nothing (ADR-010 item 3.3).
- `task start` writes `base` into `.ctx/current.json`. It holds the HEAD commit and the digest of each changed or untracked file. `task done` compares the tree with it. Untracked new files count. New evidence gets a `diff` field that lists those paths.
- Ignored files, `.ctx/`, `.claude/`, and the `tasks.md` of a change stay out. `design.md` D6 says why.
- With no git, no `task start`, or a `base` of another task, `task done` records the named and Verify files and prints one note on stderr. On a repair run (`task reopen`, then `task done`), it carries the `diff` paths of the reopened copy forward (REQ-TASK-010). Evidence from before this change has no `diff` field, so its tag-only files never come back.
- `check` keeps its rule on the files that evidence records. Evidence of archived tasks does not change. The `verified` label reads the same files.
- New requirements REQ-TASK-009 and REQ-TASK-010. MODIFIED REQ-TASK-004 with a new scenario SCN-TASK-004-2.
- Tests that pinned the tag rule change in task 3.1. `docs/getting-started.md` changes in task 3.2.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-workflow`: ADDED REQ-TASK-009. MODIFIED REQ-TASK-004.

## Layer and benefit

- Layer: layer 2, the skills and the evidence that keeps links true. It makes the loop use layer 1 better.
- Benefit: the `stale since <path>` and `verified` labels of `context` and `task start` keep their meaning. A label then says that a task touched or named that file, or that its Verify ran it. It no longer says that a tag exists. The loop stops spending repairs on files that no task owned.
- Side effect on layer 1: new tasks get fewer `verified` lines (REQ-QRY-023 reads evidence files).
- Measure: the count above, 107 of 165 recorded files from a tag alone. After the change, the same count on new evidence is 0 by rule, and a test proves it. A replay test holds the case. Task A cites REQ-X tagged in file F, task B edits F. Before the change, A is stale. After it, A is fresh. The record states what the change costs. A code line that no task touched, named, or ran reads `tagged`, not `verified`. The cost is measured before the work. A replay of changes 061 and 060 runs in a temp copy at their commits. It runs once with the old rule and once with the new rule. The table is in the tasks and in `docs/verification/066.md`. On the first estimate, `verified` lines fall from 70 to 64 over 061 and from 47 to 46 over 060. The estimate keeps every file that the change commit edited, so it is an upper bound for the new rule.

## Stop line

Take the replayed change 061. Suppose the `verified` lines of `context <task>` fall by more than half under the new rule. Then the engineer stops and reports to the lead before task 2.1 closes.

## Out of scope

- No change to `check`, `next`, the gate, or the `verified` rule of REQ-QRY-023.
- No daemon, no watcher, no new dependency. `git` is the only extra process, and a repo with no git still works (ADR-003).
