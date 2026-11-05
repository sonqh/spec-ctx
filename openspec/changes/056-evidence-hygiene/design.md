# Design

## Context

- `task done` writes a fail file through `writeFail` in `src/loop/fails.ts` and the evidence through `writeEvidence` in `src/tasks/evidence.ts`. Both calls sit in `src/cli/workflow.ts`.
- `check`, `gate`, and `stats` skip fail files with `isFailFile`. Only `next` and `task done` read them, through `failsInWindow`.
- `windowStart` returns the empty string when `.ctx/current.json` does not name the task. Every fail file then counts.
- `.ctx/current.json` is per session and stays out of git (REQ-DIST-002).
- This repository tracks 30 fail files. All 30 belong to archived changes. 18 hold `/home/claude` in `stderr_tail`.

## Goals / Non-Goals

**Goals:**
- Fail files stay out of git in every project, with no `init` run.
- Fail files from another clone never count toward the attempt cap.
- New evidence, new fail files, and new cap questions hold no project root and no home directory.

**Non-Goals:**
- A rewrite of committed evidence.
- A change to `init`, `check`, `gate`, or `stats`.

## Decisions

- D1 `writeFail` keeps `.ctx/evidence/.gitignore` with the line `*.fail-*.json` (lead input from the architect review). It creates the file when absent. It appends the line when absent, after a newline if the file has no final newline. It never touches other lines. It swallows every write error. A new helper `ensureFailIgnore(root)` in `src/loop/fails.ts` does this, and `writeFail` calls it after it writes the fail file. Existing adopters get the file on their next failure with no `init` run. Refs: REQ-LOOP-017
  - Rejected: add `.ctx/evidence/**/*.fail-*.json` to `GITIGNORE_LINES` in `src/init/init.ts`. Adopters do not run `init` again, so their fail files stay tracked. It would also change SCN-DIST-002-6, `tests/init/init.test.ts` (the four lines near line 257 and `wrote .gitignore (4 lines)`), `tests/init/skills-refresh.test.ts` (`IGNORE` at line 12), `docs/getting-started.md` line 39, and `docs/reference.md` line 28.
- D2 This repository. Decided by the lead in question 84.
  - `.ctx/evidence/.gitignore` goes into git with the work. The first failed `task done` of this change writes it. Task 3.1 writes it when no failure did.
  - The lead runs `git rm --cached` on the 30 tracked fail files at commit time. The ignore line does not untrack them. No command reads a fail file of an archived change. The files stay on disk. The engineer does not run it.
- D3 The hypothesis holds. A copy of `tests/fixtures/ctx-repo` in a temp dir, with two old fail files of `002/2.2` and no `current.json`, gave:
  - `task start 002/2.2` then a failed `task done 002/2.2`: `attempt: 1`. `task start` names the task, so the window holds.
  - A failed `task done 002/2.2` with no `task start`: `attempt: 3` and question 1 with stage `cap`, on the first local failure.
  - The second case is real. The stale repair command that `next` prints runs `task reopen` and `task done` with no `task start`. A second reproduction through that path also gave `attempt: 3` and a cap question.

  Task 1.1 writes this case as a test first and records the failing output. Refs: REQ-LOOP-018
- D4 The window fix. Refs: REQ-LOOP-018, REQ-LOOP-002
  - `windowStart` returns `null` when `current.json` does not name the task. `failsInWindow` then returns no fail file. A resolved question still moves a start that exists.
  - `writeFail` first writes `current.json` with `started_at` and `task` when the file does not name the task. It then counts the window. So the new fail file is attempt 1, and the cap still stops a loop that never ran `task start`.
  - The written file has no `verify` key. A later Verify edit then does not trip the refusal of REQ-TASK-003, which reads `verify` only when present. It has no `bundle_chars`, so stats skips the context ratio for that task, as it does today.
  - `writeFail` replaces a `current.json` that names another task. The task that fails is the one the agent works on. `next` then returns `fix` for the failed task (SCN-LOOP-018-3).
  - When the write of `current.json` fails, `writeFail` counts fail files as before, with the start of time as the window start. See Risks.
  - `writeEvidence` in `src/tasks/evidence.ts` copies `started_at` only when `bundle_chars` is present too. Only `task start` writes `bundle_chars`. So `cycle_time` in stats keeps its meaning: the time from `task start` to the pass (SCN-LOOP-018-4).
  - Rejected: count none without `current.json` and write nothing. The repair path never writes `current.json`, so it would loop on `fix` with no cap.
- D5 The redaction. A new pure function `redactPaths(text, root, home)` in `src/util/redact.ts`. Refs: REQ-TASK-008
  - It strips one trailing slash from `root` and `home`.
  - It builds a list of pairs: `root` to `.`, the real path of `root` to `.` when it differs, and `home` to `~`. A `try`/`catch` wraps `realpathSync`. On an error the list has no real path. An optional fourth argument gives the real path, so a unit test can pin the macOS case of `/tmp` and `/private/tmp`.
  - It replaces the longest path first. On a tie of length, the root goes before the home. So a root inside the home gives `.`, and `/private/tmp/x` goes before `/tmp/x`.
  - A match counts only at the start of the text or after a character that is not a letter, a digit, `.`, `_`, or `-`. So `/private/tmp/x/a` never becomes `/private./a`.
  - A match counts only when the next character is not a letter, a digit, `.`, `_`, or `-`. So `<root>2` stays as it is.
  - It skips a root or home of `/` or the empty string.
  - Windows paths are out of scope. Verify runs through `sh`.
  - `home` is `os.homedir()`, read at call time, so a test sets `HOME`.
  - `src/cli/workflow.ts` applies it to the tail before `writeFail`, to the tail it passes to `capQuestion`, and to `verify.stderr_tail` before `writeEvidence`. The printed output stays as the command wrote it.
  - The output depends only on the text, the root, and the home. Stale detection reads only `files` (`staleFiles` in `src/check/evidence.ts`), so it does not change.
- D6 `verify.command` stays as the task line has it. The lead accepted this in question 84. Reasons:
  - `gate --rerun` compares it with the task line and fails `verify-drift` on any difference (REQ-VER-006, `src/gate/rerun.ts` line 151). It then runs the frozen command from the evidence. A redacted command breaks both.
  - The command comes from `tasks.md`, which is in git already. Redaction of the evidence copy hides nothing.
  - Only one live evidence file has a path in its command, `.ctx/evidence/009/1.1.json`, copied from its task line.
- D7 Success evidence keeps `verify.stderr_tail`. The lead accepted this in question 84.
  - A grep of `src/` finds no reader of `stderr_tail` in success evidence. `check` reads `files`. `gate --rerun` reads `command`, `exit`, and `cwd`. `stats` reads `at`, `started_at`, and `kind`. `next` reads `stderr_tail` of fail files only.
  - A drop would MODIFY REQ-TASK-004 and change `tests/tasks/evidence.test.ts` (the key list at line 39, `warn` at line 42, and the 20 line case at line 61).
  - The tail is the only readable record of a pass. With D5 it holds no machine path.
  - The tail can hold run times, so two runs can differ in it today. That does not touch stale detection.
- D8 Committed evidence stays as it is. A rewrite changes no digest in `files`, but it adds churn to 30 or more files for no gain. New runs write redacted evidence.
- D9 Tests and goldens.
  - No parity golden and no help golden changes. `tests/parity/run.sh` runs no `task done`. No help text changes.
  - `tests/loop/fails.test.ts` SCN-LOOP-002-3 says no `current.json` counts all. Task 1.1 renames it and asserts the new window.
  - `tests/tasks/evidence.test.ts` and `tests/tasks/done.test.ts` assert the evidence shape and the fail file keys. The shape does not change. `src/tasks/evidence.ts` changes only in task 1.1, for D4. Its test goes in `tests/loop/window.test.ts`.
  - `tests/stats/metrics.test.ts` writes evidence by hand, so the change to `writeEvidence` does not touch it. It runs in the Verify of task 1.1.
  - `tests/gov/governance.test.ts` copies `.ctx/evidence`. A `.gitignore` there is not a `.json` file, so `listEvidence` and `stats` skip it.

## Risks / Trade-offs

- When `writeFail` cannot write `current.json`, it falls back to the old count. Fail files from another clone then count again on that machine. The cap question then comes early, which is the bug of today and no worse.

- A failed `task done` now starts a session for its task. `next` then returns `fix` for it, where it returned `start` before. This is the correct action after a failure.
- A failure before plan approval now writes `current.json`, which the plan stop reads as a started change. Only a failed `task done` does this, and the skill runs none before approval.
- A path written in another form, such as a symlink other than the root itself, stays in the tail.
