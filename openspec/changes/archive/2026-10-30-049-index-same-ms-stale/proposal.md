# Proposal

## Why

Any command can answer from a stale index. This is a layer 1 defect. The cause came from a flaky test, `tests/cli/run-prefix.test.ts` scenario SCN-CLI-010-2. It failed three times in recent changes and once in `bun run ci:local`.

The freshness check of REQ-IDX-004 compares the file count and the newest mtime in whole milliseconds. The kernel stamps a write with a coarse clock. A write, a build, and a second write can share one tick. Then the second write leaves the count and the newest mtime unchanged, and `query`, `related`, `bundle`, and `task start` answer from the old index. The planning probe of 3,000 write, check, write sequences gave 73 stale reads, 2.4 percent. A re-run on the old engine gave 0 in 1,000. The rate depends on the clock tick against the speed of the engine. The real "before" evidence is the forced-mtime test. A rewrite with the mtime of the first write, 60 s ahead, reads the old index on the old engine. The record shows all three. Change 027 fixed the same defect in one test by hand. A fix in the test helper would hide it, and a real agent that edits a file just after `build` would still get a wrong answer.

## What changes

- `build` reads the file system clock before its walk, with a temp file in `.ctx/` that it creates, stats, and deletes. After it writes `.ctx/index.json`, it sets the mtime of that file to the reading. The index gets no new field. It stays byte-identical and the parity golden stays.
- A load treats the index as stale when the newest mtime of the walk is not older than the mtime of `index.json`. This also covers a file edited while the build ran.
- `build` takes no rebuild rounds. After its stat walk, the newest mtime can sit 0 to 50 ms after T0. Then it calls `pause(2)` in a loop until the file clock passes that mtime. A cap of 100 ms ends the loop. Then it takes T0 again and builds once. A file far after the clock, such as one dated in the future, gets no wait. The logic never mixes `Date.now()` with the file clock.
- If the clock file cannot be read, T0 is `Date.now() - 1000`. An earlier T0 can only cause an extra rebuild, never a missed edit.
- The engine walk skips `.ctx`, as it skips `node_modules` and `.git`. The clock file and `index.json` are never scanned.
- The walk stays stat-only.
- Known limits. Files restored with old mtimes (`tar`, `cp -p`, `rsync -a`) change only the count. File systems that store mtime to 1 or 2 seconds (HFS+, FAT) can rebuild once on a command right after `build`.
- Spec: a MODIFIED REQ-IDX-004 with a new scenario SCN-IDX-004-4, and a new REQ-IDX-014 for the clock rule.
- Tests: `tests/index/same-tick.test.ts`. The test helper stays as it is.
- Measure in `docs/verification/049.md`: the three before-measures and the stale-read rate after. Also the build time with the pre-wait and the query time, before and after, against the ADR-007 speed notes.

## Layers and benefit

- Layer 1, retrieval. Every answer of `query`, `related`, `bundle`, `context`, and `task start` comes from the index. The change removes a window where that answer is wrong.
- It also ends the flaky test, so the `rerun` job of the pull request and `gate --rerun` stop turning red for no cause.

## Out of scope

- A hash of file contents. The walk must not read contents (REQ-IDX-004).
- Other features and a version bump.
