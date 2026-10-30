## MODIFIED Requirements

### Requirement: REQ-IDX-004 Stale detection and speed
Every command except `build` SHALL compare the `scanned` record with a fresh stat walk of the scan paths, and with the index mtime by REQ-IDX-014. On a mismatch, a stale index, or no index it SHALL rebuild, print `index rebuilt` on stderr, then answer. The walk SHALL not read file contents. `build` SHALL finish under 1 s on a fixture of 2,000 files on Node 22.

Refs: ADR-003, REQ-IDX-014

#### Scenario: SCN-IDX-004-1 Edited spec
- **WHEN** a spec file changes after `build` and `specctx query x` runs
- **THEN** stderr contains `index rebuilt` and the answer reflects the edit

#### Scenario: SCN-IDX-004-2 Fresh index is silent
- **WHEN** nothing changed since `build`
- **THEN** `specctx query x` prints nothing on stderr

#### Scenario: SCN-IDX-004-3 Speed
- **WHEN** `specctx build` runs on the 2,000 file perf fixture with Node 22
- **THEN** wall time is under 1 s

#### Scenario: SCN-IDX-004-4 Two writes in one clock tick
- **WHEN** a file is written, `build` runs, and the file is written again with no pause, 30 times on fresh projects
- **THEN** every `specctx task start` after the second write reads the second text

## ADDED Requirements

### Requirement: REQ-IDX-014 Index clock
`build` SHALL read the file system clock (T0) before its walk, with a temp file in `.ctx/` that it creates, stats, and deletes. The walk SHALL skip `.ctx`. `build` SHALL set the mtime of `.ctx/index.json` to T0 and add no field to the index. A load SHALL treat the index as stale when the newest mtime is not older than the index mtime. If the newest mtime is 0 to 50 ms after T0, `build` SHALL wait until the file clock passes it, then take T0 again.

Refs: REQ-IDX-004, ADR-003

#### Scenario: SCN-IDX-014-1 Index mtime and bytes
- **WHEN** `build` runs twice on one tree
- **THEN** the two `index.json` files are byte-identical and the index has no new field. Its mtime is at or before the mtime of the first write after the build

#### Scenario: SCN-IDX-014-2 Edit during the build
- **WHEN** the newest file of the tree has an mtime at or after the index mtime, as after an edit while `build` ran
- **THEN** the next `specctx query x` prints `index rebuilt` on stderr, and a second query prints nothing

#### Scenario: SCN-IDX-014-3 Restored mtimes
- **WHEN** a file is restored with an old mtime and the file count stays the same
- **THEN** the load does not rebuild, and a changed count still does


#### Scenario: SCN-IDX-014-4 Index mtime is the reading of the build
- **WHEN** `build` runs on a tree whose files are older than the clock
- **THEN** the mtime of `.ctx/index.json` is a whole millisecond between two file clock readings. One reading comes before the build and one after. `setMtimeMs` then `mtimeMsOf` returns the same value

#### Scenario: SCN-IDX-014-5 A file just after the clock
- **WHEN** a file is dated 10 ms after the file clock, `build` runs, and `specctx query x` runs
- **THEN** stderr does not contain `index rebuilt`
