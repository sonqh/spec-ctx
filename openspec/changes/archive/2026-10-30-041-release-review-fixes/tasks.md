# Tasks

Run `bun run build` before every Verify. Tests write only under a temp dir, clear `SPECCTX_RERUN` before they run the CLI or a script, and never reach the network. A task that edits a `.ts` file also runs `bun run typecheck`.

## 1. The loop

- [x] 1.1 In `lastGate` of `src/loop/next.ts`, take the last gate log line whose `steps` is not exactly `["rerun"]`, per 041/D1. Write `tests/loop/gate-rerun-line.test.ts` for SCN-LOOP-011-1 and SCN-LOOP-011-2. It writes gate log lines by hand in a temp project and runs `next --json`. No help text or golden changes. [REQ-LOOP-011] Verify: `bun run build && bun test tests/loop/gate-rerun-line.test.ts tests/loop/next.test.ts && bun run typecheck`
- [x] 1.2 In `renderNext` of `src/loop/next.ts`, print `tasks: none` for an empty list and join IDs with a comma and a space, per 041/D7. Write `tests/loop/human-tasks.test.ts` for SCN-LOOP-012-1 and SCN-LOOP-012-2. A grep of `tests/` shows that no golden holds the human `tasks:` line, so none changes. [REQ-LOOP-012] Verify: `bun run build && bun test tests/loop/human-tasks.test.ts tests/cli/nextstep.test.ts && bun run typecheck`
- [x] 1.3 Add the `--plan` bool flag to `handoff ask` in `src/cli/args.ts` and `src/cli/workflow.ts`. Give `--plan` without `--change` a usage error. Add the stage `design` to `QuestionStage` in `src/handoff/questions.ts`. `ask` and `stageOf` in `src/handoff/handoff.ts` store `archive` when every task is `[x]`, else `plan` with the flag and `design` without it, per 041/D2. The plan stop command of `src/loop/next.ts` carries `--plan`. Update the help text of `handoff ask` in `src/cli/help.ts` and record `tests/fixtures/help-golden/help.out` and `pages.out` with `SPECCTX_HELP_RECORD=1`. Update the commands in `tests/loop/plan-stop.test.ts`, `tests/loop/next.test.ts`, and `tests/cli/nextstep.test.ts`. Change the stage check of `tests/loop/archive-stop.test.ts` to `design`. Write `tests/loop/plan-flag.test.ts` for SCN-LOOP-007-4, SCN-LOOP-009-1, SCN-LOOP-009-3, and SCN-LOOP-009-4. The skill names no plan command, so `skills/` stays. [REQ-LOOP-007, REQ-LOOP-009] Verify: `bun run build && bun test tests/loop tests/handoff tests/cli tests/skills && bun run typecheck`

## 2. The rerun

- [x] 2.1 In `runRerun` of `src/cli/gate.ts`, fail a group whose cwd is not a directory as `mismatch` with the reason `cwd does not exist: <dir>`. Wrap `runVerify` so a spawn error becomes a `mismatch` for each member, per 041/D3. Write `tests/gate/rerun-cwd.test.ts` for SCN-VER-009-1 and SCN-VER-009-2 on a temp git repo from `tests/gate/gitrepo.ts`. It forces the spawn error with a cwd that is a file. [REQ-VER-009] Verify: `bun run build && bun test tests/gate/rerun-cwd.test.ts tests/gate/rerun-cli.test.ts && bun run typecheck`
- [x] 2.2 In `runRerun`, print the one line of REQ-VER-010 and exit 0 when the merge base equals HEAD, per 041/D4. Add the merge base check to `closedTasks` in `src/gate/rerun.ts` only if `runRerun` cannot read it from the result. Write `tests/gate/rerun-head.test.ts` for SCN-VER-010-1 and SCN-VER-010-2. [REQ-VER-010] Verify: `bun run build && bun test tests/gate/rerun-head.test.ts tests/gate/rerun-cli.test.ts tests/gate/closed.test.ts && bun run typecheck`
- [x] 2.3 In `tasksAt` of `src/gate/rerun.ts`, run `git ls-tree -z -r --name-only` and split on NUL, per 041/D6. Write `tests/gate/rerun-nonascii.test.ts` for SCN-VER-011-1 with the change folder `042-café`. [REQ-VER-011] Verify: `bun run build && bun test tests/gate/rerun-nonascii.test.ts tests/gate/closed.test.ts && bun run typecheck`

## 3. The action and the replay

- [x] 3.1 In `action/run.sh`, refuse every event except `pull_request` and `push` when `INPUT_RERUN` is `true`, with one line and exit 1, per 041/D5. Update `tests/action/rerun.sh` for SCN-DIST-011-1, SCN-DIST-011-2, and SCN-DIST-011-3, and set `GITHUB_EVENT_NAME=pull_request` in its rerun command line cases. `action.yml` and the README change in task 4.1. [REQ-DIST-011] Verify: `bun run build && bash tests/action/rerun.sh && bash tests/action/selftest.sh`
- [x] 3.2 In `scripts/replay-rerun.sh`, add ` 00:00` to a bare `YYYY-MM-DD` and print `replay: 0 commits since <date>` to stderr when no commit matches, per 041/D8. Extend `tests/replay/replay.test.ts` for SCN-VER-012-1 and SCN-VER-012-2. Update `docs/verification/replay-rerun.md`, which passes both lints. [REQ-VER-012] Verify: `bun run build && bun test tests/replay && node dist/cli.js lint tells --baseline 0 docs/verification/replay-rerun.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation docs/verification/replay-rerun.md`

## 4. The shared files

- [x] 4.1 Edit the `rerun` input text in `action.yml` and the action section of `README.md`. Both say to pass `base: ${{ github.event.before }}` on push, and name `pull_request` and `push` as the only events. Add entries to `## Unreleased` in `CHANGELOG.md`. Cover the gate log fix, the `--plan` flag, the new plan stop behavior, the `tasks:` line, the push base, the event guard, and the replay fixes. The README keeps the terms that `tests/action/rerun-docs.sh` checks. [REQ-DIST-011, REQ-VER-010] Verify: `bun run build && bash tests/action/rerun-docs.sh && grep -q 'github.event.before' action.yml && grep -q 'github.event.before' README.md && grep -q -- '--plan' CHANGELOG.md`

## Workflow follow-up

- Run the steps under `operations.archive.guidance` in `openspec/config.yaml`.
- Archive with the command that `specctx next` prints.
- Run `npx -y @fission-ai/openspec@latest validate --all --strict` again before push.
