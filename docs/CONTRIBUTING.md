# Contributing to spec-ctx

This page is for maintainers. The README is for users.

## Develop

```bash
bun install
bun run build
bun run test          # Bun
bun run test:node     # Node 22
node dist/cli.js status
git config core.hooksPath .githooks
```

The engine was first built and used inside [sonqh/agentrc](https://github.com/sonqh/agentrc). The specs of spec-ctx live in `openspec/` and the decisions in `decisions/`. `CLAUDE.md` holds the session loop and the hard rules.

Run `bun run ci:local` before every push. It runs the CI steps on this machine. The `pre-push` hook runs it too.

## Layout

| Path | Content |
| --- | --- |
| `src/index/` | The scan of specs, changes, decisions, code tags, and test tags. It writes `.ctx/index.json`. |
| `src/graph/` | `query`, `related`, and `bundle` over the index. |
| `src/check/` | The rules of `check` and the fix hint of each rule. |
| `src/tasks/`, `src/verify/` | The task state machine, the Verify runner, and the evidence files. |
| `src/ids/`, `src/adopt/`, `src/baseline/` | ID allocation, adopt for projects without IDs, and the debt baseline. |
| `src/handoff/`, `src/stats/` | The handoff file and the metrics. |
| `src/lint/` | The two markdown linters. |
| `src/cli/` | The argument parser, the help table, the commands, and `gate`. |
| `schemas/`, `skills/` | The schema bundle and the skills that `init` installs. |
| `action/`, `action.yml` | The GitHub Action. |
| `tests/` | Tests for Bun and vitest. `tests/fixtures/` holds sample projects and goldens. The scan skips it. |
| `openspec/`, `decisions/` | The specs, the changes, and the decision records of spec-ctx. |
| `docs/` | The verification record of each change, the metrics, and the demo. |

## IDs

| Kind | Pattern | Example |
| --- | --- | --- |
| Requirement | `REQ-<CAP>-<NNN>` | `REQ-IDX-003` |
| Scenario | `SCN-<CAP>-<NNN>-<n>` | `SCN-IDX-003-2` |
| Decision record | `ADR-<NNN>` | `ADR-002` |
| Design decision | `<key>/D<n>` | `002/D3` |
| Task | `<key>/<group>.<n>` | `002/3.2` |

The key of a change folder like `002-ids` is `002`. The key of a folder like `add-mfa` is `add-mfa`. Every command also accepts the full folder name. `decisions/ADR-002-id-scheme.md` has the full scheme.

Tag code with a comment `// REQ-IDX-003`. Tag tests with `// Covers: REQ-IDX-003`. Link IDs with a line `Refs: REQ-IDX-001, ADR-002`. Get a new ID with `specctx id new REQ IDX`. Retire an ID with `specctx id retire REQ-IDX-009 "merged into REQ-IDX-003"`.

## Gate steps

`specctx gate` runs these steps in order and stops at the first failure:

1. `check`. With `--strict` it also checks test coverage and evidence.
2. Both markdown linters on the markdown globs, with baseline 0.
3. `openspec validate --all`. With `--strict` it runs in strict mode.
4. The 500 character limit on each requirement in the deltas of active changes.

Each run appends one line to `.ctx/gate-log.jsonl`. The line holds `at`, `ok`, `failed_step`, `duration_s`, and `steps`. `specctx stats` reads the last 100 lines.

The pre-commit hook runs `check --strict` and both linters on the staged markdown. The CI and `bun run ci:local` run `gate --strict`, the tests on Bun and Node, the parity harness, and the install tests.
