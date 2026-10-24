# Tasks

## 1. Small fixes

- [ ] 1.1 Add the `cwd=` prefix to the Verify runner and evidence. [REQ-VER-004] Verify: `bun test tests/verify/cwd.test.ts`
- [ ] 1.2 Add the 500 character length check to `gate`. [REQ-CLI-005] Verify: `bun test tests/cli/gate-length.test.ts`
- [ ] 1.3 Order archived changes by `archived` time in `status`. [REQ-CLI-001] Verify: `bun test tests/cli/status-archived.test.ts`

## 2. Linter port

- [ ] 2.1 Build the corpus and goldens: this repo's markdown, agentrc markdown at a pinned commit copied into `tests/fixtures/lint-corpus/`, and both selftests. `tests/lint/parity.sh --record` writes the Python output. [REQ-LINT-001] Verify: `bash tests/lint/parity.sh --record && test -n "$(ls tests/fixtures/lint-golden/)"`
- [ ] 2.2 Port `tells-lint` as a rule table with one unit test per rule. [REQ-LINT-001, REQ-LINT-002] Verify: `bun test tests/lint/tells.test.ts`
- [ ] 2.3 Port `ste-lint` as a rule table with one unit test per rule. [REQ-LINT-001, REQ-LINT-002] Verify: `bun test tests/lint/ste.test.ts`
- [ ] 2.4 Wire `specctx lint tells|ste` with all flags and `--selftest`. Make parity green. [REQ-LINT-001] Verify: `bash tests/lint/parity.sh`
- [ ] 2.5 Switch `gate`, `ci-local.sh`, the hooks, and the action to `specctx lint`. Remove the Python scripts from the package, the repo, and the README. [REQ-LINT-003] Verify: `bun test tests/cli/gate.test.ts && ! ls scripts/*.py 2>/dev/null`

## 3. Close

- [ ] 3.1 Write `docs/verification/006.md`. Full gate. [REQ-GOV-001] Verify: `bash scripts/ci-local.sh`

## Workflow follow-up

- Archive with `/opsx:archive 006-polish`, then `specctx build`.
- Then open follow-up tasks in agentrc and ste-humanize-skill to replace `scripts/*-lint.py` with `specctx lint`.
