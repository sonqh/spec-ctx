# Proposal

## Why

`context`, `bundle`, and `task start` can drop the thing the agent asked for. A consumer agent on spec-ctx 0.4.1 found it. The fill in `bundle()` is greedy. It skips a block that does not fit and goes on. A requested block that is longer than the budget drops, while small neighbor blocks still fit.

Repro: a spec with one long REQ-TEST-001, then `specctx context REQ-TEST-001 --budget 100`. The output holds only `cap/example` and `truncated: 1 entries omitted: REQ-TEST-001`. It exits 0. The agent gets the neighbors, not the input.

`--json` gives `{ text, omitted }` only. An agent must parse text to know if the answer is whole.

## What changes

- A block with the reason `requested` always prints, over the budget too. That is each requested ID, and the task line of a task input. These blocks count toward the budget.
- The main version of a requested ID also always prints (050/D3). Then no requested ID is ever in the omitted list.
- All other blocks keep the class rules of REQ-QRY-012 and REQ-QRY-016. The print order does not change.
- When the kept blocks pass the budget, one line follows the `truncated:` line: `over budget: <chars> of <budget> characters`.
- `bundle --json` and `context --json` add `chars`, `budget`, and `complete`. `text` and `omitted` stay as they are. `task start --json` gets the same fields inside `bundle`.
- When everything fits, the text output is byte-identical to 0.4.1.
- Specs: new REQ-QRY-018 and REQ-QRY-019. MODIFIED REQ-QRY-003, REQ-QRY-012, REQ-QRY-014, and REQ-QRY-015.
- Docs: README, help text of `--budget`, help goldens, and CHANGELOG.

## Layers and benefit

- Layer 1, retrieval. The recall of `context`, `bundle`, and `task start` for the input itself becomes 1.0. This serves the recall target of ADR-007.
- Layer 2 gets it for free. `task start` prints `context <task>`, so the skills always see the task line.
- The JSON fields let an agent check completeness with no text parse.

## Out of scope

- A hard limit that counts the `truncated:` and `over budget:` lines.
- New budget classes or a change to the depth walk.
- The deferred notice of `check --strict`. That is the next change.
- A version bump or a release.
