# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. Engine

- [x] 1.1 `task start` prints the footer line per 011/D6. Reuse the spec text size that `stats` computes. `bundle` stays unchanged. Add a test for SCN-TASK-002-3. [REQ-TASK-002] Verify: `bun test tests/tasks tests/query && bash tests/parity/run.sh`

## 2. Demo

- [x] 2.1 Rewrite `docs/demo/record.sh` per 011/D7: six captions, the fixture before adopt, pauses of 1.2 seconds, typing delay 0.02 seconds. Record with `FORCE_COLOR=1`. Write `loop.cast`, `loop.svg`, `loop.txt`. Update `tests/gov/demo.test.ts` for the new SCN-GOV-008-1. [REQ-GOV-008] Verify: `bash docs/demo/record.sh && bun test tests/gov/demo.test.ts`

## 3. README

- [ ] 3.1 Rewrite the top of `README.md` per 011/D1 to D5 and D8. Keep Install and every later section. Update `tests/gov/readme.test.ts` for SCN-GOV-006-1 and add SCN-GOV-006-4. Lint. [REQ-GOV-006] Verify: `bun test tests/gov && node dist/cli.js lint tells --baseline 0 README.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation README.md`
- [ ] 3.2 Write `docs/verification/011.md`. Full gate. [REQ-GOV-001] Verify: `bun run ci:local`

## Workflow follow-up

- Run `check --strict` and `npx -y @fission-ai/openspec@latest validate --all --strict` before archive, and validate again after.
- Archive with `npx -y @fission-ai/openspec@latest archive 011-context-story -y`, then `build`.
