# Design

## Context

- `related` takes an ID and walks the `refs` edges of the index. `bundle` calls `related` for each ID it gets. Neither takes a file.
- The index holds a `code` entry per tag line and a `test` entry per `Covers:` ID. Each has the file and the REQ in `refs`.
- `CODE_TAG` in `src/index/scan.ts` reads the first REQ ID after a comment marker. A line with two IDs loses the second.
- Task entries hold the full task line as `title`.
- ADR-007 puts lookup by file first in the order of work.

## Goals / Non-Goals

**Goals:**
- Ask what relates to a file, and see why each link exists.

**Non-Goals:**
- `specctx context`, budget order, structural edges from changes, the benchmark, MCP, and a version bump.

## Decisions

- D1 `related` and `bundle` test the input as an ID first. When it is not an ID, the input is a path. A new function in `src/graph/files.ts` resolves it against the root, then against the working directory. It takes the real path and checks that the result is a file inside the real root. An ID-shaped input that is unknown (`REQ-`, `SCN-`, `ADR-`, or a task or decision ID) keeps `unknown id`. Any other input that is not a file exits 2 with one line that names it. Refs: ADR-007, REQ-QRY-005, REQ-QRY-008
- D2 All edges come from the index, so `related <path>` is not a scan of the repository. `implements` and `covers` read the `code` and `test` entries for the file. `mentions` reads a new `paths` list on task entries, which `build` fills from the backtick spans of an active task line. Refs: ADR-007, REQ-IDX-009, REQ-QRY-006
- D3 `fileEdges` returns the direct links as ID and reason pairs. The order is `implements`, `covers`, `mentions`, then by ID inside each group. `related` gets them as seeds. The seeds count as the first hop from the file. `--depth` counts hops from the seeds. So the default depth 1 adds scenarios, decisions, tasks that cite the REQ, and refs. In this mode the walk adds no `code` or `test` entry, because the file is the code. Other code and tests of the same REQ stay one `related <REQ>` away. Refs: ADR-007, REQ-QRY-005
- D4 `bundle` gets the same neighbors through `related`. A path has no block of its own, so `bundle` skips the `requested` block for it. The tail keeps the fixed order of REQ-QRY-003. A path with no links adds nothing. The command prints `no links: <path>` when no block exists at all. `bundle --block` rejects a path with `not a requirement`. Refs: REQ-QRY-003, REQ-QRY-004
- D5 The code tag scan finds the first comment marker and REQ ID as before. It then reads every REQ ID to the end of the line, with word boundaries, as the `Covers:` scan does. A `Covers:` line is still not a code tag. A prose line that names a second ID after a tag counts as a tag too. That is the same choice as 042/D4. Refs: REQ-IDX-007, REQ-IDX-008
- D6 The parity golden `index.json` changes, because the fixture holds tag lines with several IDs. Task 1.1 re-records it with `tests/parity/run.sh --record` and the verification record notes it. The help goldens change for the new `<ID|path>` text. Task 3.2 re-records them. Refs: ADR-007
