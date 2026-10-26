# Design

## Decisions

- D1 Quote every item. YAML reads `- Every header starts with its ID, e.g. "### Requirement: REQ-ABC-001 Name".` as a mapping, because of the `: ` after `Requirement`. A double quoted scalar with inner quotes escaped, or a single quoted scalar, keeps it a string. The fragment uses single quotes and doubles any inner single quote. The engine has no YAML parser, so the test is text based. Every list line under `rules` and `operations` must match `^\s+- '.*'$` or `^\s+- ".*"$`. A second test runs `openspec validate` on a fresh project with the fragment merged and asserts no `must be an array of strings` warning.
- D2 Repair on `init --schema`. When the project config has a `rules` or `operations` key, `init --schema` today leaves it alone. It now also walks the list lines of those blocks as text. A list line that is not quoted and holds `: ` gets single quotes, with inner single quotes doubled. Every other line stays byte for byte. `--force` is not needed, because the repair changes no meaning.
- D3 README order. Install by copy first, as the community table expects: `git clone`, copy `schemas/spec-driven-ids` to `openspec/schemas/spec-driven-ids`, set `schema: spec-driven-ids` in `openspec/config.yaml`, merge `config-fragment.yaml` by hand. Then the one command path. Then the fork note with the OpenSpec version.
- D4 The catalog issue text goes into `docs/upstream-issue.md` under a new heading. It holds a title, the repository link to the bundle folder, and one line in the style of the existing rows.

## Risks / Trade-offs

- The repair rewrites a user's `openspec/config.yaml`. It only touches list items that are single key objects under the two known paths. Any other shape stays as it is.
