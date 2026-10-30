# Design

## Context

The facts below come from the code.

- `plan()` in `src/init/init.ts` copies the four templates from the assets byte for byte. `runInit` merges `config-fragment.yaml` with `mergeConfig`. Neither reads `spec-ctx.toml`.
- Without `--force`, `runInit` keeps every file that exists with other bytes and reports it as `kept <file> (other content)`. With `--force` it writes every file.
- `mergeItems` skips a fragment item whose value is in the list already. It never replaces an item.
- `[ids] brackets` exists since 027 (027/D2). `id new` prints `[REQ-...]` when it is true (027/D5). Task citations and tags stay bare (027/D6). 027/D7 left the templates and the fragment to a follow-up. This is that follow-up.
- `init` writes `spec-ctx.toml` with `brackets = false` when the file is absent. So a fresh `init --all` always installs the bare form.

## Goals / Non-Goals

**Goals:**
- One source for both forms, so the two can never drift.
- With `brackets = false`, every byte that `init` writes stays as today. The parity goldens stay.

**Non-Goals:**
- A new `init` flag or a new asset file.
- A change to the bare and bracketed forms that `id new`, `adopt`, and the scan already use.

## Decisions

- D1 A new function `bracketForm(text)` in `src/init/init.ts` wraps the ID right after `### Requirement: ` or `#### Scenario: ` in square brackets. The ID is `REQ-` or `SCN-` and the characters up to the next space. An ID that is in brackets already stays. The function applies to each template and to the fragment text. So the bundle keeps one copy of each file. In `spec.md` it changes the two header lines. In the fragment it changes the two header examples of `rules.specs`. Task citations, `Refs:` lines, and tags have no header prefix, so they stay bare (027/D6). The alternative was a second set of assets. It doubles the files that `gen-assets` and the drift test must keep equal. Refs: REQ-SCH-006, REQ-IDX-006, ADR-002
- D2 `runInit` reads `brackets` with `loadConfig(root)` after it writes `spec-ctx.toml`. A config error stops `init` as it stops every other command. `plan()` and `mergeConfig` get the form as an argument. With `brackets = false`, `bracketForm` never runs, so the bytes stay. Refs: REQ-SCH-006, REQ-DIST-002, ADR-006
- D3 Without `--force`, a template whose bytes equal the other form counts as unchanged. `runInit` writes the current form over it and lists it under `wrote`. A template with any other bytes stays under `kept (other content)`, as today. The test for "unchanged" is a byte compare with the output of the other form, so `init` needs no hash file. Refs: REQ-SCH-007, REQ-DIST-002
- D4 `mergeConfig` gets a map from the value of each item of the other form to the line of the current form. Before the merge, a project item whose value is a key of the map gets the current line at the same place and indent. The merge then sees the current value and adds no copy. The `merged` line reads `(<n> replaced)` or `(<a> added, <r> replaced)`. With no replacement it reads `(<n> added)` as today. The "nothing to do" check counts a replacement as work. The alternative was to add the new items and leave the old ones. Then the rules would show both forms. Refs: REQ-SCH-007, REQ-SCH-003
- D5 `tests/paths/fresh-brackets.sh` follows `tests/paths/fresh.sh`. It runs `openspec init`, then `specctx init --skills` to write `spec-ctx.toml`, then sets `brackets = true`, then `specctx init --schema`. So the schema step is a first install with brackets on. The change copies the templates. The test strips the brackets from the `id new` output for the task citation and the tags. It ends with `gate --strict` exit 0 and a grep that every header of the change has a bracketed ID. `scripts/ci-local.sh` and `.github/workflows/ci.yml` run it after `fresh.sh`. Refs: REQ-SCH-006, REQ-ADOPT-009, REQ-GOV-004

## Risks / Trade-offs

- A user who edited a template after a flip keeps the old form. Mitigation: the `kept` line and the `next:` line name `--force`, as today.
- A broken `spec-ctx.toml` now stops `init --schema`. Before, `init` did not read it. Mitigation: the error names the key, as for every other command.
