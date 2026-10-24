# spec-driven-ids

A fork of the OpenSpec `spec-driven` schema. It adds stable IDs from spec-ctx to every artifact.

- The spec template starts each requirement with `REQ-<CAP>-NNN` and each scenario with `SCN-<CAP>-NNN-<n>`.
- The instructions tell the agent to get IDs from `specctx id new` and to link IDs with `Refs:` lines.
- The tasks template cites REQ IDs and puts the `Verify:` command in a code span, so `specctx task done` can run it.
- `config-fragment.yaml` holds the `rules` and `operations` that `specctx init --schema` adds to `openspec/config.yaml`.

Forked from OpenSpec 1.14.3 with `openspec schema fork spec-driven spec-driven-ids`. CI validates it against that version.

## Install

```bash
npx spec-ctx init --schema
```

The command copies this folder to `openspec/schemas/spec-driven-ids/` and sets `schema: spec-driven-ids` in `openspec/config.yaml`.
