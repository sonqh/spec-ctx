---
name: specctx-run
description: Run the spec-ctx loop in an OpenSpec project. Use on "run", "continue", "next task", "build this", "carry on", and on a first message that describes a change to build. The engine picks the next action. The skill acts on it until the change reaches the archive or a human must decide.
---

# specctx-run

Run `specctx` as `npx spec-ctx` when it is not installed. `openspec` is the command in `[gate] openspec` of `spec-ctx.toml`.

## The loop

1. Run `specctx next --json`. Read `action`, `change` (`<c>`), `task` (`<t>`), `command`, `reason`, and `human`.
2. Act on `action` as the table below says.
3. Run `specctx handoff write`.
4. Repeat from step 1 until `action` is `stop` or `human` is true.

## Actions

- `plan`: follow the upstream `openspec-propose` skill for the change in `command`. Take every ID from `specctx id new REQ <CAP>` and `specctx id new SCN <CAP> --for <REQ>`. Give every task a `[REQ-...]` citation and a `Verify:` code span. Then run `specctx check --strict` and `openspec validate <c> --strict`. Fix every finding. Stop and show the plan to the user. This is the plan stop.
- `cite`: run `specctx query --change <c> --kind req`. Add the `[REQ-...]` citation and a `Verify:` code span to the task line named in `task`. Run `specctx check`. Continue.
- `start`: run `specctx task start <t>`. Read the bundle it prints. Continue.
- `work`: implement the task. Tag code with `// REQ-...`. Tag tests with `// Covers: REQ-...`. Then run `specctx task done <t>`.
- `fix`: read `reason`. It holds the tail of the failed Verify output. Fix the cause. Run `specctx task done <t>` again.
- `repair`: run `specctx task done <t>`. It runs Verify for a ticked task that has no evidence.
- `gate`: run `specctx gate --strict`. Fix every finding. Run it again until it exits 0.
- `archive`: when `human` is true, stop and ask the user in one line whether to archive `<c>`. When `human` is false, follow the upstream `openspec-archive-change` skill. Then run `openspec validate --all --strict`, `specctx check --strict`, and `specctx handoff write`.
- `ask`: print `reason`. It is the open question. Stop. The user answers with `specctx handoff resolve <n> "<answer>"`.
- `stop`: print `reason`. Stop.

## Rules

- Never tick a checkbox by hand. `specctx task done` is the only way a task closes.
- Never use `--manual` on a task with a Verify command.
- Never call `/opsx:apply`. This skill replaces it.
- Never read `openspec/specs/` or `openspec/changes/*/specs/` directly. Use the bundle from `task start` or `specctx bundle <id>`.
- Stop on any `action` not in the list above. Print the object and ask the user.
- Keep no state in your context. A new session starts the same loop again with step 1.
