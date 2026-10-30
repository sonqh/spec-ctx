# Design

## Context

- `scannedOf()` in `src/index/scan.ts` records the file count and the newest mtime in milliseconds. `loadIndex()` in `src/index/build.ts` rebuilds when either differs from a fresh walk.
- Two writes in one clock tick share an mtime. A rewrite between two commands leaves both values unchanged, so the load keeps the old index.
- The build stats the files after it reads their contents. A file edited during the build can have an mtime that is newer than its text.

## Goals / Non-Goals

**Goals:**
- Every write after a build is visible to the next command.
- A quiet tree stays silent (SCN-IDX-004-2).
- The index bytes do not change.

**Non-Goals:**
- A content hash, a daemon, or a change to the test helper.

## Decisions

- D1 Layer 1. The fix goes in the engine, not in the test helper. A test helper would hide a defect that a real agent meets after `build`. Refs: ADR-007, REQ-IDX-004
- D2 The clock is the file system clock, not `Date.now()`. A write gets its mtime from a coarse clock that can lag behind `Date.now()`. `fsNowMs()` in the new `src/index/clock.ts` unlinks any old temp file in `.ctx/`, opens a new one with flag `wx`, stats it, and deletes it in its own try. If the clock cannot be read, it returns `Date.now() - 1000`. An earlier T0 can only cause an extra rebuild, never a missed edit. `build` reads T0 before the walk, sets the mtime of `.ctx/index.json` to it with `utimesSync`, and writes no field to the index. `build` adds half a millisecond to the value that `utimesSync` takes, so the stored whole millisecond keeps. Refs: REQ-IDX-014
- D3 A load is stale in three cases. The file count differs. The newest mtime differs. The newest mtime is not older than the mtime of `index.json`. A write at or after T0, in its tick or during the build, has an mtime at or after it. Refs: REQ-IDX-004, REQ-IDX-014
- D4 A quiet tree must read as fresh, with no rebuild rounds. After the stat walk, the newest mtime can sit at or after T0 and at most 50 ms after it. Then `build` calls `pause(2)` in a loop. `pause` uses `Atomics.wait`. The loop ends when `fsNowMs()` is greater than that mtime, or after 100 ms. Then it takes T0 again and builds once. A file dated far ahead gets no wait. A tree with such a file rebuilds on every command. That is the cost of the rule, and it keeps the answer true. The logic never mixes `Date.now()` with the file clock. Refs: REQ-IDX-014
- D5 Known limits. A file restored with an old mtime (`tar`, `cp -p`, `rsync -a`) has an mtime below the index mtime, so only the count sees it. A file system that stores mtime to 1 or 2 seconds (HFS+, FAT) can rebuild once on a command right after `build`. Refs: REQ-IDX-014
- D6 The walk skips `.ctx`, as it skips `node_modules` and `.git`. The clock file and `index.json` are never scanned. Refs: REQ-IDX-014
- D7 The requirement REQ-IDX-004 changes by one clause that points to REQ-IDX-014. Refs: REQ-IDX-004
