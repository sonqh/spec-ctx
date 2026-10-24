# Tasks

## 1. Install spec-ctx

- [x] 1.1 Add `scripts/specctx.sh` that runs `npx -y github:sonqh/spec-ctx#<pinned commit> "$@"`. Add `spec-ctx.toml` with the agentrc capability codes from ADR-005 and ignore globs `tests/fixtures/**`, `tests/golden/**`, `**/__pycache__/**`. [REQ-GOV-005] Verify: `bash scripts/specctx.sh --version && bash scripts/specctx.sh build`
- [x] 1.2 Run `specctx init --skills`. Remove `.claude/skills/bootstrap-context` and the `.agents` symlink. Update `CLAUDE.md`, `README.md`, `DELEGATION.md` for the loop. [REQ-GOV-006] Verify: `test -d .claude/skills/specctx-bootstrap && test ! -e .claude/skills/bootstrap-context`

## 2. Retire the engine specs

- [x] 2.1 After archive, run `specctx id retire` for the 12 REQ-CTX and 5 REQ-BOOT IDs, each reason naming its spec-ctx replacement as in the delta specs. [REQ-GOV-002] Verify: `grep -c "spec-ctx" decisions/retired-ids.md | grep -x 17`
- [x] 2.2 Remove `tools/ctx/`, `tests/ctx/`, the `test:ctx` script and the Python part of `test` in `package.json`. [REQ-GOV-006] Verify: `! grep -rl ctx.py --exclude-dir=archive --exclude-dir=docs --exclude-dir=openspec --exclude-dir=.ctx --exclude-dir=node_modules --exclude-dir=.git . && bun run test`

## 3. Gates

- [x] 3.1 Rewrite `.githooks/pre-commit` to call `scripts/specctx.sh check`. Replace the ctx steps in `.github/workflows/ci.yml` with `uses: sonqh/spec-ctx@main` and input `specctx: bash scripts/specctx.sh`. Remove the skill diff step. [REQ-GOV-005] Verify: `bash .githooks/pre-commit && grep -c "sonqh/spec-ctx" .github/workflows/ci.yml | grep -x 1`
- [x] 3.2 Backfill evidence for every `[x]` task in `openspec/changes/archive/` with `specctx task done <id> --manual "migrated from python ctx"`, or the equivalent batch the CLI offers. [REQ-GOV-004] Verify: `bash scripts/specctx.sh check --strict`
- [x] 3.3 Add `scripts/ci-local.sh` and `.githooks/pre-push`. Make CI run the same steps, on `main` and pull requests only, with `concurrency` and `cancel-in-progress`. Add the rule to `CLAUDE.md`: run `bash scripts/ci-local.sh` before every push. [REQ-GOV-005] Verify: `bash scripts/ci-local.sh && grep -q cancel-in-progress .github/workflows/ci.yml`

## 4. Close

- [x] 4.1 Write `docs/verification/007.md`. Run the gates. [REQ-GOV-001] Verify: `bash scripts/specctx.sh check --strict && npx -y @fission-ai/openspec@latest validate --all --strict`

## Workflow follow-up

- Archive with `/opsx:archive 007-adopt-spec-ctx` with 2.1 open. Then run 2.1 and close it in the archived tasks.md. After archive delete `openspec/specs/context-engine/` and `openspec/specs/session-bootstrap/` if they are empty shells, run `openspec validate --all --strict` again, then `specctx build`, then push.
