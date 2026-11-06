# Design

## Context

- `npx --package=<spec> specctx ...` makes npm export `npm_config_package=<spec>` and `npm_config_yes` to the process. npm exports `npm_config_call` only for `-c`. A child `npx` reads `npm_config_package` and runs `<spec>` as its command. So `npx -y @fission-ai/openspec@latest validate` becomes a run of the package string, and the shell reports that it cannot find `@fission-ai/openspec@latest`. The helper strips `npm_config_call` too, because a leaked value makes the nested `npx` fail with a usage error.
- Four sites spawn a command that may be `npx`. `src/cli/gate.ts` line 117 runs validate with `spawnSync("/bin/sh", ["-c", ...])` and no `env`, so the child inherits `process.env`. `detectOpenspec` in `src/init/init.ts` line 54 spawns `npx` by name. `openspecStatus` in `src/loop/openspec.ts` line 33 runs the status probe through `sh -c`. `runVerify` in `src/verify/run.ts` spawns `sh -c <command>` with the env a caller passes, else with `process.env`. A Verify command runs `npx` as often as it likes.
- `gate --rerun` passes `{ ...process.env, CI: "1", SPECCTX_RERUN: "1" }` to `runVerify` (REQ-VER-007). `task done` passes nothing.
- The git spawns in `src/gate/rerun.ts` and `src/baseline/ratchet.ts` run `git` only. They never reach `npx`.
- `tests/init/init.test.ts` has `initWithFakeNpx`. It puts a fake `npx` first on `PATH` and spawns `dist/cli.js init`. `tests/helpers.ts` has `cleanEnv` and `OPENSPEC_STUB`. `tests/cli/gate.test.ts` runs the gate on a `Project` with `SPECCTX_OPENSPEC` set.

## Goals / Non-Goals

**Goals:**
- The four sites work when spec-ctx itself runs through `npx --package`.
- One small pure function. No change to output, exit codes, or help text.

**Non-Goals:**
- Any other `npm_config_*` variable. Only the two that make a nested `npx` run the wrong package.
- A change to the git spawns, to `[cli] run`, or to `INIT_TEXT`.

## Decisions

- D1 One helper in `src/util/env.ts`. Refs: REQ-DIST-016
  - `export function childEnv(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv`. It copies `base` with the spread operator and deletes `npm_config_package` and `npm_config_call` from the copy. It never writes to `base`. The names sit in one exported constant `NESTED_NPX_VARS`, so the test and the code share one list.
  - Rejected: delete both from `process.env` once in `src/cli.ts`. In-process tests call `main()` and would skip it. `init` reads `npm_command` from `process.env` (REQ-DIST-015), so a global edit of the environment mixes two concerns. A pure function stays testable and keeps `process.env` as npm set it.
- D2 The four sites pass the copy. Refs: REQ-DIST-016, REQ-CLI-004, REQ-DIST-002, REQ-LOOP-001, REQ-VER-001
  - `src/cli/gate.ts` validate spawn: add `env: childEnv()` to the options.
  - `src/init/init.ts` `detectOpenspec`: add `env: childEnv()` to the options of the version probe. The `SPECCTX_OPENSPEC` early return stays first.
  - `src/loop/openspec.ts` `openspecStatus`: add `env: childEnv()` to the options.
  - `src/verify/run.ts` `runVerify`: replace `...(env ? { env } : {})` with `env: childEnv(env)`. With no `env` passed the helper reads `process.env`, so the child sees the same variables as before minus the two. The rerun env of REQ-VER-007 keeps `CI` and `SPECCTX_RERUN`.
  - Each edited line carries `// REQ-DIST-016` next to the tag that the site already has.
- D3 The git spawns stay. Refs: REQ-DIST-016, REQ-CLI-009, REQ-ADOPT-008
  - `src/gate/rerun.ts` and `src/baseline/ratchet.ts` spawn `git`. The two variables do nothing there. An edit would add tags and tests for no behavior.
- D4 Tests, one file per site. Refs: REQ-DIST-016
  - `tests/util/env.test.ts`, new. SCN-DIST-016-5 on the helper: both variables gone, `npm_command` and `PATH` kept with the same values, and the input unchanged. SCN-DIST-016-4 covers the default argument.
  - `tests/cli/gate-npx.test.ts`, new. SCN-DIST-016-1. It writes a stub script under the temp project. The script tests `${npm_config_package+x}` (set, even if empty) and exits 1 when set. Otherwise it exits 0. It spawns `dist/cli.js gate --strict --root <root> --markdown "openspec/**/*.md decisions/*.md"` with `cleanEnv({ npm_config_package: "@fission-ai/openspec@1.0.0", npm_config_call: "specctx gate", SPECCTX_OPENSPEC: <stub> })`. It expects `validate: ok (strict)` and exit 0. A second case runs the stub itself with the variable through `spawnSync` and expects exit 1, so the test proves that the stub detects the variable.
  - `tests/init/npx-env.test.ts`, new. SCN-DIST-016-2. It follows `initWithFakeNpx` of `tests/init/init.test.ts`: a fake `npx` first on `PATH` that exits 1 when `npm_config_package` is in its environment and prints `9.9.9` otherwise. The spawn env comes from `cleanEnv({ ... })` with both variables and the fake `PATH`. It expects `openspec = "npx -y @fission-ai/openspec@9.9.9"` in `spec-ctx.toml` and no `note:` line.
  - `tests/loop/next.test.ts` gains one case for SCN-DIST-016-3. It calls `openspecStatus(root, <stub>, "x")` in process with both variables set on `process.env`. The test saves each value first and restores it in `afterEach`, as `tests/gate/rerun-*.test.ts` does for `SPECCTX_RERUN`. It never leaves the variables deleted. The stub exits 1 when `npm_config_package` is in its environment and prints `{"isPlanningComplete":true,"nextSteps":[]}` otherwise. It expects `ok: true` and `isPlanningComplete: true`.
  - `tests/verify/run.test.ts` gains one case for SCN-DIST-016-4. It runs `test -z "$npm_config_package" && test -z "$npm_config_call"` twice. The first run passes no env while the test holds both variables on `process.env`. The test saves each value first and restores it in `afterEach`. The second run passes an env object that holds both. Both runs report exit 0.
  - Every test file starts with `// Covers: REQ-DIST-016` and puts the REQ first. No test reaches the network. Each writes only under its temp dir. A test that spawns the CLI uses `cleanEnv`, so `SPECCTX_RERUN` is clear and `SPECCTX_JOURNAL` reads `0`.
- D5 Shared files, one task each. Refs: REQ-DIST-016
  - `src/util/env.ts` and `tests/util/env.test.ts` in task 1.1.
  - `src/cli/gate.ts`, `src/verify/run.ts`, `tests/cli/gate-npx.test.ts`, and `tests/verify/run.test.ts` in task 2.1.
  - `src/init/init.ts`, `src/loop/openspec.ts`, `tests/init/npx-env.test.ts`, and `tests/loop/next.test.ts` in task 3.1.
  - `CHANGELOG.md` in task 4.1. It gets a `## Unreleased` heading above `## 0.5.0`, since the file has none after the 0.5.0 release.
  - No help golden and no parity golden changes. `tests/parity/run.sh` runs no command through a nested `npx`.

## Risks

- A Verify command that reads `npm_config_package` on purpose loses it. No known command does. The CHANGELOG entry says so.
- `runVerify` now always passes an explicit `env`. Node copies the object into the child, so a Verify command still sees every other variable of the parent.
