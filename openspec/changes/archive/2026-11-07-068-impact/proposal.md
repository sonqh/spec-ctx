## Why

An agent that edits a file asks three things. Which requirements does this file touch? Which tasks cite them, and is their proof still true? Which commands prove my edit? Today it needs `related <file>`, then a read of each `tasks.md` for the Verify lines, then `context <task>` for each evidence state. ADR-010 item 3.5 names the answer: `impact <file>`.

`related <file>` lists every neighbor to a depth. For `src/graph/bundle.ts` it prints 39 requirements, 77 scenarios, 51 decisions, and 34 tasks in one flat list. It has no evidence state and no Verify command. `impact` keeps only the direct edges, the tasks, and the commands.

## What Changes

- New command `specctx impact <file>` (REQ-QRY-028, REQ-QRY-029, REQ-QRY-030). It prints the requirements the file touches, by tag and by task line, each with its reason. It prints the active tasks that cite them, each with its state (`fresh`, `stale since <path>`, `no evidence`). It prints the union of `Verify:` commands once each, in a stable order. `--json` prints the same facts.
- The plan holds the Verify commands of archived tasks too. It drops a command that names a missing file. It shows 10 commands and `--all` shows the rest. `--archived` lists the archived tasks. A file with no edge prints `no links: <path>` and exits 0. A bad path exits 2, as `related` does.
- New help page, in Strict STE mode. The two help goldens gain only the `impact` lines.

## Layer and benefit

Layer 1, retrieval (ADR-007 item 2 and item 7). It adds a lookup by file that answers what to run. It uses the edges of `fileEdges`, the labels of `trust.ts`, and the evidence rule of change 066. No new index field. The agent acts on one output and reads no `tasks.md` by hand. The skills can print the plan before an edit.

## Planned measure

Five files that recent changes edited: `src/graph/bundle.ts`, `src/tasks/evidence.ts`, `src/stats/write.ts`, `src/index/scan.ts`, `src/check/check.ts`. For each file, count the requirements, tasks, and Verify commands that `impact` prints, and the commands that the filter drops. Run the default plan of each file and record the exit code of each command and that none names a missing file. Measure the plan size and the p95 time for `src/graph/bundle.ts`. Count the commands an agent needs today for the same facts. They are one `related`, one read of each `tasks.md` that holds a listed task, and one `context` for each state. Record the wall time of each. The result goes in `docs/verification/068.md`. A first count of `related` on the five files: 9 to 34 tasks across 5 to 15 changes each.

## Out of scope

- No new index field and no cache.
- No impact of an ID, a task, or a change. `context` and `related` do those.
- No run of the plan. `impact` prints commands and runs none.
