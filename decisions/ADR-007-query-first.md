# ADR-007 Query first, then the skills

Status: accepted. Date: 2026-10-30. It replaces the goal and the order of work of ADR-006.

## Context

The owner's goal for spec-ctx has two layers, in this order. Layer 1 is a smart, light retrieval of IDs. Layer 2 is the prebuilt skills that automate programming on top of layer 1. For layer 1, an agent queries the specs and the context that relate to each other in a repository built with OpenSpec. An agent or a developer asks what relates to a task, a requirement, a file, or a change. spec-ctx answers with the linked requirements, scenarios, decisions, tasks, code, and tests. It follows the IDs that `init` and `adopt` wrote. It does not dump text by similarity.

ADR-006 set a closed loop as the goal. None of its decision items and none of its phases is about query. The product review of 2026-10-28 said that users do not hire spec-ctx for IDs or bundles. The work from 0.2.0 to 0.4.0 followed ADR-006. On 2026-10-30 the team archived 12 changes. One item made query better (`bundle --block`). The rest went to the loop, Verify, the gate, and the GitHub Action.

A product review on 2026-10-30 measured the query surface.

- The index records 5 edge kinds: scenario of a requirement, `Refs:`, task citation, code tag, and test `Covers:` tag.
- `related` and `bundle` answer for an ID or a task. There is no lookup by file.
- Recall is not measured. For REQ-LOOP-001 the default budget cut all 6 code files and all 5 test files.
- On an OpenSpec project not built for spec-ctx, the only edge is scenario to requirement. A task bundle held 247 characters.
- Upstream PR Fission-AI/OpenSpec#1979 reads IDs like `[AUTH-3]`. It leaves test coverage and overlap between changes out of scope.

## Decision

1. spec-ctx is a light query script over the IDs in an OpenSpec repository. It is a CLI that reads files and `.ctx/index.json`. No MCP server and no server of any kind. No LLM call and no embeddings. ADR-003 stays in force.
2. Layer 1 is the foundation and has priority: `query`, `related`, `bundle`, and the planned `context <task|ID|file|change>`. The README and the docs lead with them. New work goes to layer 1 until the benchmark meets its targets (item 6).
3. Layer 2 is the skills that automate programming: `specctx-run`, `next`, `task start`, `task done`, and the plan and archive stops. Layer 2 stays in the product. A layer 2 change is in scope when it makes the skills use layer 1 better, or when it fixes a bug.
4. Tasks, Verify, evidence, `check`, the gate, and the Action keep the links true. They support both layers. They are not the headline.
5. The team adjusts the work of 0.2.0 to 0.4.0 to serve query. It does not remove it.
   - Evidence files keep the proof that the code and test tags of a task held when its Verify passed. They list the files tagged with the task's requirements, not the files the run touched. So they give no new edge from a file to a task (change 045).
   - The ID diff of `gate --rerun` between a base and HEAD becomes a query of what changed since a ref.
   - The delta rules of `check` and the `Covers:` parser keep the edges that query follows.
   - The `[cli] run` prefix makes every printed query command runnable.
   - The worktree loop of `scripts/replay-rerun.sh` can run a recall benchmark over commits.
6. Proof. A benchmark with hand-labelled queries on this repository and on one external OpenSpec repository. It reports recall within the budget, size, and p95 time. The targets for 30 days:
   - recall 0.95 on this repository within 8,000 characters
   - recall 0.9 on the external repository with no hand tags
   - p95 under 200 ms
7. Every proposal names its layer. It says how it makes retrieval better, how the skills use retrieval better, or how it keeps the links true. The product manager and the architect agents check this at the plan stop (`.claude/agents/`).

## Order of work

1. Lookup by file, from code tags, test tags, and paths that tasks name. Done in change 045.
2. Edges that OpenSpec already implies, and a budget that keeps code and tests. Done in change 046. The edges:
   - a task to the deltas of its change
   - a delta to its capability, and a change to its capabilities
   - a task to the design decisions that it names
3. One front door, `specctx context`, and a query of what changed since a ref. `task start` then prints `context <task>`, so the skills get the same answer. A task must reach the code and test lines of the requirements it cites. Today they sit at depth 2 from the task.
4. The benchmark.
5. Readable capability codes in `adopt`.
6. The upstream ID grammar when #1979 has a decision.

## Speed notes

A trial of the Node compile cache on 2026-10-30 gained about 7 ms at the median, inside the noise of this machine. The team dropped it, because it added a cache folder, an owner check, and two requirements for no measured gain. The profile of one query on this repository:

- Node start, about 44 ms.
- The freshness walk before each query, 25 to 40 ms for 482 files.
- The read and parse of `.ctx/index.json`, 22 to 33 ms for 1.8 MB. The file grows with each change.
- The query itself, 10 to 20 ms.

A later speed change starts with the walk and the index size. It adds no cache of the index and no daemon.

## What stays from ADR-006

Its decision items 1 to 11 stay in force as rules. They cover one truth per fact, the closed action enum, the closed bypasses, no fork, and the pinned OpenSpec. This ADR replaces its goal sentence and its order of work.

Refs: ADR-002, ADR-003, ADR-004, ADR-006
