# Tasks

Run `bun run build` before every Verify. Tests write only under a temp dir. `CHANGELOG.md` and `docs/verification/055.md` change only in task 2.1.

## 1. The test

- [ ] 1.1 Write SCN-GOV-001-2 in `tests/gov/governance.test.ts` first, as 055/D2 says, and add `Covers: REQ-GOV-001` if it is missing. Run the file on the current code. The new case must fail on the `deferred:` line. Then drop the `deferred: ` lines in both cases, as 055/D1 says. [REQ-GOV-001] Verify: `bun run build && bun test tests/gov/governance.test.ts && npx vitest run tests/gov/governance.test.ts && bun run typecheck`

## 2. Record

- [ ] 2.1 Write `docs/verification/055.md` with the sections `## Before the fix` and `## After the fix`. Before: the failing line of 055/D3 and the failing output of task 1.1. After: the passing run of the file, and `bun run ci:local` exit 0 while 055 is active. Add a paragraph under `## Unreleased` in `CHANGELOG.md`, headed `Change 055-governance-deferred.`, that names REQ-GOV-001. Both files follow the writing rules of `CLAUDE.md`. [REQ-GOV-001] Verify: `bun run build && node dist/cli.js lint tells --baseline 0 docs/verification/055.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation docs/verification/055.md && grep -q "## Before the fix" docs/verification/055.md && grep -q "Change 055-governance-deferred." CHANGELOG.md`
