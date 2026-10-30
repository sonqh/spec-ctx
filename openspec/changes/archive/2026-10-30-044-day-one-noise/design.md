# Design

## Context

- `src/index/scan.ts` emits `task-without-req` and `task-without-verify` for every `tasks.md`, archive included. Every other task rule already skips the archive.
- `check` reads these two rules from the scan problems, so one filter in the scan fixes `check` and `index.json` together.
- `next` filters citation findings to the active change. Step 5 of `next` picks any ticked task without evidence and returns `repair`. It does not look at the Verify command. `task done` then fails and asks for `--manual`.
- The cap question that `task done` writes has `task: <task id>` and no stage today. Plan, design, and archive questions use the change folder as `task` and carry a stage.
- ADR-006 item 6 forbids a baseline that grows without a `baseline:` commit.

## Goals / Non-Goals

**Goals:**
- A stranger sees only findings that a person can act on, and `next` never returns a command that cannot succeed.

**Non-Goals:**
- Capability codes in `adopt`, a version bump, stats, and any change to `baseline write`.

## Decisions

- D1 The scan skips `task-without-req` and `task-without-verify` when the file path has `/archive/`, the same test that sets the status of an entry. The task entry itself stays in the index. Refs: REQ-CHK-001
- D2 Step 5 of `decideNext` takes a ticked task only when `parseVerify` of its title gives a command. A ticked task without one falls through. The baseline needs no new read, because step 4 already hides a baselined `task-without-verify` and returns `cite` for the rest. Refs: REQ-LOOP-013
- D3 `QuestionStage` gains `cap`. `task done` writes the attempt-cap question with `stage: "cap"`. `isCapQuestion(q, task)` in `src/loop/fails.ts` is true for an open question whose `task` equals the task ID and whose stage is `cap`. A question with no stage never matches. That keeps a plain `handoff ask` from a person open, and a cap question from 0.4.0 stays for a person to resolve. The function never reads the text, because a reworded string would break it. A change folder in `q.task` has no slash, so a plan, design, or archive question never matches. A passing `task done` calls `resolveQuestion` for each match after the evidence exists. The answer reads `Verify passed. Resolved by task done.` Refs: REQ-LOOP-014
- D4 `applyAdopt` prints two lines after the `adopted` line when `plan.edits` is not empty: a commit note, then `next: <run> baseline write` through `runCommand`. The JSON form stays as it is. `adopt` writes no baseline. Refs: REQ-ADOPT-002, ADR-006
