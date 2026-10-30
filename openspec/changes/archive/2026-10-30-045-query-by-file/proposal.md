# Proposal

## Why

A developer or agent about to edit a file cannot ask what that file relates to. `related src/graph/bundle.ts` exits 2 with "unknown id". ADR-007 sets query as the product, and lookup by file is item 1 of its order of work.

## How this makes query better

- `related` and `bundle` start from a file as well as from an ID. The question "what relates to the file I am about to edit" gets an answer.
- The answer lists requirements, scenarios, tasks, and decisions. Each line has a reason. A reader sees how strong the link is: a code tag, a `Covers:` tag, or a path in a task line.
- The code tag scan reads every REQ ID on a tag line, not only the first. Today a line with two IDs hides the second link. That is a bug in the links that query follows.

## What Changes

- `related <path>` and `bundle <path>` accept a repository path where they accept an ID.
- Three edge sources: `implements`, `covers`, and `mentions`.
- The index records the paths that a task line of an active change names in backticks. The code tag scan reads every REQ ID on the line.
- Every edge comes from the index. A query reads no evidence.
- A path outside the repository or a missing file exits 2 with one line. A file with no links prints that and exits 0.
- A README subsection shows `related <path>` with real output.

Out of scope:

- `specctx context`.
- Budget order.
- Structural edges from changes.
- The benchmark.
- MCP.
- A version bump.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `index`: REQ-IDX-008 and REQ-IDX-009 added.
- `query`: REQ-QRY-005, REQ-QRY-006, and REQ-QRY-008 added.

## Impact

- `src/index/scan.ts`, `src/index/types.ts`, `src/graph/files.ts`, `src/graph/related.ts`, `src/graph/bundle.ts`, `src/cli/commands.ts`, `src/cli/help.ts`.
- The parity golden `index.json` and the help goldens change.
- `README.md`, `CHANGELOG.md`, `docs/verification/045.md`.
