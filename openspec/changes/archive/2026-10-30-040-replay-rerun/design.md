# Design

## Context

- `specctx gate --rerun --base <ref> --json` prints one JSON document. Each task has an `id` and a `status`. A fatal error has an `error` field.
- The rerun sets `SPECCTX_RERUN` for its children. A replay inside a rerun would hit the guard.

## Goals / Non-Goals

**Goals:**
- Count flaky Verify results over history with the current engine.
- Never write into the repository under test.

**Non-Goals:**
- CI wiring, statistics, and any change to `src/`.

## Decisions

- D1 The script is bash. It uses `node` for JSON, because Node 22 is already a requirement. It creates no file in the source repository except the worktree metadata that `git worktree add` writes, and it removes that in a trap. Refs: REQ-VER-008
- D2 Each commit C gets a detached worktree. The base is `C^1`, so a merge commit compares with its first parent. A root commit is skipped. Refs: REQ-VER-008
- D3 The engine is always `dist/cli.js` of this repository. Old trees are judged by the new engine. Refs: REQ-VER-008
- D4 A task is flaky when its runs give more than one result. A command that fails to run is an error. Errors count apart from flaky results and do not change the exit code. Refs: REQ-VER-008
- D5 The requirement goes in `verify-runner`, next to the rerun it measures. Refs: REQ-VER-007
