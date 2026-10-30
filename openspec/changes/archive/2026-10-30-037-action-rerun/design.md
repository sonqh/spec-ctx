# Design

## Context

The facts below come from the code.

- `action/run.sh` picks the `specctx` command and runs `gate` with `--strict` and `--markdown`.
- `action.yml` passes each input as an `INPUT_*` env var and sets `SPECCTX_ACTION_PATH`.
- `gate --rerun` takes `--strict`, `--base`, and `--json`. It ignores `--markdown` (REQ-CLI-009).
- `src/gate/rerun.ts` builds the `reproduce:` line with the `shq` helper for the command only.
- `ci.yml` jobs use `actions/checkout@v4`, `actions/setup-node@v4` with Node 22, and `oven-sh/setup-bun@v2`.

## Goals / Non-Goals

**Goals:**
- A pull request on this repository reruns the Verify of its closed tasks on a clean machine.
- The action stays a thin wrapper.

**Non-Goals:**
- The replay script.
- A rule for commands that need the network.
- Any change to the default gate.

## Decisions

- D1 `run.sh` builds the command line in one branch on `INPUT_RERUN`. With `true` it runs `$specctx gate [--strict] --rerun [--base <value>]`. Otherwise the old line runs unchanged. The `strict` input still decides `--strict`, so a weak Verify fails the same way in both modes. Refs: REQ-DIST-010, REQ-DIST-005
- D2 The event guard sits before the script builds the command and writes one line to stderr. It reads only `GITHUB_EVENT_NAME` and `INPUT_RERUN`. Refs: REQ-DIST-011
- D3 The `rerun` job copies the setup steps of the `specs` job, then calls `uses: ./`. The composite action sets up Node again. That is harmless. `ci-local.sh` gets no new line, because the job adds no `run:` line. Refs: REQ-GOV-010, REQ-GOV-004
- D4 The tests run `run.sh` with a recording `specctx` script in a temp git repo. A second test reads the job block of `ci.yml`. A third reads the README. No test reaches the network. Refs: REQ-DIST-010, REQ-DIST-011, REQ-GOV-010, REQ-DIST-012
- D5 The `reproduce:` line quotes the cwd with `shq`. Refs: REQ-VER-007

## Risks / Trade-offs

- The `rerun` job runs on GitHub only after a push. A local test reads its text, not its run. `docs/verification/037.md` lists what to check on the first pull request.
- A fork pull request runs code from the fork. The README names the repository setting that asks for approval first.
