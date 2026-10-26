# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. Engine

- [x] 1.1 Add `src/cli/color.ts` with `paint(kind, text)` per 010/D5. Use it for the `done <task>` line, the `Verify failed` line, hard finding lines and `stale-evidence` in `check`, `next:` lines, and the `check` summary line. Never in `--json`. Add tests for the three REQ-CLI-008 scenarios. [REQ-CLI-008] Verify: `bun test tests/cli && bash tests/parity/run.sh`
- [x] 1.2 `task done` prints `Verify failed (exit <n>). The task stays open.` after the output on a non-zero exit. Update the test for SCN-TASK-003-2 and the `specctx-done` skill text that describes a failed Verify. [REQ-TASK-003] Verify: `bun test tests/tasks tests/skills`

## 2. Demo

- [x] 2.1 Rewrite `docs/demo/record.sh` per 010/D4: five captions, the failing `task done` first, the heredoc edit, the `git diff` of `tasks.md`, the stale check. `git init` and one commit in the fixture after adopt. Record with `FORCE_COLOR=1`. Write `docs/demo/loop.cast`, `loop.svg`, `loop.txt`. Add `tests/gov/demo.test.ts` for the two REQ-GOV-008 scenarios. [REQ-GOV-008] Verify: `bash docs/demo/record.sh && bun test tests/gov/demo.test.ts`

## 3. README

- [x] 3.1 Rewrite the top of `README.md` per 010/D1 to D3: tagline, audience line, `## The problem`, `## What spec-ctx does` table, `## Demo`, `## Quickstart`. Move every metric number into `## Measured` before `## Contribute`, with the total row of the newest `docs/metrics/*.md` and one line per column. Keep Install, Two paths, The loop, Commands, Config reference, Markdown linters, GitHub Action, Status, Contribute, License. Update `tests/gov/readme.test.ts` for the new SCN-GOV-006-1 and -3. Lint. [REQ-GOV-006] Verify: `bun test tests/gov && node dist/cli.js lint tells --baseline 0 README.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation README.md`
- [x] 3.2 Write `docs/verification/010.md`. Full gate. [REQ-GOV-001] Verify: `bun run ci:local`

## Workflow follow-up

- Run `check --strict` and `npx -y @fission-ai/openspec@latest validate --all --strict` before archive, and validate again after.
- Archive with `/opsx:archive 010-readme-story`, then `build`.
