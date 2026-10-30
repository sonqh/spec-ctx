# Design

## Context

- `lastGate` in `src/loop/next.ts` reads the last line of `.ctx/gate-log.jsonl`. `gate --rerun` writes a line with `steps: ["rerun"]` and `ok: true` on a pass.
- `stageOf` gives `plan` to every `handoff ask --change` question before all tasks are done. The plan stop skips on any such question.
- `tasksAt` runs `git ls-tree` without `-z`. Git quotes non-ASCII paths then.

## Goals / Non-Goals

**Goals:**
- Fix the eight review findings, each with a test.

**Non-Goals:**
- A version bump, stats, and new commands.

## Decisions

- D1 `lastGate` takes the last line whose `steps` is not exactly `["rerun"]`. A rerun line is a different check, so it never counts as the gate. Refs: REQ-LOOP-011
- D2 The plan approval carries an explicit marker. `handoff ask --change <c> --plan` stores `stage: plan`. A plain ask before all tasks are done stores `stage: design`. After all tasks are done the stage stays `archive`. The plan stop command that `next` prints carries `--plan`. The text plays no part. The D1 guard of 034 stays. Refs: REQ-LOOP-009, REQ-LOOP-007
- D3 A missing cwd is a `mismatch` with the reason `cwd does not exist: <dir>`. A spawn error from `runVerify` is a `mismatch` for each member of the group, with the error message as the output. Refs: REQ-VER-009
- D4 When the merge base equals HEAD, the rerun prints one line, appends its log line with `ok: true`, and exits 0. With `--json` it prints the usual object with `ok: true`, an empty `tasks` list, and a `warning` key. Refs: REQ-VER-010
- D5 `action/run.sh` allows a rerun only on `pull_request` and `push`. Every other event, including an empty one, gets one line and exit 1. Refs: REQ-DIST-011
- D6 `tasksAt` runs `ls-tree -z` and splits on NUL. Refs: REQ-VER-011
- D7 The human form prints `none` for an empty `tasks` list and joins with a comma and a space. The JSON form stays. Refs: REQ-LOOP-012
- D8 `replay-rerun.sh` adds ` 00:00` to a bare `YYYY-MM-DD` and prints `replay: 0 commits since <date>` to stderr when no commit matches. Refs: REQ-VER-012
