# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. Rule

- [x] 1.1 The `retitle-needs-renamed` rule in `src/check/check.ts`, the `detail` field on `Finding`, the finding line in `checkText`, and the hint in `src/check/hints.ts`, per 021/D1 to 021/D4. Add the test for SCN-CHK-001-7 in `tests/check/base.test.ts`, per 021/D5. [REQ-CHK-001] Verify: `bun run build && bun test tests/check tests/cli/cli.test.ts`

## 2. Record

- [x] 2.1 The README check section names the rule. Add the change to the unreleased section of `CHANGELOG.md`. Write `docs/verification/021.md`. Full gate. [REQ-GOV-001, REQ-CHK-001] Verify: `bun run ci:local`

## Workflow follow-up

- Archive with `npx -y @fission-ai/openspec@latest archive 021-retitle-needs-renamed -y`, then `build`, `handoff write`, `stats --write`.
