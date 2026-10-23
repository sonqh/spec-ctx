# Tasks

## 1. ID allocation

- [x] 1.1 Implement `id new` for REQ, SCN, ADR, DEC with `--for`, `--count`, `--json`, and the unknown-cap error. [REQ-IDS-001, REQ-IDS-002] Verify: `bun test tests/ids/new.test.ts`
- [x] 1.2 Implement `id retire` with the in-use guard. [REQ-IDS-003] Verify: `bun test tests/ids/retire.test.ts`

## 2. Verify runner

- [x] 2.1 Implement Verify parsing from code spans, `sh -c` run, timeout, output tail. [REQ-VER-001, REQ-VER-003] Verify: `bun test tests/verify/parse.test.ts tests/verify/run.test.ts`
- [x] 2.2 Implement `task verify` dry run. [REQ-VER-002] Verify: `bun test tests/verify/dry.test.ts`

## 3. Task workflow

- [x] 3.1 Implement `task next` with group order and `--json`. [REQ-TASK-001] Verify: `bun test tests/tasks/next.test.ts`
- [x] 3.2 Implement `task start` with the bundle and `.ctx/current.json`. [REQ-TASK-002] Verify: `bun test tests/tasks/start.test.ts`
- [x] 3.3 Implement `task done`: run Verify, write evidence with sorted keys and file digests, flip only the checkbox characters, `--manual`. [REQ-TASK-003, REQ-TASK-004] Verify: `bun test tests/tasks/done.test.ts tests/tasks/evidence.test.ts`
- [x] 3.4 Implement `task reopen`. [REQ-TASK-005] Verify: `bun test tests/tasks/reopen.test.ts`

## 4. Handoff

- [x] 4.1 Implement `handoff write`, `ask`, `resolve`, and the `status` lines. [REQ-HND-001, REQ-HND-002, REQ-HND-003] Verify: `bun test tests/handoff/*.test.ts`

## 5. Check and CLI

- [x] 5.1 Add the three evidence rules to `check --strict`. [REQ-CHK-003] Verify: `bun test tests/check/evidence.test.ts`
- [x] 5.2 Add the new commands to the CLI with help groups and lazy imports. Lint help text. [REQ-CLI-001, REQ-CLI-003] Verify: `bun test tests/cli/*.test.ts && node dist/cli.js --help | python3 scripts/ste-lint.py --baseline 0`

## 6. Dogfood on this repo

- [x] 6.1 From this task on, tick tasks only with `specctx task done`. Backfill evidence for the tasks of 001 and 002 done before this point with `--manual "pre-dogfood"`. [REQ-TASK-003, REQ-CHK-003] Verify: `node dist/cli.js check --strict`
- [ ] 6.2 Update the bootstrap skill and `CLAUDE.md` to the new flow: `status`, `task next`, `task start`, work, `task done`, `handoff write`. Write `docs/verification/002.md`. [REQ-HND-001, REQ-GOV-001] Verify: `node dist/cli.js check --strict && npx -y @fission-ai/openspec@latest validate --all --strict`

## Workflow follow-up

- Archive with `/opsx:archive 002-ids-and-tasks`, then `specctx build`.
