# Proposal

## Why

ADR-008 item 6 asks for trust labels in every answer. VACIP switched off its context engine because it printed stale text with a "current" label. Today a card says how an entry was reached, in its reason. It never says if the task evidence is fresh, stale, or absent. It never says if a tagged line was verified by a passing Verify. The agent cannot tell which line to act on and which to reread.

## What changes

- Each card gets a fifth column, the provenance class: `declared`, `tagged`, `structural`, or `verified` (REQ-QRY-023). The reason text stays as it is.
- A task card gets a sixth column: `fresh`, `stale since <path>`, or `no evidence` (REQ-QRY-024). It uses `staleOf` from the check code. Archived changes count as fresh, as `check` does.
- A requirement card gets `verified` or `unverified` (REQ-QRY-025).
- `--json` gets `used` and `blocks` with `provenance` and `evidence` per block (REQ-QRY-026). `chars` stays. `used` is the length of the blocks that the budget counts.
- REQ-QRY-020 is MODIFIED. Its card line now starts with the four old columns.
- The first four columns stay. The trust columns come before the `| body omitted` marker. A parser that reads columns 1 to 4 works as before.
- A record in `docs/verification/062.md`: p95 of `context 046/2.1 --budget 8000` over 5 runs before and after, and a recall run on this repo.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `query`: ADDED REQ-QRY-023 to REQ-QRY-026. MODIFIED REQ-QRY-020, whose card sentence names the old line.

## Layer and benefit

- Layer: layer 1, retrieval. It is item 6 of the order of work in ADR-008.
- Benefit: the agent sees at once which lines it can act on (`verified`, `fresh`) and which it must reread (`stale since`, `unverified`, `no evidence`). The answer never looks more current than it is. No dependency, no server, no LLM call, no cache. The output stays a pure function of the files.

## Out of scope

- Pinned invariants, a query log, and `impact` with a verification plan.
- Any change to the gate, `check`, or the loop.
- A change to `bench/recall` or to the labels.
