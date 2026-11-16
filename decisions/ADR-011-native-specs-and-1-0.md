# ADR-011 Native specs and the road to 1.0

Status: proposed. Date: 2026-11-17. The owner agreed to the direction in chat on 2026-11-17. He accepts the text when he merges it. The lead drafted it for the owner. It replaces items 1, 3, 8, and 10 of ADR-006 where they make spec-ctx an add-on on the OpenSpec CLI. ADR-003 and the two layers of ADR-007 stay in force.

## Context

spec-ctx 0.6.0 needs the OpenSpec CLI at run time. The facts on 2026-11-17:

- Four places start the OpenSpec CLI: the validate step of `gate`, the version probe of `init`, the status probe of `next`, and the archive command.
- The root check stops when the repo has no `openspec/` folder. The scan globs in `spec-ctx.toml` are free already.
- The modules that give the headline (`graph`, `index`, `ids`) hold about 1,900 of 8,900 source lines. `lint` alone holds 1,242.
- The repository has 0 stars and 0 forks. Each of the three dogfood repos belongs to the owner.
- The owner said on 2026-11-03 that the OpenSpec team has little interest in spec-ctx.

VACIP is the real project that the owner built with an earlier context engine. It does not use OpenSpec. Its `openspec/` folder holds only the default `config.yaml`. What it shows:

- A requirement lives by amendment. VACIP has 107 FR IDs and 66 amendment IDs. The current text of a requirement is its latest amendment.
- One ID had more than one definition site. The engine took the last one it scanned and labelled stale text as current. The owner switched the engine off for agents on 2026-09-27.
- Bugs and feedback are most of the work. VACIP has about 560 bug IDs and 221 feedback IDs. Its task checkboxes fell behind the code.
- Append-only ledgers grow without a limit. `bugs.md` is 1.5 MB and `current-status.md` is 1.3 MB. They caused merge conflicts and reused IDs.
- A new session reads six files first. The project instructions give that 15 minutes.

spec-ctx has no limit on the size of a file. The `spec-length` step of `gate` limits one requirement of a delta to 500 characters. In this repository 3 of 17 main specs are over 20,000 characters, and `openspec/specs/query/spec.md` is 35,353. An agent that edits a spec must read the whole file first.

The shipped `specctx-bootstrap` skill is a six line alias of `specctx-run`. The real bootstrap steps are in a skill that only this repository has.

## Decision

1. spec-ctx owns the full life cycle of a spec. It needs no OpenSpec CLI at run time. It owns the planning state, the validation, and the archive.
2. The grammar stays. A requirement is a `### Requirement:` header, a scenario is a `#### Scenario:` header, and a change holds delta blocks. An OpenSpec repository moves to spec-ctx one way, with `adopt`. This repository keeps its 68 archived changes as they are.
3. The condition for 1.0 is one test on a real project. A fork of VACIP runs spec-ctx as the context engine for its agents. The upstream VACIP repo is near its code freeze, so the work is on the fork.
4. No file that the engine scans grows without a limit.
   - `spec-ctx.toml` gets a `[limits]` table with `file_chars`. The first default is 20,000 characters. The VACIP dogfood can change it.
   - `check` reports `file-too-long` for a scanned file over the limit. The baseline records the old debt, and `gate` fails only on a rise.
   - A new command, `specctx split <file>`, is the handler. It moves requirements to new files in the same capability. Each ID stays as it is, so no link breaks. `--dry-run` prints the plan and writes nothing.
   - A record such as a bug or a feedback item is one file. A table that every session appends to is not a store.
5. The bootstrap skill is a product feature. `init` installs a real `specctx-bootstrap` skill, not an alias.
   - It runs `status`, then `next`, then `context <task>`. It gets the relations from the ID graph.
   - It never scans the spec tree and never opens a spec file to find a relation.
   - It reads at most 10,000 characters of spec text before the first edit.
   - Pinned invariants print in every `context`. A project marks a constraint as pinned in the config. This is the item that ADR-010 left until a user asked.

## Order of work

1. Version 0.7, the native life cycle.
   - Record the output of the pinned OpenSpec CLI on the fixtures as goldens first. The native code must give the same result.
   - Move the validate rules into `check`. Write a native `archive` that merges the deltas.
   - Replace the upstream propose and archive skills with steps in `specctx-run`.
   - Remove the four CLI starts and the `openspec/` root check.
2. Version 0.8, the record model and the two rules of items 4 and 5.
   - ID families in the config: kind, pattern, and definition site.
   - One definition site for each ID. `check` reports a second one.
   - `amends` and `supersedes` edges. `context` prints only the current text, with a label that names the amendment.
   - Record kinds for bug and feedback, one file each.
   - `gate` reports an ID that two branches both added.
   - The file limit, `split`, the bootstrap skill, and pinned invariants.
3. Version 0.9, the VACIP fork.
   - Run `adopt` on the fork. Label 20 tasks by hand, as `bench/recall/` does.
   - Record the run in `docs/dogfood/vacip.md`.
4. Version 1.0, the contract.
   - Freeze the `--json` output, the exit codes, and the config schema. Each gets a version.
   - Move `lint` to its own package, as ADR-006 item 9 planned. Mark `stats` and `journal` as experimental.

## Measures

- 0.7: the parity goldens pass with no OpenSpec CLI on the machine.
- 0.8: no scanned file in this repository is over the limit, or the baseline holds it.
- 0.9: recall 0.9 on the VACIP fork within the default budget. Zero cards with stale text in the 20 labelled tasks.
- Bootstrap: the characters of spec text that a session reads before its first edit. The target is 10,000 or fewer on the VACIP fork. The six file read of VACIP is the baseline, and the first task of 0.9 measures it.

## What does not change

- No server, no daemon, no LLM call, no embeddings. Runtime dependencies stay at `smol-toml`.
- Layer 1 keeps priority. Every proposal names its layer and its measure.
- No fork of OpenSpec and no pull request to it.
- No adapter for a second spec format before a user asks for one.
- The version rule. A release happens only when the owner asks.

## Consequences

- spec-ctx becomes a spec framework of its own. It loses OpenSpec as a source of users, and it must maintain validate and archive.
- The cost of the native archive is not known. The first task of 0.7 reads the delta merge rules of OpenSpec and gives an estimate before any code.
- The README, `CLAUDE.md`, and the package description change after the owner accepts this record, in the first change of 0.7.
- The ADR-010 order of work is complete with change 068, except its item 6, the query log. That item stays open and moves into 0.8.

Refs: ADR-003, ADR-006, ADR-007, ADR-010
