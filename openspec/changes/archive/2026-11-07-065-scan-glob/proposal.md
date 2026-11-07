# Proposal

## Why

GitHub issue #29. With a `[scan] changes` glob that is not `openspec/changes/**`, the scanner names every change `main`. The name comes from a fixed pattern, `^openspec/changes/(archive/)?([^/]+)/`, in `src/index/scan.ts`. A path that does not match it gets `main`. Two tasks `1.1` in two folders then share the ID `main/1.1`. Queries by change and the `next` loop mix the two changes.

The lead reproduced it on 0.6.0 with `changes = ["work/changes/**/*.md"]` and two folders, `work/changes/a` and `work/changes/b`. Both index entries have the ID `main/1.1`. Two more places parse the same pattern: `src/index/structure.ts` and `src/graph/links.ts`.

## What changes

- A new module, `src/index/changepath.ts`, holds one function that finds the change folder of a path from the `[scan] changes` globs. It returns the folder, the change name, the archive flag, and the archive date.
- `changeOf` in `src/index/scan.ts`, the change entries in `src/index/structure.ts`, and `folderOf` in `src/graph/links.ts` call it. The scanner passes its rules to both scan steps.
- The name comes from the first folder under the fixed prefix of the glob that matched. The `archive/` rule and the date strip stay.
- A new requirement, REQ-IDX-015, states the rule. REQ-IDX-005 stays as it is.
- Tests: a custom glob in `tests/index/`, and a `fileEdges` mention under that glob in `tests/query/file-mentions.test.ts`.
- `docs/reference.md` names the rule next to `[scan]`. `CHANGELOG.md` names #29. `docs/verification/065.md` holds the reproduction before and after.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `index`: ADDED REQ-IDX-015.

## Layer and benefit

- Layer: layer 1, retrieval. It is a bug fix in index correctness. It is item 3.2 of ADR-010.
- Benefit: every ID that `query`, `related`, `bundle`, and `context` return for a custom glob names the right change. Two changes keep two task IDs. `task start`, `next`, and `check` find the right task. The default glob gives the same index as before. The parity goldens stay as they are.

## Out of scope

- `check`, `next`, `gate --rerun`, `status`, and `adopt` still read `openspec/changes` by name. A repo with a custom glob and no `openspec/changes` folder keeps those limits. `design.md` lists them.
- A change to the index format or to the default glob.
