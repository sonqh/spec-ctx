# Tasks

## 1. Project setup

- [x] 1.1 Create `package.json` (name `spec-ctx`, bin `specctx`, `type: module`, engines node >=22), `tsconfig.json`, `bun` scripts for `build`, `test`, `typecheck`, `lint`. Add `smol-toml`. [REQ-DIST-001] Verify: `bun install && bun run typecheck`
- [x] 1.2 Write `spec-ctx.toml` for this repo and implement config loading with defaults and `specctx init`. [REQ-DIST-002] Verify: `bun test tests/config.test.ts`
- [x] 1.3 Build the parity fixture under `tests/fixtures/parity-repo/`. Copy the agentrc openspec tree and decisions. Add a few tagged src and test files and planted findings for check. Add `tests/parity/run.sh` that runs the Python engine only and records its outputs as goldens. [REQ-DIST-003] Verify: `bash tests/parity/run.sh --record`

## 2. Index

- [x] 2.1 Implement the scan: markdown IDs, Refs lines, design decisions, code and test tags, ignore globs. [REQ-IDX-001] Verify: `bun test tests/index/scan.test.ts`
- [x] 2.2 Implement the record shape, canonical selection, sorted deterministic JSON, `scanned` record. [REQ-IDX-002, REQ-IDX-003] Verify: `bun test tests/index/canonical.test.ts tests/index/determinism.test.ts`
- [x] 2.3 Implement stale detection and the rebuild on every command. Add the 2,000 file perf fixture generator and the timing test. [REQ-IDX-004] Verify: `bun test tests/index/stale.test.ts tests/index/perf.test.ts`

## 3. Query, related, bundle

- [ ] 3.1 Implement `query` with token AND, scoring, flags. [REQ-QRY-001] Verify: `bun test tests/query/query.test.ts`
- [ ] 3.2 Implement `related` with reasons. [REQ-QRY-002] Verify: `bun test tests/query/related.test.ts`
- [ ] 3.3 Implement `bundle` with provenance lines, fixed order, budget, trailer. [REQ-QRY-003] Verify: `bun test tests/query/bundle.test.ts`

## 4. Check

- [ ] 4.1 Implement the base rules including `code-tag-no-canonical` and `unknown-cap`. [REQ-CHK-001, REQ-GOV-002] Verify: `bun test tests/check/base.test.ts`
- [ ] 4.2 Implement strict rules. Ignore `.ctx/evidence/**`. [REQ-CHK-002, REQ-CHK-003] Verify: `bun test tests/check/strict.test.ts`

## 5. CLI

- [ ] 5.1 Implement the command surface, root discovery, `status`, exit codes, `--json`, lazy imports, help text. [REQ-CLI-001, REQ-CLI-002, REQ-CLI-003] Verify: `bun test tests/cli/*.test.ts && node dist/cli.js --help | python3 scripts/ste-lint.py --baseline 0`

## 6. Parity and gates

- [ ] 6.1 Make the parity harness run both engines and diff. Fix differences. A Python bug found this way is fixed in both engines and noted in `docs/verification/001.md`. [REQ-DIST-003, REQ-IDX-002, REQ-QRY-003, REQ-CHK-002] Verify: `bash tests/parity/run.sh`
- [ ] 6.2 Write `.github/workflows/ci.yml` with jobs `specs` (validate, check, linters) and `code` on a Bun and a Node 22 matrix. Update `.githooks/pre-commit` to call `specctx` when `dist/` exists, else the Python engine. [REQ-GOV-003, REQ-DIST-001] Verify: `bash .githooks/pre-commit`
- [ ] 6.3 Write `docs/verification/001.md`. Tag code and tests. Run `specctx check --strict`, `openspec validate --all --strict`, both linters. [REQ-GOV-001] Verify: `node dist/cli.js check --strict && npx -y @fission-ai/openspec@latest validate --all --strict`

## Workflow follow-up

- Archive with `/opsx:archive 001-engine-port`, then rebuild the index with the TypeScript engine.
