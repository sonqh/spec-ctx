# Design

## Context

- `bundle()` in `src/graph/bundle.ts` builds blocks in print order. Each block has a class (REQ-QRY-012). A block is its provenance line plus its body. The fill loop adds whole blocks class by class and skips a block that does not fit. A skipped block loses its provenance line too. Its ID goes to the `truncated:` line.
- Class 0 holds requested entries and cited requirements. Their bodies are long. Five of them fill the budget. Code and test lines (class 1) are one line each and still get skipped.
- `scan.ts` records `paths` of a task only when the change is active (REQ-IDX-009). `fileEdges` in `src/graph/files.ts` reads them for `context <file>`. `bundle` never reads them.
- Today `context <task>` for a task with no citation prints the task, then the deltas and designs of its change. Each reason reads `delta in change of <task>`. No line says that the task has no citation. ADR-008 item 4 asks for a label.
- Baseline of the index on 2026-11-06: `.ctx/index.json` is 2,282,557 bytes for 3,315 entries. `build` takes 0.25 s. `context 045/1.1` takes 0.10 s. 239 of 285 archived tasks name at least one path, about 25 KB of new `paths` data.

## Goals / Non-Goals

**Goals:**
- Every depth 1 entry shows its ID, file, line, and reason at any budget that can hold the cards.
- A task bundle holds the files that the task text names.
- A card without a body says so on its own line.

**Non-Goals:**
- A change of the walk, the depth rule, or the print order.
- A better ranking of bodies. Bodies keep the classes of REQ-QRY-012.
- A claim that the targets are met. The record reports the misses that remain.

## Decisions

- D1 Cards before bodies. The fill has five steps. Each runs in print order inside its class. (a) The cards of class 0 that are not pinned. (b) The cards of class 1. (c) The bodies of class 0. (d) The cards of class 2. (e) The bodies of class 2. Then class 3 fills as a whole block, as today. The pinned blocks of REQ-QRY-018 print first with their bodies, and count toward the budget. A card that does not fit goes to `truncated:`. Each block has one state: none, card, or full. The fill sets the state. The output renders the blocks in print order from that state. No second array holds the cards. Step (b) runs before step (c) because cited bodies are long. This is the fix for cause 1. Refs: REQ-QRY-020, REQ-QRY-012
- D2 The marker. A card whose body did not fit ends with ` | body omitted`. A code, test, cap, or change entry has no body, so it never gets the marker. The fill charges the marker when it reserves a card and removes it when the body fits. So `chars` and the `over budget:` line agree. A body that prints ends with a blank line, as today. A card alone ends with its newline. `parseProvenance` and the `headers()` function of `scripts/recall.mjs` split on ` | `, so they still read the first two fields. Refs: REQ-QRY-020
- D3 The trailer and the fields. `omitted` and the `truncated:` line list only entries that lost their card: class 3 entries and cards that did not fit. A new JSON field `body_omitted` lists the IDs that carry the marker, in print order. `complete` is true only when both lists are empty. This is stricter than "every depth 1 entry has its body". A lost class 3 entry also makes the answer incomplete (ADR-008 item 5). The journal signal `truncated-context` follows `complete`, so it fires on a marker too. `--block` keeps `complete: true` and empty lists. Refs: REQ-QRY-014, REQ-QRY-019
- D4 Named paths. For a requested task at depth 1 or more, `bundle` takes the `paths` of the task entry. It keeps a path only when it is a file under the root and no code or test line of the output has that file. Each kept path is a card `-- <path> | <path> | active | named by <task>` in class 1. These cards print after the `implements` and `covers` lines, in `paths` order. Step (b) runs in print order, so the tagged lines win the budget over the named paths. The check for a line that exists runs on the block list, not on the kept set. So a path whose tagged line lost its card prints no second card. A named path card that does not fit is in `omitted`. The path has no line number, because the task names the file and not a line. Refs: REQ-QRY-021
- D5 Paths for every task. `scan.ts` drops the rule `status === "archived" ? []`. The benchmark labels archived tasks, so the result then shows the gain. The cost is about 25 KB of 2.28 MB. The record of task 5.1 measures size and build time again. `fileEdges` keeps the REQ-QRY-006 rule that `mentions` come from active tasks only. It skips a task whose file is under `openspec/changes/archive/`. Without that skip, `context <file>` would list 100 old tasks. Refs: REQ-IDX-009, REQ-QRY-021, REQ-QRY-006
- D6 The label (D3 of the plan). A requested task at depth 1 or more can have `refs` with no requirement that the index holds. The output then gets one line after the pinned blocks of REQ-QRY-018: `note: <task> cites no requirement that the index holds. The blocks come from its change and the paths it names. Add a [REQ-...] citation.` It prints after them so the prefix guarantee of 050/D4 holds. The line is outside the budget, like the trailer lines. `chars` counts it. A request for several tasks prints one note, for the first uncited requested task. The per-block reason needs no code, because `delta in change of <task>` already names the source. Refs: REQ-QRY-022
- D7 The recall report. `scripts/recall.mjs` keeps counting a header line as a match. It also counts the matched labels whose line ends with the marker, and prints `card_only` by kind next to recall. A code or test line has no body, so its `card_only` is 0. The figure matters for requirements. Refs: REQ-STAT-007
- D8 Parity and goldens. `tests/parity/run.sh` runs `bundle REQ-APPLY-001 --budget 3000`. Its `bundle.out` golden has a `truncated:` line with 8 IDs, and it will change. The `index.json` golden changes through D5. Task 1.1 records it. Task 2.1 records `bundle.out`. Task 5.1 notes both in the verification record. No other golden changes, except the help goldens of task 4.1.
- D9 The measure. The last task runs `bash scripts/recall.sh --out docs/metrics --date 2026-11-06`. The run overwrites the baseline files of change 054 with the same date. Task 5.1 first copies them to `docs/metrics/recall-baseline-054.md` and `.json`. The record then holds before and after for recall, recall by kind, `card_only`, median chars, and p95 ms, for both repos. If recall is under 0.95 or 0.90, it names the misses that remain and the cause. `bench/recall/*.json` does not change.

## Risks / Trade-offs

- Cards cost characters. About 50 cards at 110 characters take 5,500 of 8,000. Class 0 bodies then shrink. A cited requirement with no body keeps its marker, and the agent runs `bundle <REQ>`. The record shows the median chars, so the cost is visible.
- A card without a body counts as a match in recall. D7 reports `card_only` so the number does not overstate the answer.
- A task that names many paths adds many class 1 cards. They compete in step (b) in print order. A very long task line can crowd out lines of the cited requirements. The record shows if this happens.
- The named path has no tag, so the card says nothing about what the file does. The reason `named by <task>` says why it is there.
