# Design

## Decisions

- D1 `init` never fails because a file exists. A file that exists with the same bytes needs no write. A file that exists with other content stays, unless `--force` is set. `spec-ctx.toml` stays in every case, because the user owns it.
- D2 A kept file is not an error. `init` prints `kept <file> (other content)` for each one and exits 0. The `next:` line then repeats the command with `--force`, so the user sees how to replace the files. This replaces the exit 2 for a clash and for an existing `spec-ctx.toml`.
- D3 The config merge and the repair run after the file step in every case. 013/D2 already says the repair needs no `--force`. This change makes that true.
- D4 `nothing to do` keeps its meaning from REQ-CLI-007. It prints only when every file is present and equal and the config needs no change. An existing `spec-ctx.toml` counts as equal, because the user owns it. So a project with its own `spec-ctx.toml` also gets `nothing to do`.

## Risks / Trade-offs

- A script that relied on exit 2 for a clash now sees exit 0. The repo has no such script. The kept lines and the `next:` line carry the same facts.
- A user can miss a kept file in the output. The `next:` line names `--force`, and `--json` lists the kept files.

## Open Questions

None.
