# Proposal

## Why

CI fails on `main` since change 051. The `code (node)` job of the run on c4e3449 failed, and so does PR #9. The failed test is `tests/adopt/write.test.ts` SCN-ADOPT-002-1. Its `npx -y @fission-ai/openspec@latest validate` exits with `npm error code ENOTEMPTY` in `~/.npm/_npx/20f2b75ddc8bce88`.

The cause is in the two tests that 051 added. `tests/gov/try-readme.test.ts` runs the README block, and `tests/gov/try-script.test.ts` runs `scripts/try.sh`. Both spawn the CLI with `cleanEnv()`, and `SPECCTX_OPENSPEC` is not set. So `init` runs `npx -y @fission-ai/openspec@latest --version`, and `status` runs `npx -y @fission-ai/openspec@<version> status`. A full `npx vitest run` with a logging `npx` on the `PATH` records five OpenSpec calls. One comes from `write.test.ts`. The other four come from the two try tests. Vitest runs test files in parallel workers. Two `npx` calls with the same package spec install into the same `_npx` directory at the same time, and npm fails. `bun test` runs files one after the other, so only the node leg fails.

This also breaks two rules that exist. REQ-GOV-013 says that `scripts/try.sh` needs no network. Decision 022/D3 says that tests never hit the network. ADR-008 item 4 allows bug fixes during the freeze, and this is one.

## What changes

- `scripts/try.sh` exports `SPECCTX_OPENSPEC` as the OpenSpec stand-in `tests/fixtures/openspec-stub.sh`. It sets it always, so a value in the shell of the user cannot bring the network back. `init` then writes that command and runs nothing. `status` and `next` run the stand-in.
- `tests/gov/try-readme.test.ts` passes `SPECCTX_OPENSPEC` with the stand-in to the block. The README block itself does not change. A user of the block has the network and gets the real OpenSpec.
- Both tests put a recording `npx` first on the `PATH` and expect no call. This is the regression guard.
- `tests/adopt/write.test.ts` stays as it is. It is the one test that checks the output with the real upstream OpenSpec. After this change, no other test in the vitest run calls `npx`.
- Spec: MODIFIED REQ-GOV-012 with the new scenario SCN-GOV-012-4, and MODIFIED REQ-GOV-013 with the new scenario SCN-GOV-013-4.

## Layers and benefit

- A bug fix in layer 2 test support. No engine code changes.
- CI on `main` and on every pull request turns green again, so the benchmark PRs of ADR-008 get a clean signal.
- The try story stops waiting on npm. The spike ran `scripts/try.sh` in 1.1 s with no `npx` call.

## Out of scope

- A CI step that installs OpenSpec before the tests. It would hide the next test that reaches the network.
- Any change to the README block, to `init`, or to the engine.
- A version bump.
