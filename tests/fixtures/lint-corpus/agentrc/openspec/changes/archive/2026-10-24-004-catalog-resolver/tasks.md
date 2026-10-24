# Tasks

## 1. Resolver

- [x] 1.1 Implement reference parsing and source validation. [REQ-CAT-001] Verify: test for SCN-CAT-001-1 and a parse table test.
- [x] 1.2 Implement the `cct` source adapter with sparse git fetch. [REQ-CAT-002] Verify: integration test against a pinned commit of davila7/claude-code-templates, skipped when offline.
- [x] 1.3 Implement the `skills` source adapter via `npx skills add` into a temp dir. [REQ-CAT-002] Verify: integration test with one known skill, skipped when offline. SCN-CAT-002-1 unit test with a mocked source.
- [x] 1.4 Implement canonical tar digest and cache layout. [REQ-CAT-003] Verify: test for SCN-CAT-003-1.
- [x] 1.5 Implement content safety checks. [REQ-CAT-008] Verify: tests for symlink, path escape, oversized file, and a `.exe`.

## 2. Lockfile and offline

- [x] 2.1 Write resolved refs and digests to the lockfile and make compile read the digest. [REQ-CAT-004] Verify: test for SCN-CAT-004-1 with two temp homes.
- [x] 2.2 Implement digest mismatch detection. [REQ-CAT-005] Verify: test for SCN-CAT-005-1 with a mocked source that returns a different digest.
- [x] 2.3 Verify offline apply and the missing-digest message. [REQ-CAT-006] Verify: test for SCN-CAT-006-1 with network disabled in the test environment.
- [x] 2.4 Implement `update`. [REQ-CAT-007] Verify: test for SCN-CAT-007-1.

## 3. Verification

- [x] 3.1 End-to-end: profile with two skills and one MCP, `resolve`, `plan`, `apply`, `revert` on a temp home. [REQ-CAT-004, REQ-APPLY-007] Verify: `tests/e2e/catalog.test.ts` passes.
- [x] 3.2 Tag code and tests, run `ctx check --strict`, `openspec validate --all --strict`, both linters. [REQ-GOV-001] Verify: all exit 0.

## Workflow follow-up

- Archive with `/opsx:archive 004-catalog-resolver`, then `python3 tools/ctx/ctx.py build`.
