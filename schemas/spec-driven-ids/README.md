# spec-driven-ids

Templates and config rules that add stable IDs from spec-ctx to the OpenSpec `spec-driven` workflow. The project keeps `schema: spec-driven` in `openspec/config.yaml`. Upstream OpenSpec injects the `rules` and `operations` below into every artifact instruction, so the agent learns the ID commands from there.

- `templates/spec.md` starts each requirement with `REQ-<CAP>-NNN` and each scenario with `SCN-<CAP>-NNN-<n>`.
- `templates/tasks.md` cites REQ IDs and puts the `Verify:` command in a code span, so `specctx task done` can run it.
- `templates/design.md` ends each decision with a `Refs:` line.
- `config-fragment.yaml` holds the `rules` and `operations` for `openspec/config.yaml`. The rules tell the agent to get IDs from `specctx id new` and name the templates path. The `apply` guidance says that a task closes only with `specctx task done <id>` and that the agent runs the `specctx-run` skill, never `/opsx:apply`.

## Install by copy

- Clone the repository: `git clone https://github.com/sonqh/spec-ctx`.
- Copy `schemas/spec-driven-ids/templates` to `openspec/templates/spec-driven-ids` in your project.
- Keep `schema: spec-driven` in `openspec/config.yaml`.
- Merge `config-fragment.yaml` into `openspec/config.yaml` by hand. Add its `rules` and `operations` keys. Keep every item quoted.
- Run `openspec validate --all`.

## Install with init --schema

```bash
npx -y spec-ctx init --schema
```

- The command copies the four templates to `openspec/templates/spec-driven-ids/`.
- It adds the `rules` and `operations` keys that the config does not have yet. A key that exists gets the items it lacks. Other keys stay as they are.
- It quotes a list item that YAML would read as a mapping.
- It does not touch the `schema` key. A project that still says `schema: spec-driven-ids` gets a note. Set `schema: spec-driven` by hand and delete `openspec/schemas/spec-driven-ids/`.

## Version

The templates follow the `spec-driven` templates of OpenSpec 1.14.3 with the ID placeholders added. `tests/schema/validate.sh` checks them on upstream OpenSpec in CI.
