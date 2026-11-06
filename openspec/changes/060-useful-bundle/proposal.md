# Proposal

## Why

The recall benchmark of change 054 measured `context <task>` within 8,000 characters. The result is far from the targets of ADR-008.

- This repo: recall 0.70 (requirements 0.91, code 0.57, tests 0.47). Target 0.95.
- The frozen fixture `sonqh/OpenSpec-spec-ctx`: recall 0.34, all of it requirements. Target 0.90.

Two causes explain most misses.

- Budget packing. A requested or cited requirement is class 0 and prints its full body. Five cited requirements fill 8,000 characters. The code and test lines of class 1 are one line each, but the bodies take all of the budget. Dropped entries go into one `truncated:` line that carries no file, no line, and no reason. On the fixture, 14 delta requirements of one change cannot fit, and 12 of them vanish into that line.
- Task paths. The index records the backtick paths of a task only for active tasks. They serve only `context <file>`. They never reach the bundle of the task itself. Most code and test misses on this repo are files that the task text names, such as `src/cli/commands.ts` for task 045/1.1.

## What changes

- Cards before bodies. Every entry of class 0, 1, and 2 prints its one-line provenance card before any body that is not requested. Bodies fill the rest of the budget class by class. An entry whose body does not fit keeps its card, with the marker `| body omitted`. The agent sees the ID and the location, and can run `bundle <ID>`.
- The `truncated:` line names only entries that lost their card. `--json` gets a `body_omitted` list. `complete` is true only when `omitted` and `body_omitted` are both empty.
- Named paths feed the bundle. A task entry's `paths` become class 1 cards with the reason `named by <task>`. The index records `paths` for archived tasks too. `related <file>` still lists only active tasks as `mentions`.
- A label. A task with no citation that the index holds gets a first line `note: ...`. The per-block reason `delta in change of <task>` already says where each block comes from. It does not say that the task has no citation.
- The recall report counts `card_only` matches, so a card without a body is never counted as a full answer.
- A measured result in `docs/verification/060.md`: recall, p95, and median chars, before and after, on both repos.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `query`: ADDED REQ-QRY-020 (cards before bodies), REQ-QRY-021 (task named paths), REQ-QRY-022 (uncited task label). MODIFIED REQ-QRY-003, REQ-QRY-012, REQ-QRY-014, and REQ-QRY-019, which state the old trailer and `complete` rules.
- `index`: MODIFIED REQ-IDX-009. A task of an archived change records its paths too.
- `metrics`: ADDED REQ-STAT-007 (`card_only` in the recall report).

## Layer and benefit

- Layer: layer 1, retrieval. It is item 4 of the order of work in ADR-008, and it serves the recall targets of ADR-007 item 6.
- Benefit: `context <task>` and `task start` keep every code, test, and neighbor entry of a task visible by ID and location, instead of dropping them under long bodies. The skills get the same answer, because `task start` prints `context <task>`. An agent that sees a card with `| body omitted` knows what it lacks. This follows ADR-008 item 5: an answer never looks more complete than it is.
- The change adds no dependency, no server, no LLM call, and no cache. The output stays a pure function of the files.

## Out of scope

- A change to `bench/recall/*.json`. The labels stay frozen.
- Tags for the fixture tests glob (`test/` against `tests/**`). That is a separate fix.
- A scan of `scripts/` in this repo.
- A new `context` flag.
