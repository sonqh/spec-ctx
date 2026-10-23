---
name: bootstrap-context
description: Load the minimum context for one task in the spec-ctx repo. Use at the start of every session. Triggers on "start a session", "start", "bootstrap", and "what should I work on". Also triggers on a first message that names a change or a task ID like 002/3.2. Runs the ctx engine so you never read openspec/specs/ directly.
version: 0.1.0
---

# bootstrap-context

Load only what one task needs. Until change 001 lands, the engine is `python3 tools/ctx/ctx.py`. After it lands, use `node dist/cli.js` with the same subcommands.

## Steps

1. Run `python3 tools/ctx/ctx.py status`. Every ctx command rebuilds a stale index first, so no separate build step is needed. Then read `.ctx/handoff.md` if it exists. Note the change, the task in progress, and open questions. Delete the file after reading.
2. If `status` prints `no active change`, list the `open_questions` from the handoff for the user. Ask which change to start. Stop here.
3. Note which change has open tasks in the `status` output.
4. Read `openspec/config.yaml`. Apply its `context` and `rules` as constraints. Do not copy them into files.
5. Pick the change. Use the handoff, then the user's message, then the lowest-numbered change with open tasks.
6. Read `openspec/changes/<change>/proposal.md` and `tasks.md`. Pick the task. Use the handoff, then the user's message, then the first open task whose dependencies are done.
7. Collect the REQ IDs in the task's square brackets. Run `python3 tools/ctx/ctx.py bundle <IDs> --budget 6000 --depth 1`. Read the output. That is your spec context.
8. Each block in the bundle starts with a provenance line: `-- <id> | <file>:<line> | <status> | <reason>`. A `modified` status means an active change holds the pending text of that requirement. Trust that text over the main spec.
9. If the output ends with `truncated: N entries omitted: <ids>`, print those IDs. Bundle them one at a time only when the task needs them. `python3 tools/ctx/ctx.py related <first ID>` shows how they connect and why.
10. Read `openspec/changes/<change>/design.md` only for the Decisions section that names the task's area. The bundle already holds the decisions whose `Refs:` name your IDs.
11. Say in one line which change and task you are on, and which IDs you loaded. Then start the task.

## Budget

- At most 10,000 characters of spec text before the first code edit.
- Never open `openspec/specs/` or `openspec/changes/*/specs/` directly. Use `bundle`.
- Never read the whole `tasks.md` of a change you are not working on.

## While working

- Tag code with the REQ ID it implements: `// REQ-IDX-001`.
- Tag tests with `// Covers: REQ-IDX-001`.
- After each task group, run `python3 tools/ctx/ctx.py check`. Fix findings before moving on.
- Mark the task `- [x]` in `tasks.md` only when its `Verify:` clause passed.

## At the end of the session

Write `.ctx/handoff.md`:

```markdown
# Handoff
change: 002-core-compile-apply
done: 002/1.1, 002/1.2
in_progress: 002/1.3
open_questions:
- Does merge-json need to preserve key order?
```

Keep it under 20 lines. The next session reads it first.
