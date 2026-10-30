# Tasks

Run `bun run build` before every Verify. Tests write only under a temp dir, clear `SPECCTX_RERUN` before they run the CLI or a script, and never reach the network. A task that edits a `.ts` file also runs `bun run typecheck`. README, CHANGELOG, and `docs/verification/042.md` change only in task 5.1.

## 1. The action file

- [x] 1.1 In `action.yml`, reword the `description` of `rerun` and of `base` so neither holds `${{`, and quote the one that holds `: `, per 042/D1. Write `tests/action/yaml-quotes.sh`. It takes a file and fails on a `description:` value that holds `${{`, quoted or not, and on an unquoted one that holds `: `. Call it from `tests/action/selftest.sh` on `action.yml`, and on two temp copies, a plain scalar with `: ` and a quoted value with `${{`, which must fail. No YAML parser is in `package.json` or `node_modules`, so the task adds no dependency. No help text or golden changes. [REQ-DIST-014] Verify: `bun run build && bash tests/action/yaml-quotes.sh action.yml && bash tests/action/selftest.sh`

## 2. The gate log

- [x] 2.1 Add `strict: boolean` to `appendGateLog` in `src/cli/gate.ts`. `runGate` and the `finish` of `runRerun` pass `o.strict`. In `lastGate` of `src/loop/next.ts`, count a line only when `ok` is true and `strict` is true, per 042/D2. Write `tests/loop/gate-strict.test.ts` for SCN-LOOP-011-3 with a plain pass, a pass without the key, and a strict pass. Write the case for SCN-STAT-005-7 in `tests/cli/gate.test.ts`. Add `strict: true` to the hand-written gate log lines of `tests/loop/next.test.ts`, `tests/loop/archive-stop.test.ts`, `tests/loop/gate-rerun-line.test.ts`, and `tests/cli/nextstep.test.ts`. Update the key list in `tests/cli/gate.test.ts` and add the key check to `tests/gate/rerun-cli.test.ts`. A grep of `tests/` shows that no golden holds a gate log line, so none changes. [REQ-LOOP-011, REQ-STAT-005] Verify: `bun run build && bun test tests/loop tests/cli tests/gate tests/stats tests/gov && bun run typecheck`

## 3. The rerun base

- [x] 3.1 Add `baseProblem` to `src/gate/rerun.ts` and call it in `runRerun` of `src/cli/gate.ts` before `closedTasks`, per 042/D3. Forty zeros print the zero line and pass. A base that git cannot resolve prints the fetch line and fails. Both write the rerun log line, and `--json` prints the usual object. Write `tests/gate/rerun-base.test.ts` for SCN-VER-013-1 and SCN-VER-013-2 on a temp git repo from `tests/gate/gitrepo.ts`. Add a zero base case to `tests/action/rerun.sh` that runs `action/run.sh` with the real CLI on a temp repo. A grep of `tests/` shows that `tests/gate/rerun-cli.test.ts`, `tests/gate/rerun-head.test.ts`, and `tests/action/rerun.sh` touch the base. No golden holds these lines, so none changes. [REQ-VER-013] Verify: `bun run build && bun test tests/gate && bash tests/action/rerun.sh && bun run typecheck`

## 4. The Covers parser

- [x] 4.1 In `scanSource` of `src/index/scan.ts`, replace `COVER_TAG` with a read of the rest of the line after `Covers:` and collect each match of `\bREQ-[A-Z]{2,6}-\d{3}\b`, per 042/D4. `SCN_RE` stays, so scenario naming does not change. Write `tests/index/covers.test.ts` for SCN-IDX-007-1, SCN-IDX-007-2, and SCN-IDX-007-3 with mixed IDs, a space, `;`, an SCN ID first, and a four digit suffix. The test builds the string `Covers:` with the `COVERS` helper so the scan does not read it. Run `tests/parity/run.sh` and `tests/index`. If a parity golden changes, record it with `run.sh --record` and note it in task 5.1. [REQ-IDX-007] Verify: `bun run build && bun test tests/index tests/check && bash tests/parity/run.sh && bun run typecheck`

## 5. Docs

- [x] 5.1 Add the entries to `## Unreleased` in `CHANGELOG.md`. Update the push note in the action section of `README.md` for the zero base and the missing base. Write `docs/verification/042.md` like `docs/verification/041.md`, with a note for any parity golden. All three pass both lints. [REQ-VER-013, REQ-STAT-005] Verify: `bun run build && node dist/cli.js lint tells --baseline 0 docs/verification/042.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation docs/verification/042.md && grep -q "042" CHANGELOG.md && bash tests/action/rerun-docs.sh`
