# ADR-009 A local run journal and a bug report

Status: accepted. Date: 2026-11-05. The owner accepted it on 2026-11-05. It replaces item 4 of ADR-008. The rest of ADR-008 stays in force.

## Context

ADR-008 set one goal for 30 days from 2026-11-03. A stranger gets a useful `context <task>` on their own repo within 5 minutes. Its north star is the minutes and the commands from `init` to the first `context <task>` with a code or test line.

Nobody can compute that number today. spec-ctx keeps no record of its own runs. A bug that a user meets on another repo reaches the team only if the user writes it up by hand. The first such repo is PersonaKit.

ADR-008 item 4 froze the gate, the linters, the Action, and the loop. The owner now prefers to take in bugs and to improve spec-ctx from real use. The freeze blocks that.

## Decision

1. The owner approved a local run journal and a bug report command.
   - Each command in a repository with `openspec/` appends one line to `.ctx/local/runs.jsonl`. The line holds the command name, the exit code, the time, and a closed set of signals. It holds no flag value, no path, no ID, and no spec text.
   - `specctx report` reads the journal and prints a Markdown report to stdout. The user reviews it and files it with `gh issue create`. The engine never runs `gh` and never uses the network.
   - `SPECCTX_JOURNAL=0` switches the journal off.
   - Only `report` reads the journal. No other command reads it.
2. The owner lifted the freeze of ADR-008 item 4. The gate, the linters, the Action, and the loop may get new features again. spec-ctx is in continuous improvement.
3. The rest of ADR-008 stays: the north star, the quality targets, item 5 (trust), and the order of work. Layer 1 keeps its priority (ADR-007).
4. No LLM call, no server, no daemon, and no new runtime dependency. ADR-003 stays in force.

## Consequences

- The north star becomes computable. `report` prints the minutes and the runs from the first `init-ok` to the first `context-has-code-or-test`.
- A user files a redacted bug in one step.
- Every command run in a project costs one small file append. A failure of that append stays silent.
- A reviewer still checks each proposal against ADR-007 and ADR-008.

Refs: ADR-003, ADR-007, ADR-008
