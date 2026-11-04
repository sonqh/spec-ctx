# Design

## Context

- `context <task>` prints one header line per entry: `-- <id> | <path:line> | <status> | <reason>`. With `--json` it prints `budget`, `chars`, `complete`, `omitted`, and `text`. The header lines are in `text`.
- An entry that does not fit the budget is in `omitted` and not in `text`.
- The evidence of a task holds `files`. These come from the tags of the requirements that the task cites. They are an output of retrieval, so they cannot be the truth that retrieval is measured against.

## Goals / Non-Goals

**Goals:**
- One number per repo for recall within 8,000 characters, with the parts by kind.
- The same labels and the same script for the baseline, after D, and after F.
- A result that the owner can check by hand, entry by entry.

**Non-Goals:**
- A better `context`. A new CLI command. A CI job.
- Precision. ADR-007 item 6 sets no target for it. The report shows the bundle size instead.

## Decisions

- D1 The unit is a task ID. This is the call that an agent makes before it edits. The expected set of a task holds three kinds: requirements, code files, and test files. A label is a requirement ID or a repo path with no line. Refs: REQ-STAT-006
- D2 Matching. A bundle entry matches a requirement label when its ID is that requirement, as a main or a delta version. It matches a file label when the path part of its header is that file, at any line. A label matches once, even when several entries match it. Only entries in `text` count. An omitted entry is a miss. Refs: REQ-STAT-006
- D3 Recall of a repo is the matched labels divided by all labels of that repo. The report also gives the recall of each kind and the mean recall per task. A task whose labels all match counts as complete. Refs: REQ-STAT-006
- D4 The label file is JSON: `{repo, commit, budget, seed, tasks: [{task, reqs, code, tests, note}]}`. `commit` is optional. The fixture label file sets it, because the fixture is frozen. The label file of this repo leaves it out, because D and F move HEAD and the benchmark must run on the new code. The script exits 2 in three cases. `commit` is set and the root is at another commit. A task is not in the index. A field is missing. `--check-schema` checks only the fields. `--check` also checks the commit and the tasks, and writes no report. `note` says why each label is there, so the owner can review it. Refs: REQ-STAT-006
- D5 Selection. The script `scripts/recall.mjs --sample <n> --seed <s>` lists candidate tasks and picks n with a seeded shuffle, so the lead does not choose the easy ones. On this repo the candidates are the done tasks of the archived changes 045 to 053, which have code and tests. On the fixture they are the open tasks of the active changes, which is the case of a stranger. The seed is in the label file. Refs: REQ-STAT-006
- D6 Labels come from the task text, the delta of its change, and the files that the change edited. For this repo the edited files come from `git log` of the change. The evidence `files` are not used, as the Context section says. The owner reviews both label files before the baseline run. Then they stay frozen. Every report prints the sha256 of each label file, so a later report shows that the labels did not change. Refs: REQ-STAT-006
- D7 Time. The script times the whole `node dist/cli.js context <task>` process, because that is the wait of an agent. It runs one warm-up per repo, then 5 runs per task. p95 is over all runs of a repo. The report names the machine, the Node version, and the commit. A test does not assert a time. Refs: REQ-STAT-006
- D8 The fixture. `scripts/recall.sh` clones `sonqh/OpenSpec-spec-ctx`, branch `spec-ctx-adopt`, into a temp dir, checks that HEAD is the `commit` of its label file, runs `build`, and runs the script. It never pushes and removes the dir on exit. It runs the fixture as it is. It does not fix the `tests/**` scan path, because D and E measure against this state. Refs: REQ-STAT-006
- D9 Output. The script writes `docs/metrics/recall-<date>.md` and `.json`. The markdown holds one table per repo. The table gives recall, recall by kind, complete tasks, median and max bundle chars, and p95 ms. Then one row per task lists its misses. The JSON holds the same numbers and the misses. Two runs on the same commit give the same recall and the same misses. Refs: REQ-STAT-006
- D10 Home. The script lives in `scripts/`, so it may use Node only (ADR-001). The labels live in `bench/recall/`, outside every scan path, so they do not enter the index. The requirement goes in `metrics`, next to `stats`. Refs: REQ-STAT-006

## Risks / Trade-offs

- The lead drafts the labels and also builds D and F. The owner review and the frozen sha256 limit that bias. They do not remove it.
- 20 tasks per repo is a small sample. One task moves recall by up to 5 points when it has few labels. The report shows the counts, so a reader sees the scale.
- File level matching does not check that the bundle shows the right line. It is the first step. A line level label is a later change if the numbers call for it.
