# Design

## Decisions

- D1 The `--manual` branch of `task done` checks `t.verify.command` first. A task with a Verify code span exits 2. The message is `task <t> has a Verify command. Run it with specctx task done <t>.` The check comes before the evidence check. A ticked task with a Verify span gets the same refusal. Follows ADR-004 and ADR-006 item 6.
- D2 The repair path. `task done <t>` on a `[x]` task reads `hasEvidence`. With evidence it exits 2 with `task <t> is done`, as today. Without evidence it runs the Verify command through the same code as an open task. On exit 0 it writes the evidence and calls `setBox` with `true`, which leaves the line as it is. On a non zero exit it prints the same tail and `Verify failed (exit <n>). The task stays open.` It touches nothing. `check --strict` keeps its `done-without-evidence` finding until a run passes. Follows ADR-006 item 6.
- D3 The freeze. `task start` writes `verify` into `.ctx/current.json` as the command string or `null`. The keys stay sorted, so the file reads `bundle_chars`, `started_at`, `task`, `verify`. `task done` reads the file before the run. When `cur.task` is this task and `cur.verify` is a string that differs from `t.verify.command`, it exits 2. The message is `task <t>: the Verify command changed since task start. Run specctx task start <t> again.` A `current.json` that names another task, lacks `verify`, or is absent changes nothing. Follows ADR-006 item 6.
- D4 `task backfill` leaves `workflow.ts`, `args.ts`, and `help.ts`. The `--manual` branch loses its backfill line, because D1 and D2 cover both cases it served. REQ-TASK-006 gets a REMOVED block and `id retire` rows for the requirement and its three scenarios. The hint of `done-without-evidence` names `specctx task done` alone. Follows ADR-006 item 11.
- D5 The tests that used `task backfill` to produce manual evidence on the no-ID fixture drop that call. The ticked tasks of the fixture then appear as `done-without-evidence` in the baseline instead of `manual-evidence`. The assertions move to that key. The `other rules never enter the baseline` test keeps the base fixture evidence as it is.
- D6 REQ-CLI-001 and REQ-ADOPT-006 lose the words `task backfill`. SCN-CLI-001-5 names `adopt`, `baseline write`, and `baseline prune`. No new scenario is needed for either requirement.

## Risks / Trade-offs

- A project that scripted `task backfill` gets `unknown command`. The replacement is `baseline write`, which records the ticked tasks as `done-without-evidence`.
- The repair path runs a Verify command on a task that someone ticked by hand. That is the intent. A weak command still passes, as it does for an open task.
- A `current.json` from an older release has no `verify` key. The freeze check does nothing until the next `task start`.

## Open Questions

None.
