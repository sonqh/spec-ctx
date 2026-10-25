# Proposal

## Why

A product review on 2026-10-25 ran spec-ctx as a stranger would. The engine held up. The first run did not.

- Task IDs use the text before the first `-` of the change folder. OpenSpec names changes `add-mfa`, so the task becomes `add/1.1`. Two changes `add-mfa` and `add-sso` collide, the second one cannot close, and `check` reports nothing. This is data loss for most users outside this repo.
- `stats` prints `gate_runs n/a` for every user, because only this repo's `ci-local.sh` writes the gate log. `specctx gate` itself writes nothing.
- `id new` in a fresh project fails with `unknown-cap` and no hint, because the default config has an empty `caps` list.
- `specctx <cmd> --help` prints the same 70 line page for every command. `lint --help` prints a page in another style. `check` lists 159 findings with no summary and no fix hint. `status` writes `.ctx/` into any folder, even one without `openspec/`.
- The README opens with a 165 kB SVG and a transcript. The first sentence of value is on line 50. The first install command is the npm form, which returns 404 until publish.

## What Changes

- A change key replaces the number prefix. A folder that starts with digits and a dash keeps the digits as its key. Any other folder uses its full name. The full folder name is always accepted as an alias. `check` fails on two changes with one key.
- `specctx gate` appends its own line to `.ctx/gate-log.jsonl`. `scripts/ci-local.sh` stops appending.
- An empty `caps` list accepts every code that matches the CAP pattern. The `unknown-cap` message says how to add a code.
- Every command gets its own `--help` page in one style. `check` prints a summary line and groups findings by rule with one fix hint per rule. `status`, `task next`, `init`, and `adopt` end with a next step. `status` outside an OpenSpec project exits 2 and writes nothing. `init` with nothing to do exits 0. `adopt` with nothing to adopt writes no report.
- The README leads with one sentence of value, a three command quickstart with the working install form first, and a real output excerpt. Maintainer sections move to `docs/`.

Out of scope: color output, new metrics, changes to the bundle format, anything in agentrc or ste-humanize-skill.

## Capabilities

### Modified Capabilities
- `index`: the change key.
- `check`: the duplicate change key rule.
- `id-allocation`: empty `caps` and the hint.
- `metrics`: `gate` writes the log.
- `cli`: per command help, summaries, next steps, project detection.
- `task-workflow`: the `no open task` message.
- `spec-governance`: README structure.

## Impact

- `src/index/scan.ts` (`changeNum` becomes `changeKey`), `src/check/`, `src/cli/help.ts`, `src/cli/gate.ts`, `src/ids/ids.ts`, `src/stats/`, `src/adopt/`, `README.md`, `docs/`, `decisions/ADR-002-id-scheme.md`.
- Evidence paths in this repo, agentrc, and ste-humanize-skill do not move. Their folders all start with digits.
- The parity goldens do not change. The parity fixture uses numbered folders.
