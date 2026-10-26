---
name: specctx-done
description: Close a task in an OpenSpec project that uses spec-ctx. Runs the Verify command, writes evidence, sets the checkbox, writes the handoff, and shows the metrics. Use when the work of a task is complete, or on "done", "close the task", and "end the session".
---

# specctx-done

Close the current task with evidence. Run `specctx` as `npx spec-ctx` when it is not installed.

## Steps

1. Run `specctx task done <task>`. It runs the `Verify:` command of the task in the project root.
2. On exit 0 it writes `.ctx/evidence/<change>/<task>.json` and sets `[x]` on the task line. Nothing else in `tasks.md` changes.
3. On a failure it prints the last 20 lines of output and then the line `Verify failed (exit <n>). The task stays open.` It exits 1. Fix the cause and run step 1 again.
4. If the task has prose after `Verify:` and no command, run `specctx task done <task> --manual "<what you checked>"`.
5. After the last task of a group, run `specctx check --strict`. Fix every finding before the next group.
6. Run `specctx handoff write`. It writes `.ctx/handoff.md` from the index, the evidence, and the open questions.
7. Run `specctx stats --change <change>`. Report the five metrics of the change in one line each.
8. Commit the work together with `.ctx/`. Leave `.ctx/index.json` out of git.

## Rules

- Never tick a checkbox by hand. `check --strict` reports a ticked task with no evidence as `done-without-evidence`.
- If a spec changed after you closed a task, run `specctx task reopen <task> "<reason>"`.
- To leave a question for the next session, run `specctx handoff ask "<question>"` before step 6.
