---
name: specctx-next
description: Pick and start the next task in the middle of a session in an OpenSpec project that uses spec-ctx. Use after you close a task, or on "next task" and "what is next".
---

# specctx-next

Move to the next open task. Run `specctx` as `npx spec-ctx` when it is not installed.

## Steps

1. Run `specctx task next`. It prints the task ID and text, then `reqs:` and `verify:`.
2. If it prints `no open task. Every task in the active changes is done. Next: archive <change>.`, every task of the active changes has its checkbox set. Run `specctx status`. Its last line is `next: archive <change>`. Tell the user that the change is ready for `specctx check --strict` and archive. Stop here.
3. Run `specctx task start <task>`. It prints the bundle for the REQ IDs of the task and sets the current task in `.ctx/current.json`.
4. Read the bundle. Request an omitted ID with `specctx bundle <id>` only when the task needs it.
5. Run `specctx task verify <task>` once before the work. It runs the `Verify:` command and writes nothing. A failure now shows what the work must fix.
6. Say in one line which task you are on. Then start the work.

## Rules

- Take the tasks in the order that `specctx task next` gives. Earlier tasks in a group come first.
- A question that blocks you goes to `specctx handoff ask "<question>"`. Then continue with what you can do.
- Close the task with the `specctx-done` skill.
