# Design

## Context

- `init` ends with `next: specctx status` (src/cli/commands.ts, function `init`). On a repo whose specs have no IDs, `status` says nothing about them. `check` reports `missing-id`, and its hint names `adopt`, but the stranger never runs `check`.
- `planAdopt(root, cfg)` in `src/adopt/plan.ts` reads and never writes. It returns `edits`, `caps`, and `unmatched`. `adopt --dry-run` prints its lines and ends with `exit 1: N headers need an ID. Next: specctx adopt`.
- `applyAdopt` in `src/adopt/write.ts` ends with the commit note and `next: <run> baseline write`. That step is debt bookkeeping. It gives the stranger no query result.
- `nextTask(root, entries)` in `src/tasks/tasks.ts` picks one open task. The pick is deterministic by file and line in the lowest active change. `task next` and `next` use it. The task it picks can differ from the task that `next` names, because `next` also looks at state such as the current task.
- `buildIndex` and `buildOnce` always write `.ctx/index.json`. There is no in-memory build. `loadIndex(root, cfg)` in `src/index/build.ts` reads the stored index or rebuilds it.
- `CLAUDE_NOTE` prints only with `--skills` and only for `.claude/`. `ignoresClaude` in `src/init/init.ts` reads `.gitignore`.
- A run on a copy of `tests/fixtures/no-id-repo` gave: `init` then `next: specctx status`. `adopt --dry-run` reports 20 headers, 2 derived capability codes, 3 files. After `adopt`, `context add-mfa/1.3` prints the spec blocks of `user-auth` and the delta. It holds no code or test line, because the fixture has no code and the task cites nothing.

## Goals / Non-Goals

**Goals:**
- Every command on the path prints the next one, from the state of the files.
- A stranger types 3 commands from `init` to a `context <task>` with linked spec blocks.
- The ignored agent folders get a warning.

**Non-Goals:**
- A change to `task backfill`, `baseline`, `gate`, or capability codes.
- Code and test lines in the first answer. They need a citation. ADR-008 item 4 owns that.
- A wizard, a prompt, or an auto-run of `adopt`. `adopt` stays a separate command (ADR-008 item 5).

## Decisions

- D1 Detection in `init`. A new file `src/init/next.ts` exports `detectNext(root, run)`. It loads the config with `loadConfigOrExit`, runs `planAdopt`, and counts `edits.length`, the files of the edits, and the derived caps. When `edits.length > 0` it returns the summary line and the command `adopt`. Otherwise it calls `loadIndex(root, cfg)` and then `nextTask`. `init` may write the gitignored `.ctx/index.json` in this case, when the specs already hold IDs. It writes no spec file and no other file. A task gives `context <id>`. No task gives `status`. Only `UsageExit` and `ConfigError` give `status` and no summary, so `init` never fails on a broken config or spec tree. Any other throw propagates. Refs: REQ-DIST-017
- D2 Where it prints. `init` in `src/cli/commands.ts` calls `detectNext` after `runInit`, in the nothing branch and the written branch. The summary line prints after the notes. A kept changed file keeps the `init --all --force` line as the `next:` line, because it blocks a clean install. The summary line still prints. `--json` adds `needs_id` and `next` to the object. `next` holds the command without the `next: ` prefix. The command uses `runCommand(run, ...)`. Refs: REQ-DIST-017, REQ-CLI-010
- D3 Summary text. `specs: <n> headers in <m> files need an ID (<k> capability codes). adopt --dry-run shows each one.` It uses `headers` and `files` always, even for 1. The counts are the plan counts, the same as the `adopt --dry-run` tail. `check` counts differently: it reports 18 `missing-id` on the fixture, because it skips headers inside a delta that adopt maps. The line names no number from `check`. Refs: REQ-DIST-017
- D4 Adopt tail. `applyAdopt` prints `To gate the old debt later, run <run> baseline write and commit it with a subject that starts with baseline:` and then `next: <run> context <id>`. It calls `loadIndex(root, cfg)` after the write and then `nextTask`. No task gives `next: <run> status`. The subject rule stays in the output, as the old commit note had it. Refs: REQ-ADOPT-011, REQ-ADOPT-002
- D5 Ignored folders. `ignoresClaude` becomes `ignoredAgentDirs(root)`. It returns the subset of `.claude` and `.agents` that `.gitignore` ignores, with or without a slash. `runInit` pushes one note when the list is not empty, in both places where it pushed `CLAUDE_NOTE`. Text: `note: .gitignore ignores <dirs>. The skills under <dirs> stay out of git.` with `.claude/` or `.claude/ and .agents/`. The task removes `CLAUDE_NOTE` and updates its test. Refs: REQ-DIST-018
- D6 Docs. The README gets a short section after `## Quickstart`. `docs/reference.md` and `docs/getting-started.md` show three commands first, then `baseline write` and `gate --strict` as the step for the gate. `docs/dogfood/openspec.md` is a dated record and does not change. The README toy project keeps working: `tests/gov/try-readme.test.ts` runs it. Refs: REQ-GOV-014
- D7 Measure. A run on a copy of the no-ID fixture with `SPECCTX_JOURNAL=1`. A second timing of `init` runs on a clone of the OpenSpec fork (`sonqh/OpenSpec-spec-ctx`, branch `spec-ctx-adopt`, commit 8899171), before task 2.1 lands and after. The record counts the commands that follow the `next:` lines from `init` to a `context <task>` with spec blocks, before and after. It runs `report` for the north star section. On the fixture the signal `context-has-code-or-test` cannot fire, because the fixture has no code. The record says so, and adds a second run on the README toy project, which has a tagged file. No change to `bench/recall`.

## Risks / Trade-offs

- The index load in `init` costs time on a large repo, and it may write `.ctx/index.json`. `planAdopt` reads the spec files already. The index build walks the scan globs. The record of task 5.1 measures the time of `init` on this repo before and after.
- REQ-CLI-007 said `init` ends with a `next:` line from a fixed table. The line now depends on the files. MODIFIED REQ-CLI-007 drops `init` from the fixed table sentence and says `init` follows REQ-DIST-017. The edit only deletes words, because the requirement sits near 500 characters.
- MODIFIED REQ-ADOPT-006 names the new existing path: `init --all`, `adopt`, `context <task>`, then `baseline write` as the gate step.
