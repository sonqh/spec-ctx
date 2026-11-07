# Design

## Context

- `provenance()` in `src/graph/bundle.ts` prints `-- <id> | <file>:<line> | <status> | <reason>`. The marker ` | body omitted` is appended after the reason. The named path card builds its own line.
- `staleOf(root, task)` and `staleFiles` in `src/check/evidence.ts` give the stale state. Evidence files hold `files` (path to sha256), `reqs`, and `task`. `check` exempts archived changes.
- Readers of the card line: `scripts/recall.mjs` splits on ` | ` and reads columns 0, 1, 3, and the end marker. `parseProvenance` reads the ID only. Tests read column 0 and the end of the line.
- Tests that assert the reason at the end of a line break, because the reason is no longer last: `tests/query/task-reach.test.ts` (`| implements`, `| covers`, `| ref from`, `| decision for`), `tests/query/requested.test.ts` (`endsWith("| requested")`), `tests/query/bundle.test.ts` (`endsWith("requested")`), and the golden `tests/fixtures/parity-golden/bundle.out`. `tests/query/named-paths.test.ts`, `tests/query/cards.test.ts`, `tests/query/budget.test.ts`, and `tests/query/context.test.ts` read column 0 and must pass unchanged.
- Before: p95 of `context 046/2.1 --budget 8000` over 5 runs is 118 ms (runs 110, 112, 99, 116, 118). The output is 8121 characters and 34 cards.

## Goals / Non-Goals

**Goals:**
- Every card says how it was reached and, for tasks and requirements, what the evidence says.
- No label says "current" or "verified" for a state that `check --strict` reports as stale.

**Non-Goals:**
- Pinned invariants, a query log, `impact` with a plan, a gate change.
- A new evidence format. The files stay as they are.

## Decisions

- D1 Provenance class. A new file `src/graph/trust.ts` exports `provenanceOf(reason, kind, verified)`. The closed set is `declared`, `tagged`, `structural`, `verified`. The reason prefix decides: `requested`, `ref from`, `ref to`, `scenario of`, `decision for`, `task cites`, `named by`, `mentions` give `declared`. `implements`, `covers`, and `tag at` give `tagged`, or `verified` by D1a. `delta in`, `design named in`, `task names`, `capability of`, `requirement in`, `capability touched by`, and `main version of` give `structural`. An unknown prefix gives `declared`. A test lists every entry of `REASONS` so a new reason cannot go unmapped. Refs: REQ-QRY-023
- D1a Verified line. A code or test card with `implements R` or `covers R` is `verified` under two conditions. A done task that cites R lists the file in the `files` of its evidence. The current sha256 of the file equals the recorded one. This is stricter than `check`: it applies to archived tasks too, because a line that changed after the archive must not read as verified. A card with `tag at` is `tagged`. Refs: REQ-QRY-023
- D2 Task state. `evidenceOf(task)` returns `fresh`, `stale since <path>`, or `no evidence`. A task that is not done gives `no evidence`. A done task of an active change calls `staleOf` for the path, and no evidence file gives `no evidence`. A done task of an archived change gives `fresh` when its evidence file exists. It runs no hash, as `check` exempts it. The word `current` appears nowhere. Refs: REQ-QRY-024
- D3 Requirement state. `bundle()` builds one map from requirement ID to citing tasks from the entries, once. A requirement is `verified` when one citing task has `fresh` from D2, with an early stop. Else it is `unverified`. A per-run cache holds the state of each task and the hash of each file, so no file is hashed twice. A main version and a delta copy share the state of their ID. Refs: REQ-QRY-025
- D4 JSON. `BundleResult` gets `used` and `blocks`. `chars` counts `text` with the `note:`, `truncated:`, and `over budget:` lines. `used` is the sum of the rendered blocks, the figure that the budget and the `over budget:` line already use. The two differ whenever one of those lines prints, so `used` is not a copy of `chars`. An agent compares `used` with `budget` to see the fit. `blocks` lists the printed blocks (card or full) in print order: `id`, `file`, `line`, `status`, `reason`, `provenance`, `evidence`. `--block` gives `used` equal to `chars` and `blocks` empty. `task start --json` carries both inside `bundle`. Refs: REQ-QRY-026
- D5 Columns. The card is `-- <id> | <file>:<line> | <status> | <reason> | <provenance>[ | <evidence>][ | body omitted]`. The evidence column prints for task and requirement cards only. The named path card gets `declared`. The first four columns and the `truncated:` and `over budget:` lines do not change. REQ-QRY-020 is MODIFIED so that it says "a line that starts". Refs: REQ-QRY-020
- D6 Cost. Each card grows by about 10 to 25 characters, so the budget holds fewer cards. The benchmark may lose recall. The design accepts a drop only when the recall of this repo stays at or above 0.95. Else the change shortens nothing silently: it stops and asks. The time is measured before and after (118 ms before). The state reads one evidence file per task that the bundle cites, with an early stop. The added time should stay near 10 ms. Refs: REQ-QRY-025
- D7 Agents. `.claude/skills/bootstrap-context/SKILL.md` names the columns. `skills/specctx-run/SKILL.md` gets one rule: act on `verified` and `fresh`, and reread a line marked `stale since`, `unverified`, or `no evidence` with `bundle <ID>`. Refs: REQ-QRY-023

## Risks / Trade-offs

- Existing tests that end a line with the reason change in the task that changes `bundle.ts`. A grep in the plan lists them. A test I missed shows as a failure of that task Verify.
- The recall script reads columns by index and needs no change. A test adds the new columns to its fixed input.
- A stale label can lie only by omission: a code file that changed but is not in any evidence. That line reads `tagged`, never `verified`.
