# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. Clips

- [x] 1.1 Rewrite `docs/demo/record.sh` per 012/D1: six recordings on one project, `docs/demo/clips/<n>-<name>.cast` and `.svg`, no caption inside a clip, `loop.txt` with a heading line per step. Remove `docs/demo/loop.svg` and `loop.cast`. Update `tests/gov/demo.test.ts` for SCN-GOV-008-1 to -3. [REQ-GOV-008] Verify: `bash docs/demo/record.sh && test ! -f docs/demo/loop.svg && bun test tests/gov/demo.test.ts`

## 2. README

- [x] 2.1 Rewrite the top of `README.md` per 012/D2 and D3 with the exact text of D2. Remove the old `## Demo` section. Update `tests/gov/readme.test.ts` for SCN-GOV-006-1 and -5. Lint. [REQ-GOV-006] Verify: `bun test tests/gov && node dist/cli.js lint tells --baseline 0 README.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation README.md`
- [ ] 2.2 Write `docs/verification/012.md`. Full gate. [REQ-GOV-001] Verify: `bun run ci:local`

## Workflow follow-up

- Run `check --strict` and `npx -y @fission-ai/openspec@latest validate --all --strict` before archive, and validate again after.
- Archive with `npx -y @fission-ai/openspec@latest archive 012-demo-clips -y`, then `build`.
