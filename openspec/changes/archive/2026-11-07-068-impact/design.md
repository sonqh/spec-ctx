# Design

## Context

- `fileEdges` in `src/graph/files.ts` gives the direct links of a path: code tags, `Covers:` tags, and active task lines that name it.
- `Trust` in `src/graph/trust.ts` gives `taskState` and `reqState`. Evidence staleness follows the files rule of change 066.
- `resolveFileInput` in `src/graph/path.ts` refuses a missing file, a directory, and a path outside the root.
- `related <file>` walks from the edges to a depth and prints every neighbor in one list. `context <file>` prints bodies in a budget.

## Goals / Non-Goals

**Goals:**
- One output with the requirements, the tasks with states, and the Verify plan.
- The same files give the same output.

**Non-Goals:**
- A new index field. A run of the plan. Impact of an ID or a change.

## What impact adds over related

- It stops at the direct edges. `related` adds scenarios, decisions, capabilities, and neighbors of neighbors.
- It adds the evidence state of each task and the `verified` label of each requirement. `related` has none.
- It adds the Verify union. `related` has no Verify text.
- It gives a plan to a file that only a task line names. The task line counts as an edge.

## Decisions

- D1 Requirements. Take `fileEdges` of the path. Its order stays: tags, `Covers:` tags, task mentions, each group by ID. An ID of kind `req` stays. The scanner records only REQ IDs from tag lines, so a scenario ID in a tag line adds no edge and no row. A task from a task line adds the requirements it cites, with the reason `task names <path> in <task>`. A requirement keeps its first reason. ADR and decision IDs do not show. Refs: REQ-QRY-028
- D2 Tasks. The list holds each active task that cites a listed requirement or names the file. Tasks come from the deduped map of `Trust`, so an ID with an archived and an active copy counts once. `Trust` gains two public methods, `citing(req)` and `task(id)`, in place of a second map. The order is `cmpStr` of the task ID. Open and done tasks both count. Refs: REQ-QRY-028
- D3 Archived tasks. They stay out of the task list. `--archived` lists them after the active tasks. Their Verify commands join the plan by default. The plan drops a command when a path token of it names no file under the root. The token rule is the one of change 066 in `src/tasks/files.ts`. That file splits the rule into a token function that `verifyFiles` and the new existence check both call. The output ends with `archived: <n> tasks, <m> Verify commands dropped. Use --archived to list the tasks.` when `n` or `m` is above 0. A token that starts with `@`, or that holds `@` after a name, is an npm package spec and no path. It never resolves to a file, so `verifyFiles` records the same files as before. The check also skips a token with a glob, regex, or URL character (`* ? [ ] $ ^ \ : #`) and a token that ends in `.`. It cuts a redirect prefix such as `2>` first. These rules live in the existence check only. Refs: REQ-QRY-028, REQ-QRY-030
- D4 Labels. `Trust.taskState` gives `fresh`, `stale since <path>`, or `no evidence`. `Trust.reqState` gives `verified` or `unverified`. An archived done task reads `fresh`, as in `trust.ts`. Refs: REQ-QRY-029
- D5 Plan. The commands of listed and archived tasks with a command Verify. A manual Verify adds none. The key is the cwd and the command. Commands of active tasks come first. Commands that only archived tasks hold follow. Each group runs in code point order of the command, then the cwd. The default shows 10 entries, then the line `<n> more. Use --all.` `--all` shows every entry. `--json` follows the same cap and adds `more`. Each entry names its tasks in JSON. Refs: REQ-QRY-030
- D6 Errors. The path goes through `resolveFileInput`, so the three errors match `related`. A file with no edge prints `no links: <path>`, exit 0, as `related` does. An edge that leads to no requirement and no task prints the empty sections. Refs: REQ-QRY-029
- D7 Output. Text has the header `impact <path>`, then `requirements (<n>)`, `tasks (<n>)`, `verify (<n>)`, each with two space indented lines, and the archived line. `--json` prints `file`, `requirements`, `tasks`, `verify`, `more`, and `archived`. Refs: REQ-QRY-029
- D8 Reason class. The reason `task names <path> in <task>` starts with `task names`, which `provenanceClass` already reads as `structural`. No change to `trust.ts` rules or the cards of `context`. A new `named by` prefix would add a class case and move the golden of `bundle`. Refs: REQ-QRY-028
- D9 Speed. One index load, one `fileEdges` call, one `Trust` object. The Verify text comes from the index, because the title of a task entry holds the whole line. `impact` reads no `tasks.md`. The existence check does one `stat` per path token. The target is p95 under 200 ms on this repo. Refs: REQ-QRY-030

## Risks / Trade-offs

- An archived command can still fail for a reason that is no path, such as a flag that changed. The plan lists commands, and the agent decides. The cap of 10 keeps a file with many old tasks short.
- A tag in a test file adds that test's requirements. That is the edge `related` already follows.
