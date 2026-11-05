# Proposal

## Why

ADR-008 names a north star: the minutes and the commands from `init` to the first `context <task>` with a code or test line. spec-ctx keeps no record of its own runs, so nobody can compute it. A bug that a user meets on another repo, such as PersonaKit, reaches the team only when the user writes it up by hand.

On 2026-11-05 the owner decided two things. They are in `decisions/ADR-009-run-journal.md`.

- Add a local run journal and a bug report command, so spec-ctx improves from real use.
- Lift the freeze of ADR-008 item 4. The rest of ADR-008 stays.

## What changes

- The CLI entry appends one line per run to `.ctx/local/runs.jsonl` in a repository with `openspec/`. The line holds the command name, the exit code, the time, and signals from a closed set. It holds no flag value, path, ID, or spec text. `main()` stays free of side effects. It fills a small sink that the entry reads.
- `SPECCTX_JOURNAL=0` switches it off. The test helpers and `tests/parity/run.sh` set it, and a test preload sets it for every spawned run.
- New command `specctx report` prints a Markdown report to stdout. It has the versions, the config shape without values, the north star, p95 time per command, the signal counts, and the last internal error. It ends with the `gh issue create` command to run. The engine never runs `gh` and never uses the network.
- An exit 3 adds one line that points to `report` and the issues page.
- README gets a section "Report a bug". `CLAUDE.md` and ADR-008 follow ADR-009.
- Spec: ADDED REQ-JRN-001 to REQ-JRN-006 in a new capability `JRN`.

## Layers and benefit

- Layer: measurement for the ADR-008 north star, plus bug intake. It changes no retrieval output. It serves layer 1 (ADR-007) because it measures how fast a stranger reaches a useful `context`.
- Benefit: the north star becomes computable from real runs. A user files a redacted spec-ctx bug in one step.

## Out of scope

- Any upload, any network call, and any run of `gh` by the engine.
- A reader of the journal other than `report`.
- A change to `GITIGNORE_LINES`, `init`, or the version in `package.json`.
- Journal lines for help, version, or runs outside a repository with `openspec/`.
