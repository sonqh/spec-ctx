# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root. Tests build git repos under a temp dir. Tests set `SPECCTX_OPENSPEC` to a stub, so none reaches the network.

## 1. The closed set

- [x] 1.1 Add `closedTasks(root, base)` in the new `src/gate/rerun.ts`, per 036/D2 and D3. Add the tests for SCN-VER-005-1 to SCN-VER-005-3 in `tests/gate/closed.test.ts`. [REQ-VER-005, REQ-IDX-005] Verify: `bun run build && bun test tests/gate/closed.test.ts`

## 2. Compare and group

- [x] 2.1 Add `compare`, `groupRuns`, and `formatMismatch` to `src/gate/rerun.ts`, per 036/D4 and D5. Add the tests for SCN-VER-006-1 to SCN-VER-006-6 and the pure part of SCN-VER-007-1 in `tests/gate/compare.test.ts`. [REQ-VER-006, REQ-VER-007] Verify: `bun run build && bun test tests/gate/compare.test.ts`

## 3. The command

- [x] 3.1 Add `--rerun` and `--base` to `gate` in `src/cli/args.ts`, `src/cli/commands.ts`, `src/cli/help.ts`, and `src/cli/gate.ts`, per 036/D5 and D6. Add the tests for SCN-CLI-009-1 to SCN-CLI-009-5 and SCN-VER-007-2 to SCN-VER-007-3 in `tests/gate/rerun-cli.test.ts`. Record the help goldens. Run the parity script. [REQ-CLI-009, REQ-VER-007, REQ-CLI-004] Verify: `bun run build && bun test tests/gate tests/cli && bash tests/parity/run.sh`

## Workflow follow-up

- Run the steps under `operations.archive.guidance` in `openspec/config.yaml`.
- Archive with the command that `specctx next` prints.
- Run `npx -y @fission-ai/openspec@latest validate --all --strict` again before push.
