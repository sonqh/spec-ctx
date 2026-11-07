# Tasks

Run `bun run build` before every Verify. Tests write only under a temp dir and never reach the network. Each shared file changes in one task only.

## 1. The rule

- [x] 1.1 Write the tests first. Add `tests/index/scan-glob.test.ts` with SCN-IDX-015-1 to SCN-IDX-015-4 and these cases. The default glob keeps `main` for `openspec/specs`. The default `openspec/changes/archive/x.md` gives `main` (065/D2). A change named like its capability, `work/changes/index/specs/index/spec.md`, keeps its folder. A `**/*.md` glob listed first does not hide the second glob. A custom glob task is an active change in `src/tasks/tasks.ts` (065/D5). Add to `tests/query/file-mentions.test.ts` a case where `related <file>` under `work/changes/**` finds one mention of the active task and none of the archived one. Add to `tests/query/structural.test.ts` a case where `related change/a` lists its delta edges under a custom glob. Then add `src/index/changepath.ts` with one function. Call it from `changeOf` and `scanner` in `src/index/scan.ts` and from `structureEntries` in `src/index/structure.ts`. Pass the rules through `structure`, `folderOf`, and `structuralEdges` in `src/graph/links.ts`, through `src/graph/related.ts`, and from `src/graph/bundle.ts` and `src/cli/commands.ts`, as 065/D1 to D4 say. Tag the code `REQ-IDX-015`. `tests/parity/run.sh` must pass with no `--record`. [REQ-IDX-015] Verify: `bun run build && bun test tests/index tests/query tests/tasks tests/gate tests/cli tests/gov && npx vitest run tests/index tests/query && bash tests/parity/run.sh && bun run typecheck`

## 2. Docs

- [x] 2.1 In `docs/reference.md`, under the `[scan]` block, add a short paragraph. The change name is the first folder under the fixed prefix of the `changes` glob. A file directly under the prefix is `main`. `check`, `next`, and `gate --rerun` still read `openspec/changes`. [REQ-IDX-015] Verify: `bun run build && bun test tests/gov tests/cli && node dist/cli.js lint tells --baseline 0 docs/reference.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation docs/reference.md`

## 3. Record

- [x] 3.1 Reproduce issue #29 in a temp dir with the built CLI after the fix. Write `docs/verification/065.md`. It holds these parts. The reproduction before (0.6.0, `main/1.1` twice) and after (`a/1.1`, `b/1.1`). The tests. The edge of 065/D4. The out of scope list of 065/D5. The goldens recorded, or none. The deviations. Add a paragraph under `## Unreleased` in `CHANGELOG.md`, headed `Change 065-scan-glob.`, that names issue #29 and REQ-IDX-015. [REQ-IDX-015] Verify: `grep -q "#29" CHANGELOG.md && grep -q "REQ-IDX-015" CHANGELOG.md && grep -q "a/1.1" docs/verification/065.md && node dist/cli.js lint tells --baseline 0 docs/verification/065.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation docs/verification/065.md`
