# Design

## Context

- `context <task>` prints one header line per entry: `-- <id> | <path:line> | <status> | <reason>`. With `--json` it prints `budget`, `chars`, `complete`, `omitted`, and `text`. The header lines are in `text`.
- `text` can also end with a line `truncated: <n> entries omitted: <ids>` (`src/graph/bundle.ts`). That line names entries that did not print.
- The evidence `files` of a task come from `taggedFiles` in `src/tasks/evidence.ts`. It takes the code and test entries whose tags hit the cited requirements. They are an output of retrieval, so they cannot be the truth that retrieval is measured against.

## Goals / Non-Goals

**Goals:**
- One number per repo for recall within 8,000 characters, with the parts by kind.
- The same labels and the same script for the baseline, after D, and after F.
- A result that the owner can check by hand, entry by entry.

**Non-Goals:**
- A better `context`. A new CLI command. A CI job.
- Precision. ADR-007 item 6 sets no target for it. The report shows the bundle size instead.
- A claim that a target is met. 20 tasks per repo can show a change between two runs. They are too few to prove 0.95 or 0.9.

## Decisions

- D1 The unit is a task ID. This is the call that an agent makes before it edits. The expected set of a task holds three kinds: requirements, code files, and test files. A label is a requirement ID or a repo path with no line. The kind of a file label comes from the `code` and `tests` globs of the `spec-ctx.toml` of the root, not from the lead. Refs: REQ-STAT-006
- D2 Matching. The script reads only the lines of `text` that start with `-- `. Field 1 is the ID. Field 2, up to its last `:`, is the path. A requirement label matches a line whose ID is that requirement, as a main or a delta version. A file label matches a line whose path is that file, at any line. A label matches once. A label with no matching line is a miss. The `truncated:` line and the `omitted` list never make a match. Refs: REQ-STAT-006
- D3 Recall of a repo is the matched labels divided by all labels of that repo. The report also gives the recall of each kind and the count of complete tasks, where every label matched. Refs: REQ-STAT-006
- D4 The label file is JSON: `{repo, commit, budget, seed, sample, tasks: [{task, reqs, code, tests, note}]}`. `commit` is optional. The fixture label file sets it, because the fixture is frozen. The label file of this repo leaves it out, because D and F move HEAD and the benchmark must run on the new code. The script exits 2 in four cases:
  - `commit` is set and the root is at another commit.
  - A task is not in the index.
  - A field is missing, or a label path or requirement ID does not exist at the root.
  - The tasks are not the ones that `sample` and `seed` give (D5).

  `--check-schema` checks only the fields. `--check` checks all four cases and writes no report. Refs: REQ-STAT-006
- D5 Selection. `scripts/recall.mjs --root <dir> --sample <n> --seed <s>` lists the candidate tasks, sorts them by ID, and picks n with a seeded shuffle. `--check` runs the same pick again, so the label file proves that the lead did not choose the tasks. A candidate is a done task of an archived change. The commits of that change must edit a file under the `code` or `tests` globs. The script reads that from `git log`, never from tags or evidence. On this repo the archived changes are 045 to 053. The fixture candidates are chosen the same way, from its archived changes. Refs: REQ-STAT-006
- D6 Labels. A label path must sit under the `code` or `tests` globs of the root. `.ctx/`, `docs/`, `CHANGELOG.md`, `README.md`, and `openspec/` are never labels. A file goes to a task when two things hold. The task text names it, or its Verify command runs it. And the commit that closed the task edited it. On this repo one commit often closes every task of a change, so the commit alone would give sibling tasks the same files. A task with no such file gets no file label. The requirements are the ones that the task text names. When the text names none, they are the delta requirements of its change. The evidence `files` are not used. Every label has a `note` with its source. The owner reviews both label files before the baseline run. Then they stay frozen. Every report prints the sha256 of each label file. Refs: REQ-STAT-006
- D7 Time. The script spawns the `dist/cli.js` of this repo by absolute path, with `cwd` at the root of the label file. It runs one process at a time, with `SPECCTX_RERUN` and the `GIT_` variables cleared. Each task gets 1 scored run and then 5 timed runs, after one warm-up per repo. It uses `process.hrtime.bigint()`. p95 is over the timed runs of a repo. The report names the machine, the Node version, and the commit of both repos. A test does not assert a time. Refs: REQ-STAT-006
- D8 The fixture. `scripts/recall.sh` builds this repo. Then it clones `sonqh/OpenSpec-spec-ctx`, branch `spec-ctx-adopt`, into a temp dir. The clone keeps enough history for `git log`. It checks that HEAD is the `commit` of the label file. Then it runs the script. It never pushes and removes the dir on exit. The clone in `recall.sh` and the clone in task 2.2 are the two parts of this change that use the network. Refs: REQ-STAT-006
- D9 Output. `--out <dir>` and `--date <yyyy-mm-dd>` set where the report goes. The script writes `<dir>/recall-<date>.md` and `.json`. The markdown holds one table per repo. The table gives recall, recall by kind, complete tasks, and label counts. It also gives the median and max bundle chars and the p95 ms. Then one row per task lists its misses. The JSON holds the same numbers and the misses. Two runs on the same commit give the same recall and the same misses. Refs: REQ-STAT-006
- D10 Home. The script lives in `scripts/`, so it may use Node only (ADR-001). The labels live in `bench/recall/`, outside every scan path, so they do not enter the index. `scripts/` is not a scan path either, so the `// REQ-STAT-006` tag of the script is not indexed. The requirement goes in `metrics`, next to `stats`. Refs: REQ-STAT-006

## Findings for later changes

- The fixture `spec-ctx.toml` scans `tests/**`, but the fixture keeps its tests in `test/`. This goes to change E: `init` warns when a scan path matches no file.
- This repo does not scan `scripts/`, so `context 053/1.1` does not show `scripts/try.sh`. A one-line `spec-ctx.toml` change fixes it, after the baseline. `docs/verification/054.md` records it.

## Owner decisions at the plan stop

- The fixture candidates are done tasks of archived fixture changes, as on this repo. Their commits show the real files. The open tasks get no file labels, because their code does not exist yet. Change D counts its own acceptance on the open tasks.
- The fixture runs as committed. D and F are measured against the same frozen state. Change E is measured by the north star, not by this benchmark.

## Risks / Trade-offs

- The lead drafts the labels and also builds D and F. The seeded sample, the owner review, and the frozen sha256 limit that bias. They do not remove it.
- 20 tasks per repo is a small sample. One task moves recall by up to 5 points when it has few labels. The report shows the counts, so a reader sees the scale.
- File level matching does not check that the bundle shows the right line. A line level label is a later change if the numbers call for it.
