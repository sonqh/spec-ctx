# Design

## Goals / Non-Goals

**Goals:**
- A stranger reads the first screen and can say what the tool prevents.
- The demo shows a refusal, a pass, and a stale catch, with the checkbox on screen.
- Output in a pipe is byte for byte what it is today.

**Non-Goals:**
- Themes, color flags, or color in `--json`.
- Changes to any metric.

## Decisions

- D1 Tagline. `Your coding agent reads only the spec it needs, and cannot tick a task until its Verify command passes.` Line 3 of the README. Under it one line: `For teams that run Claude Code, Codex, or Cursor on an OpenSpec project.` Modifies REQ-GOV-006.
- D2 First screen order. Title, tagline, audience line, `## The problem` with three bullets, `## What spec-ctx does` with a three row table `Without | With spec-ctx`, `## Demo`, `## Quickstart` with three commands. No number from `docs/metrics/` appears before `## Measured`. The table may say `the whole openspec/ tree` and `a few kilobytes`, not a ratio.
- D3 Measured. The last section before `## Contribute`. It cites the newest `docs/metrics/*.md` by name and prints its total row. One line per column says what the column means and which direction is good. The README test for the newest file moves to this section.
- D4 Demo story. `record.sh` builds the same fixture and runs, with a dim caption line before each command:
  1. `# 1. The next task and the command that proves it` then `specctx task next`.
  2. `# 2. Done? Not until Verify passes` then `specctx task done add-mfa/1.3`. The Verify fails, the last line is red: `Verify failed (exit 1). The task stays open.`
  3. `# 3. The agent does the work` then `cat > src/login.ts` with a two line heredoc, so the file content is on screen.
  4. `# 4. Verify passes. The box flips and the evidence is written` then `specctx task done add-mfa/1.3` in green, then `git diff --no-color openspec/changes/add-mfa/tasks.md | grep '^[-+] '` so the `[ ]` to `[x]` change is on screen.
  5. `# 5. A later edit makes the evidence stale. check says so` then `echo >> src/login.ts` and `specctx check --strict`, which prints `stale-evidence add-mfa/1.3` in red.
  Total under 30 seconds. No `stats`. The fixture gets a `git init` and one commit after adopt so the diff works. Replaces the demo rule in REQ-GOV-003 and REQ-GOV-006 through a new REQ-GOV-008.
- D5 Color. One module `src/cli/color.ts` with `paint(kind, text)` for `ok`, `fail`, `dim`. It returns plain text unless `process.stdout.isTTY` is true, `NO_COLOR` is unset, and `TERM` is not `dumb`. Callers: the `done <task>` line (ok), the `Verify failed` line and every hard finding line in `check` (fail), `next:` lines and the summary line of `check` (dim). `--json` never calls it. Adds REQ-CLI-008. Tests force a TTY through `FORCE_COLOR=1`, which `paint` also honors, and assert the escape codes.
- D6 Failure line. `task done` prints the last 20 lines of the Verify output as today, then `Verify failed (exit <n>). The task stays open.` and exits 1. Modifies REQ-TASK-003. The demo and the skills quote this line.

## Risks / Trade-offs

- A caption line in the demo is text the recorder prints, not a command. A reader may try to type it. The `#` prefix and dim color mark it as a comment.
- `FORCE_COLOR` is a convention from `chalk`, not a standard. Tests use it only to turn color on.
- svg-term output grows with color codes. Keep the SVG under 400 kB, as REQ-GOV-003 asks.

## Open Questions

None.
