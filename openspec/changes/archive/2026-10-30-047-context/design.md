# Design

## Context

- `bundle` takes IDs, files, and changes. It walks `related` and fills the budget by class (046/D7).
- `task start` calls `bundle` with the REQs that the task cites, not with the task. A requirement as the start puts its code and test lines at depth 1, so `task start` keeps them. A task as the start puts them at depth 2, which is class 3.
- Measured at HEAD e3f6eec: `task start` keeps 2 of 2, 13 of 13, and 9 of 9 lines for `045/2.1`, `046/2.1`, and `044/1.1`. `bundle` of the same tasks keeps 0 of each. `bundle src/graph/files.ts` keeps 0 of 2. The external task `coding-agent-workspace-slice/1.2` cites no REQ. Its `task start` prints 238 characters with the footer, and `bundle` of the task prints 1,384.

## Goals / Non-Goals

**Goals:**
- One front door for four kinds of input.
- A task as the start reaches the code and test lines of its cited requirements.
- `task start` prints the same answer.
- A file reaches the code and test lines of the requirements it tags.

**Non-Goals:**
- `--since <ref>`, the benchmark, speed work, and a version bump.

## Decisions

- D1 The cleanest design is to make `bundle` do the work and to add `context` as the documented name for one input. A second walk or a second budget would make two commands that drift apart. So `src/graph/input.ts` holds the resolution of an input, and `bundle()` in `src/graph/bundle.ts` holds the walk and the budget. `context` and `bundle` call both. For one input their output is equal, and a test checks it. `bundle` keeps what `context` does not take: several inputs, `--block`, and `--all`. The README and the docs lead with `context`. Refs: ADR-007, REQ-QRY-015
- D2 The input rule moves from `commands.ts` to `resolveInputs`. An ID wins over a change, and a change wins over a path (045/D1, 046/D8). The errors and exit codes do not change. `context` takes exactly one input and exits 2 for none or several. Refs: ADR-007, REQ-QRY-005, REQ-QRY-011, REQ-QRY-015
- D3 The task rule sits in `bundle()`, so `bundle <task>` and `context <task>` agree. For a requested task and a depth of 1 or more, `bundle()` takes the requirements in the `refs` of the task that the index holds. It does not call `walkFound` for each of them, because that call rebuilds the pool, the canonical map, the back links, and the structure each time. It builds the map from a requirement to its code and test entries once, in one pass over the pool. It takes the entries of each cited requirement from that map, gives them depth 1, and uses the reasons `implements <REQ>` and `covers <REQ>`. Class 1 of 046/D7 then holds them. A long task line in class 0 can push some of them out. 046/2.1 keeps 9 of 13 at the default budget. It keeps 13 of 13 at `--budget 9000`. No second walk exists. Refs: ADR-007, REQ-QRY-016, REQ-QRY-012
- D4 The cited requirements join class 0, as if requested, and their reason stays `ref from <task>`. The main version of a cited requirement joins class 0 too. The `decision for <REQ>` blocks that the old `task start` printed stay. `bundle()` adds them for every cited requirement at depth 1, as it does for a requested ID (the loop near line 84 of `bundle.ts`). Without this a change with many deltas could drop the text of the requirement that the task must meet. `task start` kept that text before, because the cited requirements were its requested IDs. Class 0 takes only a few blocks. A task cites a few requirements. The deltas, designs, and other tasks stay in class 2 or 3. Refs: ADR-007, REQ-QRY-016, REQ-QRY-012
- D5 `bundle()` takes an optional task entry. `task start` passes the entry that `findTask` found. The function does not resolve that task again through `canon()`, which lets the later entry win when an active and an archived task share a number. When the entry is not the one that `canon()` holds, `bundle()` puts it last in its own copy of the list, so every walk reads its refs. A test covers a shared number. `task start` has no fallback for an index that lacks the task, because `findTask` reads the same index and that case cannot run. The warning for a cited ID that the index lacks stays. The footer, the hint line, `current.json` with `bundle_chars`, `started_at`, `task`, and `verify`, and the `--json` shape `{bundle, hint, task}` do not change. The `context` and `bundle` commands pass the entry of a task input the same way, so `context` and `task start` agree in that case too. Refs: ADR-007, REQ-TASK-002, REQ-QRY-016
- D6 A task with no citation now gets its own line, the deltas of its change, and the designs it names. The hint line stays. `task next` prints `bundle_command` as `context <task>` through the run prefix, with `--budget`. It names the same answer that `task start` prints. The skill text in `skills/specctx-run/SKILL.md` says "Read the bundle it prints". That stays true, so the skill needs no edit. The README and `docs/getting-started.md` name the old content, so task 4.1 edits them. Refs: ADR-007, REQ-TASK-002, REQ-TASK-007
- D7 The answer of `bundle` and `context` for a file adds the code and test entries of the requirements that the file tags. They join class 1 with depth 1 and the reasons `implements <REQ>` and `covers <REQ>`. The rule takes them from the same one-pass map as D3. A file's own tests then appear. The target is `context src/graph/files.ts`: 2 of 2 lines, where `bundle` keeps 0 today. A requirement that a task line only mentions adds no lines. `related` of a file keeps REQ-QRY-005: no code and no test entry. The delta of this change modifies REQ-QRY-005 to say so. Refs: ADR-007, REQ-QRY-005, REQ-QRY-017
