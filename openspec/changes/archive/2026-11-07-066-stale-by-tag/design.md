# Design

## Context

- `writeEvidence` in `src/tasks/evidence.ts` sets `files` from `taggedFiles`. It scans the index entries of kind `code` and `test` for a ref to a cited requirement. `src/cli/workflow.ts` calls it from `task done` and from `task done --manual`.
- `staleFiles` in `src/check/evidence.ts` compares each recorded digest with the tree. `trust.ts` reads the same files for `verified`.
- `task start` writes `.ctx/current.json` with `bundle_chars`, `started_at`, `task`, and `verify`. `tests/tasks/start.test.ts` pins that key set for a project with no git.
- The index holds `paths` for each task, the code spans of its line that look like a path (REQ-IDX-009).

## Goals / Non-Goals

**Goals:**
- The evidence of a task holds only files that the task owns.
- A repo with no git still works.

**Non-Goals:**
- A change to the stale rule, the labels, or archived evidence.

## Decisions

- D1 Sources. `files` is the union of the named files, the Verify files, and the diff files, sorted by path. Every path is relative to the project root and uses `/`. Only an existing regular file counts. `diff` lists the diff files, sorted. `base` never goes into evidence. Refs: REQ-TASK-004
- D2 Named files. They are the `paths` of the task entry. A directory, a missing path, and an ignored path stay out. The `tasks.md` of a change stays out, because `task done` edits it after the evidence. Refs: REQ-TASK-004
- D3 Verify files. Split the command on white space. Strip the characters `;`, `(`, `)`, `<`, `>` and quotes from each token, and a `VAR=` prefix. Drop a token that starts with `-` or that holds no `/` and no `.`. Resolve the rest against the Verify directory, then against the root. Drop a path outside the root, such as `/bin/sh` or `../x`. Do not expand a directory. An ignored path stays out, so `node dist/cli.js` adds no file. Refs: REQ-TASK-004
- D4 Base. `task start` runs `git rev-parse HEAD`, then `git diff -z --name-only --relative <head> -- . :!.ctx :!.claude` and `git ls-files -z -o --exclude-standard -- . :!.ctx :!.claude`. It drops directory entries before it hashes, because a worktree under `.claude/worktrees` can show as a directory. It stores `base: { head, files }`, where `files` maps each path to its sha256. A project with no git, or a repo with no commit, writes no `base` and counts as `no git repo`. The key set of `current.json` then stays as `tests/tasks/start.test.ts` pins it. Refs: REQ-TASK-009
- D5 Diff. `task done` runs the same two lists with the stored `head`. A file counts when it is a regular file and its digest differs from `base.files[path]`, or `base` lacks it. This covers an edit, a new file, a staged file, and a commit made after `task start`. A file with the same digest as at start does not count. A deleted file does not count. The `tasks.md` filter applies before any hash. Refs: REQ-TASK-009
- D6 Ignore check. One call, `git check-ignore -z --stdin`, takes every candidate path of D2 and D3. Exit 1 means none is ignored. Exit 0 prints the ignored paths. Any other exit, such as 128 in a project with no git, means that nothing is ignored. The calls of D4 and D5 decide the fallback of D7. Refs: REQ-TASK-009
- D7 Fallback. The base is absent when there is no git repo (`no git repo`), when `current.json` has no `base` or names another task (`no task start`), or when `git diff <head>` fails (`base lost`). There is no separate HEAD check. Then no diff file is added, except through D8. `task done` writes one line on stderr: `note: no diff base for <task> (<cause>). Evidence files hold the named and Verify files only.` The line stays when D8 carries paths, with the clause `and the carried diff files`. Refs: REQ-TASK-009
- D8 Carry on repair. With no matching base, `task done` reads the newest `<task>.reopened-<n>.json`. When it has a `diff` array, each path that still exists and passes D5 and D6 goes into `files` and `diff` with its digest now. Evidence from before change 066 has no `diff` field, so nothing comes back. Refs: REQ-TASK-010
- D9 Git calls. One `spawnSync("git", args, { cwd: root })` per git command. Output reads with `-z`. A failed call other than the exit 1 of D6 gives the fallback. No call reaches the network. Refs: REQ-TASK-009
- D10 Manual evidence. `task done --manual` uses the same function. It has no Verify files. Refs: REQ-TASK-004
- D11 Old evidence. No reader changes. A file with a tag-only entry stays valid until its task is archived. Refs: REQ-TASK-004

## Risks / Trade-offs

- A code line that no task touched, named, or ran now reads `tagged` and not `verified`. That is the honest label. The cards of archived tasks do not change, so `context 060/2.1` and `context 062/2.1` print the same lines before and after. The record shows the diff.
- A repair run has no `task start`. D8 carries the `diff` paths of the first run, so the repaired evidence keeps its owned files. The old tag-only files never come back.
- The base hashes each changed file at `task start`. A tree with many changes costs one read per file. A clean tree costs three git calls.
- A shell command can name a path in a form that D3 does not parse, such as `$(...)`. That file is not in the evidence. The diff still catches it when the run edits it.
