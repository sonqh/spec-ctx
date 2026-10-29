# Design

## Decisions

- D1 `REQ_HDR` and `SCN_HDR` in `src/index/scan.ts` get a second capture group for the bracketed form. The ID is the bare group or the bracketed group. The bracketed group needs whitespace or the end of the line after the closing bracket, as the upstream pattern of #1979 does. The title is the rest of the line after the ID and its whitespace. A bracket that does not hold a full spec-ctx ID fails the optional group. The whole text then stays the title, and the header gives `missing-id` as before. Canonical selection reads only the ID, so REQ-IDX-003 needs no change.
- D2 `[ids] brackets` lives in `src/config.ts` next to `caps`, `task_pattern`, and `paths`. The default is false. A value that is not a boolean is a config error in the usual style. `INIT_TEXT` writes the key with a comment above it. With the default, no output changes, so the parity goldens stay.
- D3 `adopt` reads an existing ID in both forms. It writes new IDs in the form that `brackets` names. A RENAMED FROM line takes the form of the main header when that header already had an ID. Otherwise it takes the configured form. A TO line takes the configured form, because `adopt` writes the delta header in that form too. A header that has an ID in either form gets no edit. A second run with `brackets = true` on a tree with bare IDs from `adopt` changes nothing.
- D4 `retitle-needs-renamed` reads a TO line with a bare or a bracketed ID. The entry title has no ID and no brackets, so a bracketed delta and a bare main compare by title alone. The hint stays one static string from `RULES`, because `checkText` prints the hint by rule name. The hint tells the user to write each ID in the form of its header. The FROM line copies the main header and the TO line copies the delta header, so the block is right for every mix of forms.
- D5 `newIds` in `src/ids/ids.ts` returns `[REQ-...]` and `[SCN-...]` when `brackets` is true. Text output and `--json` print the same strings, because the agent pastes them into a header. ADR and DEC IDs never take brackets. `--for` strips one pair of brackets before it reads the REQ ID.
- D6 Code tags, Covers tags, Refs lines, and task citations stay bare. A code tag reads `// REQ-UA-001`. A task citation reads `[REQ-UA-001]`. The task citation already uses brackets as a list, so a second pair would add nothing. The scan rules for them do not change.
- D7 The config fragment in `schemas/spec-driven-ids/config-fragment.yaml` and the templates still tell the agent to write the bare form. A follow-up change switches them to the bracketed form when upstream merges #1979.

## Risks / Trade-offs

- Upstream may change the pattern before #1979 merges. The scan reads our own ID pattern, which is narrower than the upstream one, so a looser upstream pattern changes nothing here.
- A project can mix the two forms. That is valid. `check` reports nothing for a mix, and `adopt` never rewrites a header that has an ID.

## Open Questions

None.
