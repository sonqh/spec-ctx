# ADR-007 Query first: a light script over the IDs

Status: accepted. Date: 2026-10-30. It replaces the goal and the order of work of ADR-006.

## Context

The owner's goal for spec-ctx: query the specs and the context that relate to each other in a repository built with OpenSpec. An agent or a developer asks what relates to a task, a requirement, a file, or a change. spec-ctx answers with the linked requirements, scenarios, decisions, tasks, code, and tests. It follows the IDs that `init` and `adopt` wrote. It does not dump text by similarity.

ADR-006 set a closed loop as the goal. None of its decision items and none of its phases is about query. The product review of 2026-10-28 said that users do not hire spec-ctx for IDs or bundles. The work from 0.2.0 to 0.4.0 followed ADR-006. On 2026-10-30 the team archived 12 changes. One item made query better (`bundle --block`). The rest went to the loop, Verify, the gate, and the GitHub Action.

A product review on 2026-10-30 measured the query surface.

- The index records 5 edge kinds: scenario of a requirement, `Refs:`, task citation, code tag, and test `Covers:` tag.
- `related` and `bundle` answer for an ID or a task. There is no lookup by file.
- Recall is not measured. For REQ-LOOP-001 the default budget cut all 6 code files and all 5 test files.
- On an OpenSpec project not built for spec-ctx, the only edge is scenario to requirement. A task bundle held 247 characters.
- Upstream PR Fission-AI/OpenSpec#1979 reads IDs like `[AUTH-3]`. It leaves test coverage and overlap between changes out of scope.

## Decision

1. spec-ctx is a light query script over the IDs in an OpenSpec repository. It is a CLI that reads files and `.ctx/index.json`. No MCP server and no server of any kind. No LLM call and no embeddings. ADR-003 stays in force.
2. The headline is query: `query`, `related`, `bundle`, and the planned `context <task|ID|file|change>`. The README and the docs lead with them.
3. Tasks, Verify, evidence, and `check` keep the links true. They stay as support for query, not as the headline.
4. The loop (`next`, the `specctx-run` skill), the gate, the baseline, the Action rerun, and the replay script are frozen. They get bug fixes only.
5. The team adjusts the work of 0.2.0 to 0.4.0 to serve query. It does not remove it.
   - Evidence files list the files of each task. They become a source of edges from a file to its tasks.
   - The ID diff of `gate --rerun` between a base and HEAD becomes a query of what changed since a ref.
   - The delta rules of `check` and the `Covers:` parser keep the edges that query follows.
   - The `[cli] run` prefix makes every printed query command runnable.
   - The worktree loop of `scripts/replay-rerun.sh` can run a recall benchmark over commits.
6. Proof. A benchmark with hand-labelled queries on this repository and on one external OpenSpec repository. It reports recall within the budget, size, and p95 time. The targets for 30 days:
   - recall 0.95 on this repository within 8,000 characters
   - recall 0.9 on the external repository with no hand tags
   - p95 under 200 ms
7. Every change says in its proposal how it makes query better or how it keeps the links true.

## Order of work

1. Lookup by file, from code tags, evidence files, and paths that tasks name.
2. Edges that OpenSpec already implies, and a budget that keeps code and tests. The edges:
   - a task to the deltas of its change
   - a delta to its capability, and a change to its capabilities
   - a task to the design decisions that it names
3. One front door, `specctx context`, and a query of what changed since a ref.
4. The benchmark.
5. Readable capability codes in `adopt`.
6. The upstream ID grammar when #1979 has a decision.

## What stays from ADR-006

Its decision items 1 to 11 stay in force as rules. They cover one truth per fact, the closed action enum, the closed bypasses, no fork, and the pinned OpenSpec. This ADR replaces its goal sentence and its order of work.

Refs: ADR-002, ADR-003, ADR-004, ADR-006
