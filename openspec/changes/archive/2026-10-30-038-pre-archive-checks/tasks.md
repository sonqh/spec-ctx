# Tasks

Run `bun run build` before every Verify. Tests write only under a temp dir, clear `SPECCTX_RERUN` before an in-process CLI run, and never reach the network.

## 1. The delta rule

- [x] 1.1 In `src/check/check.ts`, report `scenario-untested` for a delta scenario of an active change when its change has no open task, per 038/D1 and D2. Update the hint in `src/check/hints.ts`. Add tests in `tests/check/delta.test.ts` for SCN-CHK-008-1, SCN-CHK-008-2, and SCN-CHK-008-3. [REQ-CHK-008] Verify: `bun run build && bun test tests/check`

## 2. The skills refresh

- [x] 2.1 In `src/init/init.ts`, skip the `.gitignore` write on a skills refresh, per 038/D3. Add a test in `tests/init/skills-refresh.test.ts` for SCN-DIST-013-1 and SCN-DIST-013-2. [REQ-DIST-013] Verify: `bun run build && bun test tests/init`

## 3. The id error

- [x] 3.1 In `src/ids/ids.ts`, name the right command for a code like `CLI-009`, per 038/D4. Add a test in `tests/ids/new.test.ts` for SCN-IDS-005-1 and SCN-IDS-005-2. [REQ-IDS-005] Verify: `bun run build && bun test tests/ids`

## Workflow follow-up

- Run the steps under `operations.archive.guidance` in `openspec/config.yaml`.
- Archive with the command that `specctx next` prints.
- Run `npx -y @fission-ai/openspec@latest validate --all --strict` again before push.
