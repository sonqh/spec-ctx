# Proposal

## Why

ADR-006 items 2, 4, and 5 ask for one read command that names the next action from the files on disk. Today an agent must know twelve commands and three skills to walk a change from plan to archive. Nothing chains the steps. A failed Verify leaves no record, so a loop cannot count retries or stop after a cap. The engine has to own the decision, the retry count, and the stop. Then a future `specctx-run` skill can loop on `next`, act, and repeat with no state in the context window.

## What Changes

- A new read command `specctx next [--json] [--change <c>]`. It prints one object with a closed `action` enum: `plan`, `cite`, `start`, `work`, `fix`, `repair`, `gate`, `archive`, `ask`, `stop`. It writes nothing. For planning state it calls the OpenSpec command in `[gate] openspec` with `status --change <c> --json` and reads only `isPlanningComplete` and `nextSteps[0]`.
- `task done` on a non zero Verify exit writes `.ctx/evidence/<c>/<t>.fail-<n>.json`. At `[loop] max_attempts` fail files since `task start` it appends a question to `.ctx/questions.json` and prints a `blocked:` line. `check`, `stats`, and `handoff` never read a fail file as evidence.
- `spec-ctx.toml` gets `[loop] max_attempts` (default 3) and `[loop] archive` (`"ask"` or `"auto"`, default `"ask"`). `init` writes both with comments.
- REQ-TASK-003 gets SCN-TASK-003-8 and SCN-TASK-003-9. REQ-CLI-001 gets `next` and SCN-CLI-001-8. REQ-DIST-002 gets the two keys and SCN-DIST-002-11.

Out of scope: the `specctx-run` skill (ADR-006 item 3), the schema cut (item 8), and any change to `handoff write`.

## Capabilities

### New Capabilities
- `loop`: REQ-LOOP-001 the `next` command and its enum. REQ-LOOP-002 fail files and the attempt cap. REQ-LOOP-003 the `[loop]` config.

### Modified Capabilities
- `task-workflow`: REQ-TASK-003.
- `cli`: REQ-CLI-001.
- `distribution`: REQ-DIST-002.

## Impact

- `src/loop/next.ts`, `src/loop/fails.ts`, `src/loop/openspec.ts` (new), `src/cli/commands.ts`, `src/cli/args.ts`, `src/cli/help.ts`, `src/cli/workflow.ts`, `src/tasks/evidence.ts`, `src/stats/stats.ts`, `src/config.ts`.
- `tests/loop/` (new), `tests/tasks/done.test.ts`, `tests/config.test.ts`, `tests/cli/help.test.ts`, `tests/fixtures/help-golden/`.
- `README.md`, `CHANGELOG.md`, `docs/verification/024.md`.
