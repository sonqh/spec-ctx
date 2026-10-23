# Tasks

## 1. Index shape

- [x] 1.1 Add `text`, `canonical`, and `scanned` to the index. Skip `tests/fixtures/**` and `node_modules/**`. Keep output deterministic. [REQ-CTX-001, REQ-CTX-002] Verify: tests for SCN-CTX-001-1, SCN-CTX-002-1, SCN-CTX-002-2 in `tests/ctx/test_build.py`.
- [x] 1.2 Implement canonical selection and make `by_id` return the canonical entry. [REQ-CTX-009] Verify: tests for SCN-CTX-009-1, SCN-CTX-009-2, SCN-CTX-009-3.
- [x] 1.3 Index design decisions as kind `decision`. [REQ-CTX-011] Verify: test for SCN-CTX-011-1 on a fixture change.
- [x] 1.4 Keep build under 1 s on the 2,000 file fixture. [REQ-CTX-003] Verify: `tests/ctx/test_perf.py` passes.

## 2. Query and related

- [x] 2.1 Token AND over id, title, text. Ranking. `--all`, `--limit`. No truncation. Status column. [REQ-CTX-004] Verify: tests for SCN-CTX-004-1 to SCN-CTX-004-4 in `tests/ctx/test_query.py`.
- [x] 2.2 Provenance and reasons in `related`. Canonical only by default. [REQ-CTX-012] Verify: test for SCN-CTX-012-1.

## 3. Bundle

- [x] 3.1 Canonical text, provenance header per block, decisions section, named omitted IDs in the trailer. [REQ-CTX-006] Verify: tests for SCN-CTX-006-1 to SCN-CTX-006-5 in `tests/ctx/test_bundle.py`.

## 4. Stale detection and status

- [x] 4.1 Store `scanned` and compare on every command. Rebuild on mismatch with `index rebuilt` on stderr. [REQ-CTX-010] Verify: tests for SCN-CTX-010-1 and SCN-CTX-010-2.
- [x] 4.2 `status` with no active change: last archived, open questions from handoff. [REQ-CTX-008] Verify: tests for SCN-CTX-008-1 and SCN-CTX-008-2 in `tests/ctx/test_status.py`.

## 5. Check rules

- [x] 5.1 Add `code-tag-no-canonical` and strict `scenario-untested`. Keep every existing rule. [REQ-CTX-007] Verify: tests for SCN-CTX-007-4 and SCN-CTX-007-5 in `tests/ctx/test_check.py`. SCN-CTX-007-3 passes on this repo after any new findings are fixed by adding the missing scenario names to tests.

## 6. Skill and docs

- [x] 6.1 Update `.claude/skills/bootstrap-context/SKILL.md` for the new `status` output and the open questions step. Update the command table in `CLAUDE.md`. [REQ-BOOT-002] Verify: SCN-BOOT-002-2 described in the skill. Both linters exit 0 on both files.
- [x] 6.2 Write `docs/verification/006.md`. Run `ctx check --strict`, `openspec validate --all --strict`, both linters. [REQ-GOV-001] Verify: all exit 0.

## Workflow follow-up

- Archive with `/opsx:archive 006-ctx-accuracy`, then `python3 tools/ctx/ctx.py build`.
