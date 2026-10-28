# Design

## Decisions

- D1 Both path scripts call `npx -y @fission-ai/openspec@latest`. A pin would hide the drift the scripts exist to catch. `init --all` pins the version it finds into `spec-ctx.toml`, so `gate` in the script runs the same build as `openspec init` did.
- D2 The fresh path writes one change `add-greeting` with `openspec new change add-greeting`. It copies `proposal.md`, `design.md`, `tasks.md`, and `specs/greeting/spec.md` from `openspec/schemas/spec-driven-ids/templates/`. It takes the IDs from `specctx id new REQ GRT` and `specctx id new SCN GRT --for <REQ> --count 2`, puts them into the headers with `sed`, and replaces each placeholder comment with text. The tasks cite the REQ and name `true` as the Verify command. It runs `task done` on both tasks, `openspec validate --all --strict`, `check --strict`, and `gate --strict`. The script fails when `spec-ctx.toml` changed after `init --all`, by a checksum.
- D3 `tests/paths/rules-only.sh` runs `openspec init --tools none`, then `specctx init --schema`, then sets `schema: spec-driven` back with `sed`. It creates a change with `openspec new change` and runs `openspec instructions specs --change <c> --json`. It asserts that the JSON `rules` list and the plain text output both carry `specctx id new`. A pass means upstream injects `rules` from `openspec/config.yaml` into the instruction of the stock schema, so the schema copy can go in phase 1. A fail stops CI and the report names it.
- D4 `scripts/ci-local.sh` and `ci.yml` run `bash tests/paths/fresh.sh && bash tests/paths/existing.sh && bash tests/paths/rules-only.sh` as one line, so `tests/gov/ci-parity.test.ts` keeps the two files equal.
- D5 `docs/getting-started.md` keeps the structure of the fork guide: install, fresh path, the task loop, the gate, the existing project, things to know. Every fork and tarball reference goes. The install is `npx -y @fission-ai/openspec@latest init --tools <tool>` then `npx -y spec-ctx@latest init --all`. A retitle under a stable ID needs a RENAMED block on upstream, and `specctx check` prints the block to paste through the rule `retitle-needs-renamed` of change 021. The things to know list drops the items that 017, 018, and 022 closed.
- D6 The README links the guide from the Two paths section. The existing path block reads `init --all`, `adopt --dry-run`, `adopt`, `baseline write`, `gate --strict`. The `task backfill` bullet and the command row go. The `/specctx-run` step is not in this release and the README does not name it.

## Risks / Trade-offs

- `@latest` can break the path tests on an upstream release. That is the signal the ADR asks for. The pin in `spec-ctx.toml` protects adopters, not this repository.
- The fresh path now needs `sed` and `sha256sum` or `shasum`. Both exist on the CI runner and on macOS.
- The rules-only test reads a JSON field that upstream can rename. The test then fails and names the field.

## Open Questions

None.
