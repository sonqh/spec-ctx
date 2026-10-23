---
name: bootstrap-context
description: Load the minimum context for one task in the spec-ctx repo. Use at the start of every session. Triggers on "start a session", "start", "bootstrap", and "what should I work on". Also triggers on a first message that names a change or a task ID like 002/3.2. Runs the ctx engine so you never read openspec/specs/ directly.
version: 0.2.0
---

# bootstrap-context

Load only what one task needs. The engine is `node dist/cli.js`. Run `bun run build` first if `dist/` is missing.

## Steps

1. Run `node dist/cli.js status`. Every command rebuilds a stale index first, so you need no separate build step. Read `.ctx/handoff.md` if it exists. Note the change, the current task, the reopened tasks, and the open questions. Keep the file. `handoff write` regenerates it.
2. If `status` prints `no active change`, list the open questions for the user. Ask which change to start. Stop here.
3. Read `openspec/config.yaml`. Apply its `context` and `rules` as constraints. Do not copy them into files.
4. Pick the task. Use the handoff, then the user's message, then `node dist/cli.js task next`.
5. Run `node dist/cli.js task start <task>`. It prints the bundle for the REQ IDs the task cites and sets the current task. Read the output. That is your spec context.
6. Each block in the bundle starts with a provenance line: `-- <id> | <file>:<line> | <status> | <reason>`. A `modified` status means an active change holds the pending text of that requirement. Trust that text over the main spec.
7. If the output ends with `truncated: N entries omitted: <ids>`, print those IDs. Bundle them one at a time only when the task needs them. `node dist/cli.js related <first ID>` shows how they connect and why.
8. Read `openspec/changes/<change>/design.md` only for the Decisions section that names the task's area. The bundle already holds the decisions whose `Refs:` name your IDs.
9. Say in one line which change and task you are on, and which IDs you loaded. Then start the task.

## Budget

- At most 10,000 characters of spec text before the first code edit.
- Never open `openspec/specs/` or `openspec/changes/*/specs/` directly. Use `bundle` or `task start`.
- Never read the whole `tasks.md` of a change you are not working on.

## While working

- Tag code with the REQ ID it implements: `// REQ-IDX-001`.
- Tag tests with `// Covers: REQ-IDX-001`. Name each scenario ID in a test.
- Need a new ID? Run `node dist/cli.js id new REQ <CAP>`. Never count by hand.
- Run `node dist/cli.js task verify <task>` to try the Verify command without a write.
- Close a task with `node dist/cli.js task done <task>`. It runs the Verify command, writes the evidence, and sets the checkbox. Never tick a box by hand.
- A question you cannot answer goes to `node dist/cli.js handoff ask "<question>"`.
- After each task group, run `node dist/cli.js check --strict`. Fix findings before you move on.

## At the end of the session

Run `node dist/cli.js handoff write`. It writes `.ctx/handoff.md` from the index, the evidence, and the open questions. Commit it with the work.
