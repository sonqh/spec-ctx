# Design

## Context

- The README has `## What spec-ctx adds`, then `## See it work`, then `## Quickstart`. `tests/gov/readme.test.ts` checks that order and reads the table between `What spec-ctx adds` and `See it work`. The new section sits between them and holds no line that starts with `| `.
- `docs/demo/record.sh` builds the demo project. It copies `tests/fixtures/no-id-repo`, adds `docs/demo/specs/`, and runs `init`. Its bundle footer reads 2155 chars, 10.9 percent of 19702 chars of spec text.
- The toy project of the README is tiny. Its bundle footer reads `bundle 578 chars, 110.7% of 522 chars of spec text`, because the bundle adds provenance lines.
- A trial run of the block on the local `dist/` exited 0 under bash 3.2.57 (`/bin/bash` on macOS) and under the default shell. `refused, as expected` and `done add-mfa/1.1` both printed.
- `tests/helpers.ts` holds `TAG`, `COVERS`, `REPO`, and `Project`. It has no helper for a clean environment.

## Goals / Non-Goals

**Goals:**
- A stranger copies one block and sees the loop and a lookup by file.
- A test fails when the block stops working.
- A clone owner runs one script for the same story on a richer project.
- The north star is measured: wall time and command count from paste to the first `context` that holds a code line.

**Non-Goals:**
- Any change to the CLI.
- A recording or an asciinema dependency.

## Decisions

- D1 Layer 1 first run. The block runs `context add-mfa/1.1` and `context src/login.ts` after the loop, not the loop alone. The loop steps stay because ADR-008 item 1 names `status`, `task next`, and `task done`. Refs: ADR-007, REQ-GOV-012
- D2 The block is the verified block of the owner. Prose around it may change, the commands may not. It uses `npx -y spec-ctx`. The `sed -i.bak ... && rm ...tasks.md.bak` line works with BSD sed and GNU sed. The block has no `sed -i` without a suffix. Refs: REQ-GOV-012
- D3 The README test extracts the text between the two markers and strips the code fence lines. It replaces every `npx -y spec-ctx` with `node <root>/dist/cli.js`, writes the result to a file in a temp dir, and runs `bash <file>` with that temp dir as the working directory. The block starts with `mkdir -p spec-ctx-try && cd spec-ctx-try`, so the temp dir keeps the repository clean. The environment comes from `cleanEnv()` (D11), so the test also passes inside a git hook. The spawn timeout is 45 seconds and the test timeout is 60 seconds, because bun and vitest default to 20 seconds. Refs: REQ-GOV-012
- D4 The test checks exit 0, the line `refused, as expected`, and the line `done add-mfa/1.1`. It does not compare the whole output, because the published version can print a different `status` line from the local build. It checks the position and the markers too (SCN-GOV-012-2) and the two notes (SCN-GOV-012-3). Refs: REQ-GOV-012
- D5 Bash 3.2. The block uses no array, no `mapfile`, no `${var,,}`. The test runs the block under the `bash` on the PATH. When `/bin/bash` exists and is not the same file as that bash, it runs the block again under `/bin/bash`. On macOS that is 3.2.57. On Linux CI both are bash 5, so the second run is skipped. Refs: REQ-GOV-012
- D6 `scripts/try.sh` follows `docs/demo/record.sh` for the project: copy the fixture, copy `docs/demo/specs/`, run `init`. It does not use the sed of `record.sh` before `adopt`. It follows the README order instead: `init`, `adopt`, then cite. Refs: REQ-GOV-013
- D7 How `try.sh` picks its task. The fixture is not the toy, so the REQ ID differs. The script does not hard-code it. After `adopt`, it runs `specctx query "Second factor" --change add-mfa --kind req --json` and parses the output with `node -e`. The query matches terms in the text too. On this fixture it returns two hits. REQ-UA-004 matches by title. REQ-UA-003 matches because its text says "second factor". So the parse keeps the hits whose `title` is exactly `Second factor`. It fails with a clear message unless exactly one such hit remains. Task `add-mfa/1.3` is the open task of the fixture. The script writes the citation and a `Verify:` span into that task line with `sed -i.bak`, then removes the backup. The test file gets the `Covers` line with the same ID. On the current fixture the ID is REQ-UA-004. Refs: REQ-GOV-013
- D8 Headings. Before each step the script prints `== <n>. <what>`. Steps: copy the project, `init`, `adopt`, cite the task, `status`, `task next`, `task start`, a refused `task done`, the edit and a passing `task done`, `context add-mfa/1.3`, `context src/login.ts`, `handoff write`. The refused step prints `refused, as expected` as in the README. The `context add-mfa/1.3` step is the north star command of ADR-008. After the edit and the passing `task done`, its output holds the code tag line of `src/login.ts` and the test line. `context src/login.ts` is an extra step after it. Refs: REQ-GOV-013
- D9 Cleanup. `mktemp -d`, then `trap 'rm -rf "$work"' EXIT`. The script never writes inside the repository. It runs with `set -euo pipefail`, and it unsets `SPECCTX_RERUN` for its own run. It checks that `dist/cli.js` exists and tells the user to run `bun run build` if not. `mktemp -d` honors `TMPDIR`, so a test can give each run its own `TMPDIR`. Refs: REQ-GOV-013
- D10 The `try.sh` test gives each run its own `TMPDIR`, a fresh dir under the test temp dir. After the run it asserts that this `TMPDIR` is empty. For "no new file in the repository" it compares `git status --porcelain` before and after, with the `GIT_*` variables cleared. It reads the footer `-- bundle <n> chars, <p>% of <m> chars of spec text` and expects <p> under 25. The measured value is 10.9. It asserts that the output after the `== ` heading of `context add-mfa/1.3` holds `src/login.ts` itself, not only a test line. There is no failure-injection case, because a copy of the script would break its root resolution. The spawn timeout is 45 seconds and the test timeout is 60 seconds. Refs: REQ-GOV-013
- D11 `tests/helpers.ts` gets `cleanEnv()`. It returns a copy of `process.env` without `SPECCTX_RERUN` and without every key that starts with `GIT_`. Both new tests use it for every spawn. Refs: REQ-GOV-012, REQ-GOV-013
- D12 Requirement home. Both requirements go in `spec-governance`, next to REQ-GOV-008 (the demo story). No new capability. Refs: REQ-GOV-012, REQ-GOV-013
- D13 CI. Both tests run in `bun run test` and `bun run test:node`, which are steps of `bun run ci:local`. `ci-local.sh` needs no new step. Refs: REQ-GOV-004
- D14 The owner decided that the block runs `npx -y spec-ctx context add-mfa/1.1` right after the passing `task done` and before `context src/login.ts`. The README test asserts that this output holds `src/login.ts`. The test splits the output at the command boundary, so it finds the `src/login.ts` line that belongs to that command. The test keeps the block and the required lines in two constants. Refs: REQ-GOV-012
- D15 Measure. The verification record gives two numbers. They are the wall time and the command count from the paste to the first `context` that holds a code line. In the block that is `context src/login.ts`. The count includes every `npx` call before it. The run against the published `spec-ctx@0.4.1` gives the time for a stranger, with the download. Refs: REQ-GOV-012
- D16 Shorter README. The README had 419 lines, and the stranger of ADR-008 needs the Try it section near the top. The owner asked on 2026-11-03 to shorten it. The reference sections move to `docs/reference.md`: Install, Two paths, the context budget rules, Commands, Config reference, environment variables, Markdown linters, and the Action rerun. The moved text is not cut. The README keeps every part that a test locks. A removed anchor of the README gets a link to `docs/reference.md`. `docs/reference.md` falls under the `docs/**/*.md` glob of `[gate] markdown`, so the linters cover it. Refs: REQ-GOV-006, REQ-GOV-012

## Risks / Trade-offs

- Drift. `npx -y spec-ctx` runs the published version, and the test runs the local build. After a CLI change that is not yet released, the README can promise an output that npm users do not get. Mitigation: the test checks only exit 0 and two stable lines. A manual run against the published version goes in the verification record.
- Time. The README block runs about ten CLI calls, near 2 seconds. `try.sh` runs about the same.
- `status` shows the plan approval `next:` line in the README toy, because the toy has a design file. The notes under the block say so.
