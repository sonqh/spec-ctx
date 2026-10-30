# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root. Tests set `SPECCTX_OPENSPEC` to a stub, so none reaches the network.

## 1. The plan stop in the engine

- [x] 1.1 Add the plan stop rule to `decideNext` in `src/loop/next.ts`, per 034/D1. Give each test of `next` that expects `start` a resolved plan question first. Add the tests for SCN-LOOP-009-1 to SCN-LOOP-009-3 in `tests/loop/plan-stop.test.ts`. [REQ-LOOP-009, REQ-LOOP-005] Verify: `bun run build && bun test tests/loop tests/tasks tests/cli tests/gov`

## 2. Stale tasks named under a current task

- [x] 2.1 Append `stale waiting: ...` to the reason in the current task branch of `decideNext`, per 034/D4. Add the tests for SCN-LOOP-010-1 and SCN-LOOP-010-2 in `tests/loop/stale.test.ts`. [REQ-LOOP-010, REQ-LOOP-008] Verify: `bun run build && bun test tests/loop`

## 3. The block flag

- [x] 3.1 Add `--block` to `bundle` in `src/cli/args.ts`, `src/cli/commands.ts`, `src/cli/help.ts`, and `src/graph/bundle.ts`, per 034/D2. Add the tests for SCN-QRY-004-1 to SCN-QRY-004-3 in `tests/query/bundle.test.ts`. Run the parity script. [REQ-QRY-004, REQ-QRY-003] Verify: `bun run build && bun test tests/query tests/cli && bash tests/parity/run.sh`

## 4. The skill and the drift message

- [x] 4.1 Edit `skills/specctx-run/SKILL.md` per 034/D5. Run `bun run build && node dist/cli.js init --skills --force`. Change the message of `tests/init/drift.test.ts` per 034/D3. Update `tests/skills/overrides.test.ts` and add the tests for SCN-SKL-003-1 and SCN-SKL-006-1 to SCN-SKL-006-3. [REQ-SKL-003, REQ-SKL-006, REQ-SKL-002] Verify: `bun run build && bun test tests/skills tests/init/drift.test.ts`

## Workflow follow-up

- Run the steps under `operations.archive.guidance` in `openspec/config.yaml`.
- Archive with the command that `specctx next` prints.
- Run `npx -y @fission-ai/openspec@latest validate --all --strict` again before push.
