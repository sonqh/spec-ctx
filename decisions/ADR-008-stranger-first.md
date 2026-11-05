# ADR-008 A stranger first

Status: accepted. Date: 2026-11-03. The owner accepted it on 2026-11-04. It replaces the order of work of ADR-007. Every decision item of ADR-007 and ADR-006 stays in force. ADR-009 replaces item 4 of the Decision section (the freeze) on 2026-11-05.

## Context

The dogfood run in `docs/dogfood/openspec.md` ends with "Not ready for a stranger yet". The core works. The first run on an existing repo gives no value.

- After `adopt`, 118 open tasks had no `[REQ-...]` and no `Verify:`. `task start` printed an empty bundle.
- The path for an existing project needs 6 commands: `init`, `adopt --dry-run`, `adopt`, `task backfill`, `baseline write`, `gate`.
- 50 CAP codes in the `cli-*` family are hard to read.
- The adopter's `.gitignore` ignored `.claude/`. `init` wrote the skills there and said nothing.

The repo has no stars. The upstream issues Fission-AI/OpenSpec#1967 and #2157 have no maintainer reply. So the product must prove itself on the user's own repo.

Another project, VACIP, switched off its context engine (`scripts/ctx.py`) for agents on 2026-09-27. The engine labelled stale text as "(verbatim, current)". An engine that loses trust once gets switched off. Trust in the output is a product feature.

Change 050 is the first trust item. A requested block always prints, and `--json` reports `chars`, `budget`, and `complete`.

## Decision

1. For 30 days from 2026-11-03, the goal is one thing. A stranger runs spec-ctx on their existing OpenSpec repo. Within 5 minutes they get a useful `context <task>`.
2. The north star is the minutes from `npx spec-ctx init` to the first `context <task>` that holds at least one code or test line. The repo is one that spec-ctx has never seen. The team also counts the commands on that path.
3. The quality targets stay as ADR-007 item 6.
   - recall 0.95 on this repo within 8,000 characters
   - recall 0.9 on an external repo with no hand tags
   - p95 under 200 ms
4. Freeze. No new features for the gate, the linters, the GitHub Action, or the loop actions. Bug fixes only.
5. Every answer says how much to trust it. An answer never looks more complete or more current than it is.

## Order of work

1. A copy and paste block in the README, `## Try it in two minutes`, and `scripts/try.sh`. A test runs the block, so the README stays true.
2. A `deferred:` notice in `check --strict` when an active change still holds open tasks (REQ-CHK-008, REQ-CHK-009). Items 1 and 2 can run in parallel.
3. The recall benchmark of ADR-007 item 6, on this repo and on the frozen fixture `sonqh/OpenSpec-spec-ctx`, branch `spec-ctx-adopt`. It is the measuring stick for items 4 and 6. It merges before them.
4. A useful bundle before any hand tag. A task with no citation falls back to the structural edges of change 046, with a label that says so.
5. One path for an existing project. `init` detects specs with no IDs, prints the adopt plan, and names one next command. It warns when `.gitignore` ignores `.claude/` or `.agents/`. `adopt` stays a separate command.
6. Trust labels in every answer: the provenance of each edge and the evidence state of each task and requirement. `--json` reports `used`.
7. Readable CAP codes in `adopt`, which was item 5 of ADR-007.

Items 5 and 7 both touch `adopt` and `init`. They run one after the other. The upstream ID grammar of ADR-007 item 6 waits for a decision on #1979, as before.

## Consequences

- Layer 1 keeps its priority. Items 3, 4, and 6 make retrieval better. Items 1, 2, 5, and 7 make the first run reach layer 1.
- Work on the loop, the gate, and the Action stops for 30 days, except for bugs. ADR-009 lifted this stop on 2026-11-05.
- A fallback answer is weaker than a cited one. Its label tells the agent to cite the task.

Refs: ADR-003, ADR-006, ADR-007
