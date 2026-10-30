# Proposal

## Why

With `[ids] brackets = true`, spec-ctx reads and writes IDs like `[REQ-UA-004]`. That is the form OpenSpec PR #1979 reads. The templates and the config fragment that `specctx init --schema` installs still show the bare form. So an agent that copies them writes bare headers in a bracketed project.

## What Changes

- `init --schema` reads `[ids] brackets` from `spec-ctx.toml` of the project.
- When the value is true, the installed templates show `[REQ-<CAP>-NNN]` and `[SCN-<CAP>-NNN-N]` in the requirement and scenario headers.
- When the value is true, the merged `rules.specs` items show the header examples in the bracketed form.
- When the value is false, every installed byte stays as it is today.
- A project that flips the setting runs `init --schema` again. A template that still holds the bytes of the other form gets the new form. A config item that still holds the text of the other form gets the new text. A file or an item that the user changed stays, as today. `--force` still replaces every template.
- A new path test `tests/paths/fresh-brackets.sh` runs the fresh path with brackets on. It ends with `gate --strict` exit 0 and every header in the bracketed form.

Out of scope:

- Task citations, `Refs:` lines, code tags, and `Covers:` tags. They stay bare.
- The `operations` guidance of the fragment. Its examples are code tags.
- A new `init` flag. The setting comes only from `spec-ctx.toml`.
- A rewrite of headers in existing specs. `adopt` does that.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `schema-bundle`: REQ-SCH-006 and REQ-SCH-007 added.

## Impact

- `src/init/init.ts`: the bracket form of a template and of the fragment, and the swap of the other form.
- `tests/init/brackets.test.ts`: new unit tests.
- `tests/paths/fresh-brackets.sh`: new path test. `scripts/ci-local.sh` and `.github/workflows/ci.yml` run it.
- `README.md`: the `brackets` line names the templates.
