# Design

## Decisions

- D1 `task backfill` skips a task whose file sits under `openspec/changes/archive/`. The filter uses the same test as `toTask`, `file.includes("/archive/")`. `--change` keeps its meaning on active changes. The evidence of archived work stays absent, because nothing reads it: `check` and `stats` look at active tasks, and the review diff was the only visible effect.
- D2 `init` owns two lines of `.gitignore`: `.ctx/index.json` and `adopt-report.md`. It reads the file, splits it on newlines, and trims each line before compare. A line that is already there, with or without a leading slash, counts as present. When at least one line is absent, `init` appends a blank line, the comment `# spec-ctx`, and the absent lines, and prints `wrote .gitignore (<n> lines)`. When both are present it prints `kept .gitignore`. When the file is missing it creates it with the comment and both lines. `--force` changes nothing here. `init` never removes a line.
- D3 The `.claude/` note. After `init` writes the skill files, it checks the `.gitignore` lines for `.claude`, `.claude/`, `/.claude`, or `/.claude/`. When one matches and `init` wrote or kept a file under `.claude/skills/`, it prints one line after the `kept` lines and before `next:`: `note: .gitignore ignores .claude/. The skills under .claude/skills/ stay out of git. The copies under .agents/skills/ are tracked.` The JSON output carries it under `notes`.
- D4 The template has two slots. `INIT_TEXT` keeps `code = ["src/**"]` and `tests = ["tests/**"]` as the default text. `runInit` replaces the `tests` line with `tests = ["test/**"]` when `tests/` is absent at the root and `test/` is a directory, and the `code` line with `code = ["lib/**"]` when `src/` is absent and `lib/` is a directory. The comment above each key stays. Nothing else in the file changes. A project with both `src/` and `lib/` keeps `src/**`.
- D5 `adopt --dry-run` ends with `exit 1: <n> headers need an ID. Next: specctx adopt` when `plan.edits` is not empty. The exit code stays 1, as REQ-ADOPT-001 asks. The `nothing to adopt` branch stays exit 0. The JSON output does not change.
- D6 `query` with `--change` and no term returns every canonical entry of that change. `--kind` and `--all` apply. Every entry scores 0, so the order is by `id`. `--limit` applies, so an agent passes `--limit 0` for a long change. Without `--change`, no term is still exit 2 with `query needs at least one term`. The check moves from `commands.ts` into the branch that sees the flags.
- D7 The hint of `task start` names the new call: `task <id> cites no REQ. Run specctx query --change <change> --kind req to list its requirements, then add [REQ-<CAP>-NNN] to the task line.` SCN-TASK-002-4 carries the new text. The REQ-TASK-002 text does not change.

## Risks / Trade-offs

- A project that already backfilled its archive keeps the old evidence files. Nothing removes them, and nothing reads them. A later `task backfill` writes no new file there.
- The `.gitignore` edit appends at the end. A file that ends without a newline gets one first. A project that keeps `.gitignore` under strict review sees a three or four line diff once.
- `query --change X --limit 20` cuts a change with more than 20 entries. The default stays, so the output of a term query does not change.

## Open Questions

None.
