# Design

## Decisions

- D1 `Config.gate` gets `openspec: string`. The default is `npx -y @fission-ai/openspec@latest`. `loadConfig` reads `[gate] openspec` and rejects a value that is not a string with `spec-ctx.toml: gate.openspec must be a string.` An empty string is a usage error too, because `gate` would run ` validate --all`.
- D2 `runGate` takes the command in `GateOpts.openspec`. `commands.ts` passes `process.env.SPECCTX_OPENSPEC ?? cfg.gate.openspec`. The env var wins over the key, so a test or a one-off run can still swap the command without a file edit. `gate.ts` reads no env var itself.
- D3 `INIT_TEXT` gets the key under `[gate]` with a two line comment. The comment names the three cases: a fork, a pinned version, a global install. The key count that SCN-DIST-002-2 checks goes from 12 to 13.
- D4 The README fresh block shows `npx -y @fission-ai/openspec@latest init --tools <tool>` and one line after the block says that `--tools` skips the picker and `--no-animation` keeps logs clean. The existing path list gets one item: `gate` runs the command in `[gate] openspec`. Set it to `openspec` for a global install or a fork. The config reference block gets the key and the env var row says that it overrides the key.
- D5 `init` prints `templates: openspec/schemas/spec-driven-ids/templates/ (spec.md, tasks.md hold the ID placeholders)` after the notes and before `next:`, when `--schema` or `--all` ran. The line comes from `runInit` under `InitResult.notes`, so the JSON output carries it too and the `nothing to do` branch prints it as well. The text is a constant, `TEMPLATES_NOTE`, and passes `lint ste --baseline 0`.
- D6 `tests/paths/fresh.sh` and `existing.sh` set no `SPECCTX_OPENSPEC`. They run the default command, which is upstream OpenSpec through `npx`, as before. The key keeps that default, so both scripts stay as they are.

## Risks / Trade-offs

- A project that set `SPECCTX_OPENSPEC` in CI keeps that behavior. The env var still wins.
- A `[gate] openspec` that names a command not on PATH makes `validate: fail` with the shell error text. That is the same failure a bad `SPECCTX_OPENSPEC` gave before.
- The `templates:` line adds one line to every `init --schema` and `init --all` run. Tests that check the last two lines of the output move the note index by one.

## Open Questions

None.
