---
name: specctx-bootstrap
description: Start a session in an OpenSpec project that uses spec-ctx. Use at the start of every session, and on "start", "bootstrap", or "what should I work on". Loads only the spec text that the next task needs.
---

# specctx-bootstrap

Load the minimum context for one task. Run `specctx` as `npx spec-ctx` when it is not installed.

## Steps

1. Run `specctx status`. It rebuilds a stale index first. Note the active change, the current task, and the count of open questions. The last line `next: <step>` names the next step. Exit 2 with `not an OpenSpec project` means the folder has no `openspec/`. Tell the user to run `npx -y @fission-ai/openspec@latest init` and stop.
2. Read `.ctx/handoff.md` if it exists. Note `current`, `reopened`, and `open_questions`.
3. If `status` prints `no active change`, show the open questions to the user. Ask which change to start. Stop here.
4. Pick the task. Use `current` from the handoff, then the user's message, then the output of `specctx task next`.
5. Run `specctx task start <task>`. It prints the bundle for the REQ IDs of the task and sets the current task.
6. Read the bundle. Each block starts with `-- <id> | <file>:<line> | <status> | <reason>`. A `modified` block is the pending text of an active change. Trust it over the main spec.
7. If the bundle ends with `truncated: N entries omitted: <ids>`, run `specctx bundle <id>` for each ID that the task needs.
8. Say in one line which task you are on and which IDs you loaded. Then start the work.

## Rules

- Do not open `openspec/specs/` or `openspec/changes/*/specs/` by hand. Use `specctx bundle` or `specctx task start`.
- Read at most 10,000 characters of spec text before the first code edit.
- Tag code with `// REQ-ABC-001` and tests with `// Covers: REQ-ABC-001`.
- Get a new ID from `specctx id new REQ <CAP>`. Never count numbers by hand.
- Close the task with the `specctx-done` skill.
