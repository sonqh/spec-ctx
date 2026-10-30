# Proposal

## Why

`related` and `bundle` miss links that the OpenSpec folder structure already implies. Measured on 2026-10-30:

- The bundle of REQ-LOOP-001 lost all 6 code files and all 5 test files at the default budget.
- The bundle of task 044/1.1 lacked the delta specs of its own change.
- On an external OpenSpec project with no tags, a task bundle held only the task line (257 characters).

## How this makes query better

Layer 1, retrieval. ADR-007 item 2 of the order of work.

- A task reaches the delta requirements and scenarios of its own change, and the design decisions that its line names.
- A requirement reaches its capability. A capability reaches its requirements when it is the start. A change reaches its deltas and its capabilities.
- A modified requirement shows its main version beside the delta.
- The budget keeps code and test lines. They cost one line each. They go before archived decisions and before entries from depth 2.
- `related` and `bundle` take a change key or folder name.
- Every edge comes from the folder structure or from an ID in the text. A repository with no tags still gets them. Every edge has its own reason string.
- One truth per fact (ADR-006 item 1). The index stores only the entries and the design links of tasks. `src/graph/links.ts` derives the other edges at query time.

## What Changes

- `build` writes `change` and `cap` entries, one `change/<key>` per key. It adds a `links` list of design decisions to task entries.
- `related` and `bundle` derive the structural edges and print a reason for each.
- `bundle` picks what to omit by class. The print order does not change.
- Plain `query` hides the new entries, so the top 20 of existing queries stay the same.

Out of scope:

- `specctx context`.
- The benchmark.
- The upstream `[AUTH-3]` ID grammar.
- Layer 2, including `task start`. It keeps its bundle of the cited requirements.
- A performance fix. A compile-cache change follows this change.
- A version bump.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `index`: REQ-IDX-010, REQ-IDX-012, and REQ-IDX-013 added.
- `query`: REQ-QRY-009 to REQ-QRY-014 added.

## Impact

- `src/index/types.ts`, `src/index/structure.ts`, `src/index/build.ts`, `src/graph/related.ts`, `src/graph/links.ts`, `src/graph/bundle.ts`, `src/graph/query.ts`, `src/graph/path.ts`, `src/cli/commands.ts`, `src/cli/help.ts`.
- The parity goldens and the help goldens change.
- `README.md`, `CHANGELOG.md`, `docs/verification/046.md`.
