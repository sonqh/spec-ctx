# Tasks

Run `bun run build` before every Verify. Tests write only under a temp dir and never reach the network. Each shared file changes in one task only.

## 1. Measure

- [x] 1.1 In `scripts/recall.mjs` add `body_recall`, `body_counts`, `body_omitted_mean`, and `truncated_mean` to each repo of the report and to the markdown, as 064/D1 and D2 say. Tag the code `REQ-STAT-008`. Write the cases of SCN-STAT-008-1 to SCN-STAT-008-3 in `tests/stat/recall.test.ts` first. Leave `bench/recall/*.json` as it is. [REQ-STAT-008] Verify: `bun run build && bun test tests/stat && npx vitest run tests/stat && node scripts/recall.mjs --labels bench/recall/spec-ctx.json --root . --check && git diff --quiet -- bench/recall && bun run typecheck`

## 2. The fill rule

- [x] 2.1 Write `tests/query/repeat-lines.test.ts` first, with SCN-QRY-027-1 to SCN-QRY-027-3. Add four more cases. Lines 9 and 100 of one file prove the string order. Class 5 and 7 cards fill before class 2 cards. `context <file>` with two lines in one file keeps both cards. SCN-QRY-020-1 still holds when two lines share a file. Then, in `src/graph/bundle.ts`, give the second and later line cards of a file class 7. Give the `named by` cards class 5. Fill both after `bodies(0)`, as 064/D5 says. Tag the code `REQ-QRY-027`. The tests of `tests/query`, `tests/tasks`, `tests/gov`, `tests/journal`, `tests/stat`, and `tests/cli` passed on the prototype and must stay as they are. If one fails, edit it in this task and name it in `docs/verification/064.md` (task 4.1). The parity golden `tests/fixtures/parity-golden/bundle.out` did not change on the prototype. If `bash tests/parity/run.sh` fails, record it with `bash tests/parity/run.sh --record`. [REQ-QRY-027, REQ-QRY-021] Verify: `bun run build && bun test tests/query tests/tasks tests/gov tests/journal tests/stat tests/cli && npx vitest run tests/query tests/tasks && bash tests/parity/run.sh && node scripts/recall.mjs --labels bench/recall/spec-ctx.json --root . --check && bun run typecheck`

## 3. Docs

- [x] 3.1 In `docs/reference.md`, next to the sentence on `| body omitted`, add one sentence. A repeat line card of a file and a `named by` card fill after the bodies of cited requirements. They can go to `truncated:`. [REQ-QRY-027] Verify: `bun run build && bun test tests/gov tests/cli && node dist/cli.js lint tells --baseline 0 docs/reference.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation docs/reference.md`

## 4. Record

- [x] 4.1 Run `bash scripts/recall.sh --out <tmp> --date 2026-11-07` and time `context 046/2.1` over 5 runs. Write `docs/verification/064.md`. It holds the before and after table of 064/D8 for both repos. It names the 2 lost labels of 064/D6, the candidate table of 064/D3, the goldens recorded or none, and the deviations. State that recall is at or above the target of 0.95. Add a paragraph under `## Unreleased` in `CHANGELOG.md`, headed `Change 064-body-recall.`, that names REQ-QRY-027 and REQ-STAT-008. [REQ-STAT-008, REQ-QRY-027] Verify: `grep -q "REQ-STAT-008" CHANGELOG.md && grep -q "REQ-QRY-027" CHANGELOG.md && grep -q "body_omitted_mean" docs/verification/064.md && grep -q "truncated_mean" docs/verification/064.md && git diff --quiet -- bench/recall && node dist/cli.js lint tells --baseline 0 docs/verification/064.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation docs/verification/064.md`
