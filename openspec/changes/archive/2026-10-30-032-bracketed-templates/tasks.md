# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. The bracket form at install

- [x] 1.1 Add `bracketForm` to `src/init/init.ts` and read `brackets` in `runInit`, per 032/D1 and 032/D2. Pass the form to `plan()` and `mergeConfig`. Add the tests for SCN-SCH-006-1 to SCN-SCH-006-3 in `tests/init/brackets.test.ts`. [REQ-SCH-006, REQ-SCH-003] Verify: `bun run build && bun test tests/init tests/schema && bash tests/parity/run.sh`

## 2. The flip

- [x] 2.1 Write a template that holds the other form, per 032/D3. Replace a config item that holds the other form, per 032/D4. Add the tests for SCN-SCH-007-1 to SCN-SCH-007-4 in `tests/init/brackets.test.ts`. [REQ-SCH-007, REQ-DIST-002] Verify: `bun run build && bun test tests/init tests/schema tests/cli`

## 3. The fresh path

- [x] 3.1 Add `tests/paths/fresh-brackets.sh` for SCN-SCH-006-4, per 032/D5. Run it from `scripts/ci-local.sh` and `.github/workflows/ci.yml` after `fresh.sh`. Change the `brackets` line of `README.md` to name the templates and the rules. [REQ-SCH-006, REQ-GOV-004] Verify: `bun run build && bash tests/paths/fresh-brackets.sh && bash tests/paths/fresh.sh`

## Workflow follow-up

- Run the steps under `operations.archive.guidance` in `openspec/config.yaml`.
- Archive with the command that `specctx next` prints.
- Run `npx -y @fission-ai/openspec@latest validate --all --strict` again before push.
