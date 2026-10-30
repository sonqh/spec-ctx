# Design

## Context

- The index holds five edge kinds today. All come from `Refs:` lines, task citations, and tags.
- OpenSpec folders imply more links. A delta spec sits in `openspec/changes/<c>/specs/<cap>/spec.md`. A main spec sits in `openspec/specs/<cap>/spec.md`. A task and a design decision sit in the same change folder.
- `bundle` prints blocks in a fixed order and drops the first block that does not fit. The code and test lines come last, so they go first.
- Measured on HEAD 2f9633e: REQ-LOOP-001 bundle 8,522 characters, 203 ms median. Task 044/1.1 bundle 3,528 characters. External task bundle 257 characters.
- The index is 1.7 MB. A task to delta pair per task would add about 6,700 pairs. The product and architect reviews also found that stored `delta:`, `cap:`, and `main:` links repeat what the `change`, `file`, and `status` fields already say.

## Goals / Non-Goals

**Goals:**
- Add the edges that folders and IDs imply, each with its own reason.
- Keep code and test lines in a default bundle.
- Store each fact once.

**Non-Goals:**
- `specctx context`, the benchmark, the `[AUTH-3]` grammar, layer 2, a performance fix, and a version bump.

## Decisions

- D1 `build` adds two entry kinds. A `change` entry has the ID `change/<key>`, the key rule of 008/D1. A `cap` entry has the ID `cap/<name>`, one for each name that has a `specs/<name>/spec.md` file. The `cap` file is the main spec, else an active delta, else an archived delta. Both kinds are canonical and not in `SPEC_KINDS`, so `check` ignores them. The index stores no `delta:`, `cap:`, or `main:` link. Refs: ADR-006, ADR-007, REQ-IDX-010
- D2 Two change folders can have one key, for example in an external repository where the folder name is the key. They give one `change/<key>` entry. An active folder wins. Among active folders the smaller folder name wins. Among archived folders the newest date prefix wins, then the smaller name. The `file` of the entry is the `proposal.md` of the winner, else its first scanned file. Refs: ADR-007, ADR-002, REQ-IDX-013
- D3 A task names a design decision as `<key>/D<n>` or as a bare `D<n>`. The scan reads the task text before `Verify:`, with its path spans removed, and stores `design:<key>/D<n>` in the optional `links` list of the task, sorted. A full name resolves the key with the folder rule of 008/D1. A bare name means a decision of the task's own change. A name with no decision in the index makes no link. A bare `D` must not follow a letter, a digit, a slash, or a hyphen. This is the only stored link, because a task line is the only source of it. Refs: ADR-007, ADR-006, REQ-IDX-012
- D4 `src/graph/links.ts` derives the other edges at query time from `change`, `file`, and `status`. A task reaches the requirements and scenarios whose entries sit in `specs` under the change folder of the task file. An archived task works the same, and a delta ID resolves to its canonical entry, so it reaches the main requirement. A requirement reaches `cap/<name>` with the name from its `specs/<name>/spec.md` path. A change reaches the same delta entries and their capabilities. The index grows by no pair. Refs: ADR-007, ADR-006, REQ-QRY-009, REQ-QRY-010
- D5 Edges run one way unless a reason says otherwise. A task reaches its decisions, and its deltas when it is the start of the walk. A decision reaches the tasks that name it. A requirement reaches its capability. A capability reaches its requirements only when it is the start. At depth 2 a requirement then does not reach every sibling of its capability, directly or through a task. A requirement does not reach the tasks of its change, and it does not reach the changes that touched it. Those back edges would add many one line entries to every bundle. Refs: ADR-007, REQ-QRY-009, REQ-QRY-010
- D6 The main version of a modified requirement is a second entry with the same ID, so it cannot be a graph neighbor. `links.ts` finds it from a canonical entry with status `modified` and the non-canonical entry of the same ID in a main spec. `related` adds a pair with the reason `main version of <ID>` after the pair of the delta, unless `--all` lists both copies already. `bundle` adds the block, also for a requested ID. The block takes the class of its delta. Refs: ADR-007, REQ-QRY-010
- D7 `related` records the distance of each entry in its `found` map, as `{reason, depth}`. An entry from loop round `d` has depth `d+1`. A seed of a path start has depth 1, and its neighbors have depth 2. The result of `related` keeps its pair shape. `bundle` reads the same map. It splits the candidates into four classes. Class 0 is the requested IDs and their main versions. Class 1 is code and test lines at depth 1. Class 2 is ADRs, active decisions, requirements, capabilities, changes, and tasks at depth 1. Class 3 holds archived decisions and everything from depth 2. A decision that references a requested ID gets depth 1, so an active one joins class 2 and an archived one joins class 3. `bundle` fills the budget class by class, in print order inside a class, and skips a block that does not fit. Then it prints the kept blocks in the fixed order of REQ-QRY-003, with `cap` after `test` and `change` after `cap`. The trailer lists the omitted IDs in print order. No cap on the code and test class: the largest requirement of this repository has 24 lines. Refs: ADR-007, REQ-QRY-003, REQ-QRY-012, REQ-QRY-014
- D8 A change key or folder name that is no ID and resolves to a change becomes `change/<key>` before the path rule of 045/D1. An ID wins over a change, and a change wins over a path. `query` with no `--kind` skips `cap` and `change` entries, so the top 20 of a plain query stays the same. `query --kind cap` and `--kind change` list them. `query --change` does not list capabilities, because `related <change>` does. `task start` stays as it is. It passes the cited requirements only. Refs: ADR-007, REQ-QRY-011, REQ-QRY-013
