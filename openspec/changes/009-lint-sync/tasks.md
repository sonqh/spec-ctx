# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root. The oracle is `/home/claude/ste-humanize-skill/scripts` at commit `60bc25ad7b5bd35f7fa14d5586d5b0e79a08e722`.

## 1. Lint sync

- [ ] 1.1 Add `ORACLE_SHA` and the HEAD check to `tests/lint/parity.sh` per 009/D1. Port the two rule fixes into the tells rule table per 009/D2. Add the oracle's new selftest cases. Add a unit test for SCN-LINT-001-4. Re-record with `SPECCTX_LINT_ORACLE=/home/claude/ste-humanize-skill/scripts bash tests/lint/parity.sh --record`. Review the golden diff: only files with a dash contrast or an inflected stock word may change. [REQ-LINT-001] Verify: `SPECCTX_LINT_ORACLE=/home/claude/ste-humanize-skill/scripts bash tests/lint/parity.sh && bun test tests/lint`

## 2. Wording

- [ ] 2.1 Replace `0 finding(s)` with `0 findings` in `openspec/changes/003-distribution/specs/check/spec.md` (REQ-CHK-001 text and SCN-CHK-003-1) and `openspec/changes/003-distribution/specs/schema-bundle/spec.md` (SCN-SCH-002-1). Wording only. [REQ-GOV-001] Verify: `test $(grep -rc "0 finding(s)" openspec/changes/003-distribution | awk -F: '{s+=$2} END {print s}') -eq 0 && npx -y @fission-ai/openspec@latest validate 003-distribution --strict`

## 3. README

- [ ] 3.1 Rewrite the first sentence per 009/D4 with the ratio and file name from `docs/metrics/2026-10-25.md`. Add `## Why` with three lines after the excerpt, each with a metric from that file. Extend `tests/gov/readme.test.ts` for SCN-GOV-006-3. Lint. [REQ-GOV-006] Verify: `bun test tests/gov && head -3 README.md | grep -q "Verify" && head -3 README.md | grep -q "2026-10-25" && node dist/cli.js lint tells --baseline 0 README.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation README.md`
- [ ] 3.2 Write `docs/verification/009.md`. List every golden that changed with the rule that caused it. Full gate. [REQ-GOV-001] Verify: `bun run ci:local`

## Workflow follow-up

- Run `check --strict` and `npx -y @fission-ai/openspec@latest validate --all --strict` before archive, and validate again after.
- Archive with `/opsx:archive 009-lint-sync`, then `build`.
