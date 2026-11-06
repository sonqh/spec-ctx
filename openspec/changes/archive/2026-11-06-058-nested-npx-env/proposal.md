# Proposal

## Why

GitHub issue #19, found on 2026-11-06 on the 0.5.0 tarball. When spec-ctx runs through `npx --package=<spec> specctx ...`, npm sets `npm_config_package` and `npm_config_call` in the environment. Every child `npx` inherits them. npm then reads the OpenSpec package string as the command to run. Two symptoms follow.

- The `init` version probe fails, so `init` falls back to `@latest` and prints its note.
- `gate --strict` fails at the validate step with exit 1, because the shell cannot find `@fission-ai/openspec@latest`.

The documented `npx -y spec-ctx@<version> gate --strict` path is not affected.

## What changes

- One pure helper, `childEnv(base = process.env)`, in `src/util/env.ts`. It returns a copy of `base` without `npm_config_package` and `npm_config_call`.
- The four child-process sites that may run `npx` use it: the validate spawn in `src/cli/gate.ts`, `detectOpenspec` in `src/init/init.ts`, `openspecStatus` in `src/loop/openspec.ts`, and `runVerify` in `src/verify/run.ts`. `runVerify` applies it to the env a caller passes, else to `process.env`.
- Tests, one per site. A unit test for the helper. A CLI-level `gate` test with both variables and a stub OpenSpec that exits 1 when it sees `npm_config_package`. An `init` test with a fake `npx`. A status probe case in an existing `tests/loop` file. A Verify runner test. No test reaches the network. Tests write only under a temp dir.
- A CHANGELOG entry under `## Unreleased` that names issue #19.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `distribution`: ADDED REQ-DIST-016, the child environment under npx. It links to REQ-DIST-002, REQ-CLI-004, REQ-LOOP-001, and REQ-VER-001.

## Layer and benefit

- Layer: layer 2, a bug fix (ADR-007 item 3 and item 7). It changes no retrieval output.
- Loop commands that gain: `next` (its status probe) and `task done` (its Verify run).
- Benefit: `gate`, `init`, the `status` probe of the loop, and Verify commands work when spec-ctx itself runs through `npx --package`. That is how a tarball or a local build gets tested, and how some CI steps run it.

## Out of scope

- The git spawns in `src/gate/rerun.ts` and `src/baseline/ratchet.ts`. They never run `npx`.
- Any other `npm_config_*` variable.
- A change to `[cli] run`, to `INIT_TEXT`, or to the version in `package.json`.
- A docs change. The README paths stay as they are.

## Impact

- Code: `src/util/env.ts` (new), `src/cli/gate.ts`, `src/init/init.ts`, `src/loop/openspec.ts`, `src/verify/run.ts`.
- Tests: new files under `tests/`, plus one case in `tests/verify/run.test.ts` and one in `tests/loop/next.test.ts`.
- No new dependency. No help text changes, so the help golden stays.
