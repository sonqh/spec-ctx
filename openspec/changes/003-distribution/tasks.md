# Tasks

## 1. Schema bundle

- [x] 1.1 Fork `spec-driven` into `schemas/spec-driven-ids/`. Add ID placeholders and the allocation, Refs, and Verify instructions. Add the config fragment. [REQ-SCH-001, REQ-SCH-003] Verify: `bash tests/schema/validate.sh`
- [x] 1.2 Build a fixture project, write one change with the bundle, archive it, and check IDs survive. [REQ-SCH-002] Verify: `bash tests/schema/roundtrip.sh`

## 2. Skills

- [x] 2.1 Write the three skills under `skills/`. Lint. Count lines. [REQ-SKL-001] Verify: `bun test tests/skills/lint.test.ts`
- [x] 2.2 Implement `init --schema`, `init --skills`, `init --all`, `--force`, and the drift test for skill copies. [REQ-DIST-002, REQ-SKL-002] Verify: `bun test tests/init/*.test.ts`

## 3. Publish

- [x] 3.1 Add `.github/workflows/release.yml`: on tag, `bun run build`, `npm publish`, `bun build --compile` for three targets, upload to the release. [REQ-DIST-004] Verify: `bun run build && node dist/cli.js --version && bun build --compile src/cli.ts --outfile /tmp/specctx && /tmp/specctx --version`
- [x] 3.2 Add `action.yml` and a self-test workflow that uses it on this repo. [REQ-DIST-005] Verify: `bash tests/action/selftest.sh`
- [ ] 3.3 Publish `v0.1.0`. Smoke test `npx spec-ctx@0.1.0 --version` in a clean temp dir. [REQ-DIST-004] Verify: `cd $(mktemp -d) && npx -y spec-ctx@0.1.0 --version`

## 3b. Pre-publish adoption

- [x] 3.4 Add the `prepare` script (Node only, no Bun), make the action accept a `github:` version, document both install forms. [REQ-DIST-008] Verify: `cd $(mktemp -d) && npx -y github:sonqh/spec-ctx#main --version`
- [x] 3.5 Add the `manual-evidence` warning to `check --strict` and fix the SCN-CHK-002-1 example ID to `REQ-XX-003` in the test fixture. [REQ-CHK-002, REQ-CHK-003] Verify: `bun test tests/check/`

- [x] 3.6 Implement `specctx gate`. Ship `scripts/*-lint.py` in the package. Make `action/run.sh` call `gate`. [REQ-CLI-004, REQ-DIST-005] Verify: `bun test tests/cli/gate.test.ts && node dist/cli.js gate --strict`
- [x] 3.7 Add `scripts/ci-local.sh`, `.githooks/pre-push`, the `ci:local` script, the `CLAUDE.md` rule, CI `concurrency` and path filter. [REQ-GOV-004, REQ-GOV-005] Verify: `bash scripts/ci-local.sh && bun test tests/gov/ci-parity.test.ts`

## 4. Dogfood

- [x] 4.1 Migrate agentrc by implementing its change `007-adopt-spec-ctx` (in /home/claude/agentrc) with the git install from 3.4, archive it there, push, confirm CI. [REQ-DIST-006] Verify: `gh run list --repo sonqh/agentrc --limit 1 --json conclusion --jq '.[0].conclusion' | grep success`
- [x] 4.2 Remove `tools/ctx/` and the Python run from `tests/parity/run.sh`. Keep the goldens and `--record`. Hooks call `specctx` only. Scrub `ctx.py` from CLAUDE.md and DELEGATION.md. [REQ-DIST-007, REQ-DIST-003] Verify: `bash tests/parity/run.sh && ! grep -rl ctx.py src tests/parity/run.sh scripts skills schemas .githooks .github CLAUDE.md README.md DELEGATION.md`

## 5. Docs

- [x] 5.1 README: what it is, install, the loop in six commands, config reference, a 60 second asciinema or GIF of `init --all` then `task next` then `task done`. [REQ-GOV-003] Verify: `python3 scripts/tells-lint.py --baseline 0 README.md && python3 scripts/ste-lint.py --baseline 0 --disable synonym-rotation README.md`
- [x] 5.2 Write `docs/upstream-issue.md`: the problem in OpenSpec terms, the link to their parallel merge plan, the ID scheme, the numbers from agentrc, what is offered. Do not open the issue. [REQ-GOV-003] Verify: `python3 scripts/tells-lint.py --baseline 0 docs/upstream-issue.md`
- [ ] 5.3 Encode the engine fixes already made: SCN-IDS-003-3, SCN-CHK-001-4, SCN-CHK-001-5, SCN-DIST-003-2 as tests. Write `docs/verification/003.md`. Run the full gate. [REQ-GOV-001, REQ-IDS-003, REQ-CHK-001] Verify: `bun test && node dist/cli.js check --strict && npx -y @fission-ai/openspec@latest validate --all --strict`

## Workflow follow-up

- Archive with `/opsx:archive 003-distribution`, then `specctx build`.
