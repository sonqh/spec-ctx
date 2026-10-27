# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. Gate command

- [x] 1.1 `spec-ctx.toml` gets `[gate] openspec` with the default `npx -y @fission-ai/openspec@latest`, per 018/D1 and 018/D3. `init` writes the key with a comment. Add a test in `tests/config.test.ts` for the key and raise the key count of SCN-DIST-002-2 to 13. [REQ-DIST-002] Verify: `bun run build && bun test tests/config.test.ts`
- [x] 1.2 `gate` runs the command in `[gate] openspec` and the env var `SPECCTX_OPENSPEC` overrides it, per 018/D2. Add a test for SCN-CLI-004-6 and SCN-DIST-002-9 in `tests/cli/gate.test.ts`. Update the help of `gate` in Strict mode. [REQ-CLI-004, REQ-DIST-002] Verify: `bun run build && bun test tests/cli/gate.test.ts tests/cli && bash tests/paths/fresh.sh && bash tests/paths/existing.sh`

## 2. Init

- [x] 2.1 `init` prints the `templates:` line after the schema step, per 018/D5. Add a test for SCN-SCH-003-5 in `tests/init/init.test.ts`. [REQ-SCH-003] Verify: `bun run build && bun test tests/init/init.test.ts`

## 3. Record

- [x] 3.1 The README fresh block shows `openspec init --tools <tool>` and the existing path names `[gate] openspec`, per 018/D4. Add the change to the unreleased section of `CHANGELOG.md`. Write `docs/verification/018.md`. Full gate. [REQ-GOV-001] Verify: `bun run ci:local`

## Workflow follow-up

- Archive with `npx -y @fission-ai/openspec@latest archive 018-gate-openspec -y`, then `build`, `handoff write`, `stats --write`.
