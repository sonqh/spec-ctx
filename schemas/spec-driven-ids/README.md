# spec-driven-ids

A fork of the OpenSpec `spec-driven` schema. It adds stable IDs from spec-ctx to every artifact.

- The spec template starts each requirement with `REQ-<CAP>-NNN` and each scenario with `SCN-<CAP>-NNN-<n>`.
- The instructions tell the agent to get IDs from `specctx id new` and to link IDs with `Refs:` lines.
- The tasks template cites REQ IDs and puts the `Verify:` command in a code span, so `specctx task done` can run it.
- `config-fragment.yaml` holds the `rules` and `operations` for `openspec/config.yaml`.

## Install by copy

- Clone the repository: `git clone https://github.com/sonqh/spec-ctx`.
- Copy `schemas/spec-driven-ids` to `openspec/schemas/spec-driven-ids` in your project.
- Set `schema: spec-driven-ids` in `openspec/config.yaml`.
- Merge `config-fragment.yaml` into `openspec/config.yaml` by hand. Add its `rules` and `operations` keys. Keep every item quoted.
- Run `openspec schema validate spec-driven-ids`.

## Install with init --schema

```bash
npx -y spec-ctx init --schema
```

- The command copies this folder to `openspec/schemas/spec-driven-ids/`.
- It sets `schema: spec-driven-ids` in `openspec/config.yaml`.
- It adds the `rules` and `operations` keys that the config does not have yet. It leaves other keys as they are.
- It quotes a list item that YAML would read as a mapping.

## Version

Forked from OpenSpec 1.14.3 with `openspec schema fork spec-driven spec-driven-ids`. CI validates it against that version.
