# Design

## Context

- `detectOpenspec()` in `src/init/init.ts` returns `SPECCTX_OPENSPEC` when the env var is set, and runs no command. Else it runs `npx -y @fission-ai/openspec@latest --version`.
- `Project.runIn` in `tests/helpers.ts` sets the env var for an `init` call, so the tests that use the helper never run `npx`. The two try tests spawn bash with `cleanEnv()` and skip that path.
- `tests/fixtures/openspec-stub.sh` answers `status --change <c> --json` with a complete plan (030/D4).

## Goals / Non-Goals

**Goals:**
- No test in the vitest run calls `npx`, except `tests/adopt/write.test.ts`.
- `scripts/try.sh` needs no network, as REQ-GOV-013 says.

**Non-Goals:**
- A change to the README block, to `init`, or to the engine.
- A CI step that installs OpenSpec.

## Decisions

- D1 The fix goes where the network call starts. `scripts/try.sh` exports `SPECCTX_OPENSPEC` as `sh "$root/tests/fixtures/openspec-stub.sh"`, right after `unset SPECCTX_RERUN`. It overrides a value from the shell. The script is a demo of the local build. A real OpenSpec adds time and a network failure, and shows nothing more. Refs: REQ-GOV-013
- D2 The README test passes the same value with `OPENSPEC_STUB` from `tests/helpers.ts` in the `cleanEnv()` extra. The block keeps `npx -y spec-ctx` and no env var, because a user runs it with the network. Refs: REQ-GOV-012
- D3 The guard is a recording `npx`. Each test writes a shell script named `npx` into a fresh temp dir outside the run `TMPDIR`. The script appends its arguments to a file and exits 1. The test puts that dir first on the `PATH` of the spawn. After the run, the test expects that the file does not exist. Exit 1 makes a missed call fail fast, with no download. The dir is outside the run `TMPDIR`, so SCN-GOV-013-2 still sees an empty `TMPDIR`. Refs: REQ-GOV-012, REQ-GOV-013
- D4 No CI step installs OpenSpec. A warm cache would hide the race and the network use of the next test. The guard of D3 catches it instead. `tests/adopt/write.test.ts` keeps its real call. It is the only check that upstream OpenSpec accepts the headers that `adopt` writes. The path tests in `tests/paths/` run one after the other in the bun leg and are out of scope. Refs: REQ-ADOPT-002
- D5 Evidence for the cause. A logging `npx` on the `PATH` for one full `npx vitest run` recorded five calls: two `@latest --version` and two `@1.16.0 status` from the try tests, and one `@latest validate` from `write.test.ts`. The CI log of c4e3449 shows `ENOTEMPTY` under `~/.npm/_npx/20f2b75ddc8bce88` for the `@latest` spec. `docs/verification/053.md` keeps both. Refs: REQ-GOV-013

## Risks / Trade-offs

- The try story no longer shows the real `status` output of OpenSpec. The stand-in reports a complete plan, and the add-mfa plan of the fixture is complete too. The asserted lines did not change in the spike.
- A future test that spawns the CLI without the helper can reach the network again. The guard covers only the two try tests. A wider guard is a separate change.
