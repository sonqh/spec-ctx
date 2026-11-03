# Design

## Context

- `bundle()` in `src/graph/bundle.ts` builds a list of blocks in print order. Each block has a budget class from 0 to 3.
- The fill walks the classes in order. It keeps a block when it fits and skips it when it does not. A skipped block of class 0 lets a later block of class 2 fit.
- The `truncated:` line goes after the fill, outside the budget. SCN-QRY-003-1 allows that.
- `bundle --json` and `context --json` print `{ text, omitted }`. `task start --json` prints that object as `bundle`. `bundle --block --json` prints `{ text, omitted: [] }`.
- `omitted` lists an ID, not a block. A requested ID and its main version share one ID. The parity golden shows `REQ-APPLY-005` twice for that reason.

## Goals / Non-Goals

**Goals:**
- The agent always gets the text of what it asked for.
- The output says when it passes the budget.
- An agent can check completeness from the JSON alone.
- When every block fits, the text output stays byte-identical.

**Non-Goals:**
- A hard limit on the output length.
- A change to the budget classes or the depth walk.

## Decisions

- D1 Layer 1. The fix goes in `bundle()`, so `bundle`, `context`, and `task start` get it from one place. Refs: ADR-007, REQ-QRY-018
- D2 The kept set is the blocks that the first loop of `bundle()` pushes for each requested ID. That is the requested block, each copy under `--all`, and the main version. The task line of a task input is its requested block. A path input has no block of its own, so it keeps none. The cited requirements of a task stay in class 0 but can drop. The fill first keeps every block of the kept set and adds its length to `used`. Then it fills classes 0 to 3 with the other blocks, as before. Refs: REQ-QRY-018, REQ-QRY-012, REQ-QRY-016
- D3 The main version of a requested ID is in the kept set. Reasons:
  - `omitted` lists IDs. A dropped main version would put the requested ID in `omitted`, and an agent would read that its input dropped. With the main version kept, no requested ID is ever in `omitted`, and `complete` is true or false with no doubt about the input.
  - The main version is the "before" text of a MODIFIED delta. An agent needs both to see the change.
  - The cost is a longer overrun, at most the length of one more requirement block. The `over budget:` line reports it.
  Refs: REQ-QRY-018, REQ-QRY-014, REQ-QRY-010
- D4 The `over budget:` line is `over budget: <used> of <budget> characters`. `<used>` is the code point length of all kept blocks, without the trailer lines. It differs from the JSON field `chars` of D5, which counts the trailer lines too. It prints only when `used` is greater than the budget. It goes after the `truncated:` line. So the 0.4.1 output stays a prefix, and a reader that looks for `truncated:` right after the blocks still finds it. When `used` passes the budget, every block outside the kept set drops, because each block has a provenance line. Refs: REQ-QRY-018, REQ-QRY-014
- D5 `BundleResult` gains `chars`, `budget`, and `complete`. `chars` is `cpLen(text)` with both trailer lines. `budget` is the budget that `bundle()` got. `complete` is `omitted.length === 0`. It means that no block dropped, not that the text fits. With `complete` true, `chars` greater than `budget` shows an overrun. The keys print sorted, as `dumps` sorts every object. `text` and `omitted` keep their values, so a 0.4.1 reader still works. Refs: REQ-QRY-019, REQ-IDX-002
- D6 `bundle --block --json` prints `budget: null`, `complete: true`, `omitted: []`, and `chars` as `cpLen(text)`. The block mode has no budget, so null says that. Refs: REQ-QRY-019, REQ-QRY-004
- D7 `task start` needs no own code. Its text and its `--json` come from `bundle()`. `bundle_chars` in `.ctx/current.json` stays `cpLen(text)`. Refs: REQ-QRY-018, REQ-QRY-019, REQ-TASK-002
- D8 `schemas/` holds the OpenSpec schema `spec-driven-ids`. It does not describe this output, so it does not change. Refs: REQ-QRY-019
- D9 The parity golden `bundle.out` keeps its bytes. Its requested block fits in 3,000 characters. The help goldens change, because the help of `--budget` changes. `docs/verification/050.md` records the new help goldens. Refs: REQ-QRY-003, REQ-DIST-003
- D10 A requested decision that names another requested ID prints once. Today `bundle 050/D2 REQ-QRY-018` prints `050/D2` twice, as `requested` and as `decision for REQ-QRY-018`. After this change the second copy can drop and put a requested ID in `omitted`. The two decision loops of `bundle()` skip an ID in `wanted`. This changes the 0.4.1 output for that input also when all blocks fit. It removes a duplicate block, so no reader loses text. Refs: REQ-QRY-014, REQ-QRY-016
- D11 `--budget 0` prints the kept set, the `truncated:` line, and the `over budget:` line. A negative `--budget` is a usage error and exits 2 in `bundle` and `context`, with no block. `spec-ctx.toml` already rejects a negative `[bundle] budget`. Refs: REQ-QRY-018, REQ-CLI-001
- D12 A duplicate input, such as one ID given twice, still prints twice, as in 0.4.1. A dedupe is out of scope. Refs: REQ-QRY-003

## Risks / Trade-offs

- An agent that sets a small budget can get a long output. The `over budget:` line and `chars` show it. A caller that needs a hard cap can cut `text` itself.
- `--all` keeps every copy of a requested ID. That is what `--all` asks for.
