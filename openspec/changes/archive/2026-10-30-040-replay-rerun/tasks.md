# Tasks

Run `bun run build` before every Verify. Tests write only under a temp dir, clear `SPECCTX_RERUN` before they run the CLI or the script, and never reach the network.

## 1. The replay script

- [x] 1.1 Write `scripts/replay-rerun.sh` per 040/D1 to D4. Write `tests/replay/replay.test.ts` for SCN-VER-008-1 to SCN-VER-008-6, The tests use a temp git repo with a root commit and three commits that close tasks with evidence. The Verify commands are deterministic, always failing against exit 0, and alternating through a counter file outside the worktree. No source, help text, or golden changes. [REQ-VER-008] Verify: `bun run build && bun test tests/replay`

## 2. The guide

- [x] 2.1 Write `docs/verification/replay-rerun.md` with the exact commands to replay spec-ctx and an external repository, the output files, and the exit codes. It passes both lints. [REQ-VER-008] Verify: `node dist/cli.js lint tells --baseline 0 docs/verification/replay-rerun.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation docs/verification/replay-rerun.md && grep -q 'scripts/replay-rerun.sh . --since' docs/verification/replay-rerun.md`

## Workflow follow-up

- Run the steps under `operations.archive.guidance` in `openspec/config.yaml`.
- Archive with the command that `specctx next` prints.
- Run `npx -y @fission-ai/openspec@latest validate --all --strict` again before push.
