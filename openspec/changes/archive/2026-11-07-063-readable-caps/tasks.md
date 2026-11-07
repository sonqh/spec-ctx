# Tasks

Run `bun run build` before every Verify. Tests write only under a temp dir and never reach the network. Each shared file changes in one task only.

## 1. Family codes

- [x] 1.1 Write the tests first in `tests/adopt/caps.test.ts`: SCN-ADOPT-012-1 to SCN-ADOPT-012-3 with temp projects on the no-ID fixture, and a unit case for `codeCandidates("cli-config", true)`. Run them and see the family cases fail. Then add the family set and the second argument to `codeCandidates` and `deriveCode` in `src/adopt/plan.ts`, and compute the families in `planAdopt` as 063/D1 to 063/D4 say. Add `families` to the plan. [REQ-ADOPT-012, REQ-ADOPT-004] Verify: `bun run build && bun test tests/adopt && npx vitest run tests/adopt/caps.test.ts && bun run typecheck`

## 2. The report and the dry run

- [x] 2.1 Print one `family:` line per family in the dry run and in the report, and add `families` to the dry run JSON, as 063/D5 says. Files: `src/adopt/write.ts`, `src/adopt/report.ts` if it exists, else the report function in `write.ts`, and a case in `tests/adopt/dry-run.test.ts` or the file that tests the dry run output. [REQ-ADOPT-012] Verify: `bun run build && bun test tests/adopt tests/cli && npx vitest run tests/adopt && bun run typecheck`

## 3. Measure and record

- [x] 3.1 Clone the OpenSpec fork at 8899171 into a temp dir, remove its `spec-ctx.toml`, run `init` and `adopt --dry-run --json`, and list the `cli-*` codes. Do the same with the build before this change for the before column. Write `docs/verification/063.md` with both columns and the family lines. Add a paragraph under `## Unreleased` in `CHANGELOG.md`, headed `Change 063-readable-caps.`, that names REQ-ADOPT-012. [REQ-ADOPT-012] Verify: `grep -q "REQ-ADOPT-012" CHANGELOG.md && grep -q "CLICON" docs/verification/063.md && node dist/cli.js lint tells --baseline 0 docs/verification/063.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation docs/verification/063.md`
