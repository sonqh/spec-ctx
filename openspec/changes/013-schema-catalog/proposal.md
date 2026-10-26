# Proposal

## Why

The next step upstream is a row in the OpenSpec community schema table. The maintainers add a row when someone opens an issue with a repository link and a one line description. Before that link goes out, two things in the bundle need a fix.

- Every `openspec` run prints `Rules for 'specs' must be an array of strings, ignoring this artifact's rules`. The cause is YAML. Items in `config-fragment.yaml` and in this repo's `openspec/config.yaml` hold an unquoted `: ` inside the text, so YAML reads them as mappings. OpenSpec then ignores the rules and the apply guidance. Every project that ran `init --schema` has the same broken config.
- The bundle README explains one install path, `npx spec-ctx init --schema`. The community table expects a copy of the folder into `openspec/schemas/<name>/`. Both paths must be there.

## What Changes

- Every list item under `rules` and `operations` in `config-fragment.yaml` and `openspec/config.yaml` is a quoted string. A test parses the fragment and fails on any item that is not a string.
- `init --schema` repairs an existing config: an item under `rules` or `operations.*.guidance` that parsed as a mapping becomes the quoted string it was meant to be.
- The bundle README gets the copy install path first, then the `init --schema` path, and a line that names the OpenSpec version it was forked from.
- `docs/upstream-issue.md` gets the text of the catalog issue: repository link and one line description.

## Capabilities

### Modified Capabilities
- `schema-bundle`: the string rule and the README paths.

## Impact

- `schemas/spec-driven-ids/config-fragment.yaml`, `schemas/spec-driven-ids/README.md`, `openspec/config.yaml`, `src/init/init.ts`, `tests/schema/`, `tests/init/`, `docs/upstream-issue.md`.
- agentrc and ste-humanize-skill carry the same broken items in their `openspec/config.yaml`. They repair with `specctx init --schema --force` after the next release, or by hand.
