# Design

## Context

The facts below come from the code.

- `statusLines` in `src/cli/status.ts` ends with `nextStep(r)`. That function knows three states: an open task, a change with every task done, and uncovered REQs. In any other state it returns null and `status` prints no `next:` line.
- `decideNext` in `src/loop/next.ts` is the decision of `specctx next`. It reads the files and writes none. With an active change it runs `<openspec> status --change <c> --json` once.
- `renderNext` prints `next: none` when `command` is null.
- `tests/parity/run.sh` runs `status` on `tests/fixtures/parity-repo/`. That fixture has the active change `007-parity-plant`.
- `Project.runIn` in `tests/helpers.ts` sets `SPECCTX_OPENSPEC` for `init` only. The tests of `next` point it at a stub script in the temp project.

## Goals / Non-Goals

**Goals:**
- `status` and `next` print the same next command in every state.
- The `specctx-run` skill runs every pre-archive step of this repository from `openspec/config.yaml`.

**Non-Goals:**
- A change to the decision order of `next`.
- A new key in `status --json`.

## Decisions

- D1 `statusLines` takes the decision of `decideNext(root, cfg, data)` with no `--change`, and its last line is `next: ` plus the `command`. A null command prints `none`, the same word as `renderNext`. The old `nextStep` function goes away, so no second table exists. The alternative was to copy the decision order into `status`. Two copies drift, and the request asks that the two commands never disagree. Refs: REQ-CLI-007, REQ-LOOP-001, ADR-006
- D2 `status` keeps exit 0 when the OpenSpec command fails. The decision is then `stop` with no command, and the line reads `next: none`. The `reason` of `next` explains the failure, so `status` does not repeat it. So `status` degrades to `next: none` when the OpenSpec command fails or there is no network. Refs: REQ-CLI-007
- D3 `status` with an active change now spawns the OpenSpec command once. That costs time when the command is `npx`. The engine still makes no LLM call and runs no daemon, so ADR-003 holds. Refs: ADR-003, REQ-CLI-007
- D4 Tests never reach the network. A new script `tests/fixtures/openspec-stub.sh` prints `{"isPlanningComplete":true,"nextSteps":[]}` and exits 0. `Project.runIn` sets `SPECCTX_OPENSPEC` to it for `status` when a test did not set the variable. The color test and the startup test spawn the CLI in a child process, so they pass the variable in the child env. Refs: REQ-CLI-007
- D5 `tests/parity/run.sh` exports `SPECCTX_OPENSPEC` with the stub before it runs the commands. The status golden then holds the new `next:` line. It changes with `run.sh --record`, and `docs/verification/030.md` names the reason. Refs: REQ-DIST-003
- D6 `operations.archive.guidance` in `openspec/config.yaml` gets six lines after the first existing line, one per step of REQ-GOV-009, in the order the request lists them. The request says to keep two existing lines. The file holds three. All three stay, because the third holds the post-archive validate rule that CLAUDE.md also states. A test in `tests/gov/` reads the file and checks every line. Refs: REQ-GOV-009, REQ-SKL-003
- D7 `docs/getting-started.md` quotes `next: specctx task next` as a `status` output. The quote changes to the new command. Refs: REQ-CLI-007

## Risks / Trade-offs

- [`status` turns slow when `[gate] openspec` is `npx` and the cache is cold] → `status` is a read command that a person runs a few times per session. The same cost already applies to `next`, which the skill runs on every turn.
- [A test runs `status` in a child process without the stub] → It then reaches `npx`. D4 names the two tests that spawn a child today. A grep for `"status"` in `tests/` finds a new one.
- [The guidance lines grow long] → The skill reads each line as one step. Each new line names one step.
