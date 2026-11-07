# Dogfood: spec-ctx 0.6.0 on PersonaKit

Date: 2026-11-07. Engine: the local build of `main` at 20946c2, version 0.6.0. Target: `sonqh/PersonaKit` at a13b332. The repo adopted spec-ctx 0.5.0 before this run, so it is a consumer and not a stranger. The run checks that 0.6.0 does not break a real adopter and that the new output holds.

## Commands and results

| command | exit | time | note |
| --- | --- | --- | --- |
| `build` | 0 | 120 ms | 1019 entries, 0 problems |
| `status` | 0 | | no active change, last archived `m3-mcp-and-json-resume` |
| `check --strict` | 0 | | 0 findings |
| `gate --strict` | 0 | | check, linters on 70 files, validate strict, spec-length all ok |
| `init --all` | 0 | | kept `openspec/config.yaml` and `.gitignore`, last line `next: specctx init --all --force` |
| `context m3-mcp-and-json-resume/4.2` | 0 | | 20 cards, 6 `verified`, 2 `tagged`, 11 `structural`, 13 requirement cards `verified` |
| `report` | 0 | | north star 0.3 minutes, 1 run between `init-ok` and the first `context-has-code-or-test` |

## What the trust labels show

- `src/app/operations.ts:105` and `src/cli/main.ts:585` read `tagged`, not `verified`. They carry a REQ-RES-004 tag, and no done task that cites REQ-RES-004 lists them in its evidence. The agent sees that nobody proved those two lines.
- `src/core/json-resume.ts:2`, `src/mcp/server.ts:2`, and `tests/json-resume-cli.test.ts:1` read `verified`.
- 12 of 15 requirement cards end with `body omitted` at the default budget. The task cites 2 requirements, and the change delta adds 13 more. The cards keep the IDs visible, and the bodies of the cited ones print.

## Findings

1. `init --all` on an adopted repo whose config differs from the template ends with `next: specctx init --all --force`. A consumer who only wants the 0.6.0 skills gets a line that would overwrite their `openspec/config.yaml`. The line should name `init --skills --force` when only the skill copies differ.
2. The repo pins `npx -y spec-ctx@0.5.0 gate --strict` in `AGENTS.md`. After the 0.6.0 release that line needs a bump by hand. A note in the release text can say so.
3. No regression. Every command that the 0.5.0 skills run gives the same exit codes as before.
