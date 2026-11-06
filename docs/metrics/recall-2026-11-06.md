# Recall benchmark 2026-11-06

`scripts/recall.mjs` wrote this file (REQ-STAT-006). Recall counts the labels that a `context <task>` header line names, within the budget.

- Machine: linux x64, Intel(R) Xeon(R) Processor @ 2.10GHz. Node 22.23.4.
- spec-ctx commit: c085a9f486607de4215926315c65ff5710329f0b.

## spec-ctx

- Root commit: c085a9f486607de4215926315c65ff5710329f0b. Labels: `spec-ctx.json`, sha256 d8d60270b508131c8ccf0259f57dfb2c2518e8b9822b44bf4cb7fc7fb06acf0b.
- Budget: 8000 chars. Timed runs per task: 5.

| recall | reqs | code | tests | complete tasks | labels | median chars | max chars | p95 ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.70 (80/114) | 0.91 (49/54) | 0.57 (17/30) | 0.47 (14/30) | 8 of 20 | 114 | 7915 | 8469 | 140.2011 |

| task | matched | chars | misses |
| --- | --- | --- | --- |
| 045/1.1 | 6 of 7 | 7852 | `src/cli/commands.ts` |
| 045/2.1 | 3 of 4 | 7350 | `src/graph/related.ts` |
| 045/3.2 | 4 of 4 | 7881 | none |
| 045/4.1 | 3 of 3 | 8010 | none |
| 046/1.1 | 6 of 8 | 7845 | `src/index/build.ts`, `tests/index/determinism.test.ts` |
| 046/2.1 | 6 of 13 | 8444 | `src/graph/links.ts`, `src/graph/query.ts`, `src/graph/related.ts`, `tests/query/budget.test.ts`, `tests/query/plain.test.ts`, `tests/query/related.test.ts`, `tests/query/structural.test.ts` |
| 046/3.1 | 6 of 7 | 7820 | `src/cli/help.ts` |
| 047/2.1 | 6 of 8 | 8079 | `src/cli/args.ts`, `src/cli/commands.ts` |
| 047/3.1 | 6 of 6 | 7887 | none |
| 047/4.1 | 3 of 4 | 8246 | `REQ-TASK-002` |
| 048/2.1 | 6 of 8 | 7853 | `src/cli/args.ts`, `src/cli/help.ts` |
| 048/3.1 | 3 of 14 | 8469 | `REQ-LOOP-015`, `REQ-LOOP-016`, `src/loop/next.ts`, `tests/cli/nextstep.test.ts`, `tests/cli/run-prefix.test.ts`, `tests/loop/archive-stop.test.ts`, `tests/loop/gate-rerun-line.test.ts`, `tests/loop/gate-strict.test.ts`, `tests/loop/next.test.ts`, `tests/loop/plan-flag.test.ts`, `tests/loop/plan-stop.test.ts` |
| 048/4.1 | 3 of 4 | 8126 | `REQ-QRY-016` |
| 050/2.1 | 2 of 3 | 7871 | `src/cli/help.ts` |
| 050/3.1 | 2 of 2 | 7934 | none |
| 051/2.1 | 3 of 3 | 8019 | none |
| 051/2.2 | 2 of 2 | 7882 | none |
| 051/3.1 | 2 of 2 | 8100 | none |
| 052/1.1 | 7 of 11 | 8149 | `REQ-CHK-010`, `tests/baseline/baseline.test.ts`, `tests/check/evidence.test.ts`, `tests/check/strict.test.ts` |
| 053/1.2 | 1 of 1 | 7896 | none |

## OpenSpec-spec-ctx

- Root commit: 88991711f000a349714a6639523425dc4739b52a. Labels: `openspec-fixture.json`, sha256 4094ca4b78d75b7199f258211026b58e77207381bcbd20a194708836a750137a.
- Budget: 8000 chars. Timed runs per task: 5.

| recall | reqs | code | tests | complete tasks | labels | median chars | max chars | p95 ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.34 (64/189) | 0.34 (64/188) | 0.00 (0/1) | n/a (0/0) | 5 of 20 | 189 | 7515.5 | 8198 | 146.6414 |

| task | matched | chars | misses |
| --- | --- | --- | --- |
| add-change-stacking-awareness/2.1 | 6 of 7 | 7116 | `REQ-OC-013` |
| add-global-install-scope/2.2 | 2 of 14 | 8144 | `REQ-CI-017`, `REQ-CI-018`, `REQ-CLC-013`, `REQ-CLC-014`, `REQ-CU-008`, `REQ-CU-009`, `REQ-GC-007`, `REQ-IS-001`, `REQ-IS-002`, `REQ-IS-003`, `REQ-IS-004`, `REQ-IS-005` |
| add-global-install-scope/2.3 | 2 of 14 | 8198 | `REQ-CI-017`, `REQ-CI-018`, `REQ-CLC-013`, `REQ-CLC-014`, `REQ-CU-008`, `REQ-CU-009`, `REQ-GC-007`, `REQ-IS-001`, `REQ-IS-002`, `REQ-IS-003`, `REQ-IS-004`, `REQ-IS-005` |
| add-global-install-scope/3.2 | 2 of 14 | 8125 | `REQ-CI-017`, `REQ-CI-018`, `REQ-CLC-013`, `REQ-CLC-014`, `REQ-CU-008`, `REQ-CU-009`, `REQ-GC-007`, `REQ-IS-001`, `REQ-IS-002`, `REQ-IS-003`, `REQ-IS-004`, `REQ-IS-005` |
| add-global-install-scope/5.3 | 2 of 14 | 8154 | `REQ-CI-017`, `REQ-CI-018`, `REQ-CLC-013`, `REQ-CLC-014`, `REQ-CU-008`, `REQ-CU-009`, `REQ-GC-007`, `REQ-IS-001`, `REQ-IS-002`, `REQ-IS-003`, `REQ-IS-004`, `REQ-IS-005` |
| add-global-install-scope/5.5 | 2 of 14 | 8142 | `REQ-CI-017`, `REQ-CI-018`, `REQ-CLC-013`, `REQ-CLC-014`, `REQ-CU-008`, `REQ-CU-009`, `REQ-GC-007`, `REQ-IS-001`, `REQ-IS-002`, `REQ-IS-003`, `REQ-IS-004`, `REQ-IS-005` |
| add-global-install-scope/7.1 | 2 of 14 | 8136 | `REQ-CI-017`, `REQ-CI-018`, `REQ-CLC-013`, `REQ-CLC-014`, `REQ-CU-008`, `REQ-CU-009`, `REQ-GC-007`, `REQ-IS-001`, `REQ-IS-002`, `REQ-IS-003`, `REQ-IS-004`, `REQ-IS-005` |
| add-global-install-scope/7.2 | 2 of 14 | 8108 | `REQ-CI-017`, `REQ-CI-018`, `REQ-CLC-013`, `REQ-CLC-014`, `REQ-CU-008`, `REQ-CU-009`, `REQ-GC-007`, `REQ-IS-001`, `REQ-IS-002`, `REQ-IS-003`, `REQ-IS-004`, `REQ-IS-005` |
| add-global-install-scope/8.1 | 2 of 14 | 8106 | `REQ-CI-017`, `REQ-CI-018`, `REQ-CLC-013`, `REQ-CLC-014`, `REQ-CU-008`, `REQ-CU-009`, `REQ-GC-007`, `REQ-IS-001`, `REQ-IS-002`, `REQ-IS-003`, `REQ-IS-004`, `REQ-IS-005` |
| add-global-install-scope/8.5 | 2 of 14 | 8151 | `REQ-CI-017`, `REQ-CI-018`, `REQ-CLC-013`, `REQ-CLC-014`, `REQ-CU-008`, `REQ-CU-009`, `REQ-GC-007`, `REQ-IS-001`, `REQ-IS-002`, `REQ-IS-003`, `REQ-IS-004`, `REQ-IS-005` |
| add-tool-command-surface-capabilities/1.1 | 3 of 7 | 7432 | `REQ-CI-022`, `REQ-CU-010`, `REQ-CU-012`, `src/core/config.ts` |
| add-tool-command-surface-capabilities/2.6 | 3 of 6 | 7571 | `REQ-CI-022`, `REQ-CU-010`, `REQ-CU-012` |
| add-tool-command-surface-capabilities/3.2 | 3 of 6 | 7419 | `REQ-CI-022`, `REQ-CU-010`, `REQ-CU-012` |
| add-tool-command-surface-capabilities/3.5 | 3 of 6 | 7460 | `REQ-CI-022`, `REQ-CU-010`, `REQ-CU-012` |
| add-tool-command-surface-capabilities/4.3 | 3 of 6 | 7422 | `REQ-CI-022`, `REQ-CU-010`, `REQ-CU-012` |
| unify-template-generation-pipeline/1.2 | 5 of 5 | 5177 | none |
| unify-template-generation-pipeline/1.3 | 5 of 5 | 5215 | none |
| unify-template-generation-pipeline/3.2 | 5 of 5 | 5137 | none |
| unify-template-generation-pipeline/4.3 | 5 of 5 | 5118 | none |
| unify-template-generation-pipeline/5.3 | 5 of 5 | 5122 | none |
