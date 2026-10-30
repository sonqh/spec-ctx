# Design

## Context

The facts below come from the code.

- `decideNext` in `src/loop/next.ts` returns the first stale task and stops. Its object has nine keys in `KEYS`. `renderNext` prints every key.
- `capQuestion` in `src/loop/fails.ts` quotes the first line of the tail. `failLine` in the same file picks the failing line for the `fix` reason.
- `today()` in `src/util/time.ts` slices `toISOString()`. That is the UTC date already.
- `loadConfig` throws `ConfigError`. `run` in `src/cli/commands.ts` turns it into `UsageExit`. `bracketsOf` in `src/init/init.ts` and `applyAdopt` call `loadConfig` bare. A bad TOML file then gives exit 3 and a stack.
- The scan reads a code tag with a regex per line. It has no tokenizer.
- `skills/` is the source of the packaged copy. `scripts/gen-assets.mjs` writes it into `src/assets.generated.ts` on `bun run build`.

## Goals / Non-Goals

**Goals:**
- One `next` turn repairs every stale task.
- The closed action list stays.
- One config reader gives one error shape.

**Non-Goals:**
- A tokenizer for string literals.
- A change to the evidence format.

## Decisions

- D1 `Decision` gets a tenth key `tasks`, a list of task IDs. Every state prints it. It holds `[task]` when `task` has a value, else `[]`. In the `evidence_stale` state it holds every stale task of the change in file order, and `task` is the first. The `reason` joins `stale-evidence <t> <file>` for each task with a comma and a space. The `command` joins the reopen and done pair of each task with `&&`. So one run repairs all. The action list does not change. The alternative was a new action. A closed list that grows breaks old readers. Refs: REQ-LOOP-001, REQ-LOOP-008, ADR-006
- D2 `capQuestion` calls `failLine` for the quote. The line is the same one that the `fix` reason shows. Refs: REQ-LOOP-002, REQ-LOOP-006, ADR-006
- D3 The `dangling-ref` hint in `src/check/hints.ts` names the cause and the fix. The cause is a tag inside a string literal or fixture text. The fix is to build the text at run time or to move it under an ignored path. The scan stays as it is. A rule that skips quoted text needs a tokenizer for every language that the scan reads, and a wrong skip hides a real link. The lead decided this. One parity golden line changes. Refs: REQ-CHK-006, REQ-CHK-007, ADR-003
- D4 A new function `loadConfigOrExit(root)` in `src/cli/config.ts` wraps `loadConfig` and turns `ConfigError` into `UsageExit`. `run`, `bracketsOf`, and `applyAdopt` call it. `loadConfig` puts the full path of the file in the TOML message. `main` prints `specctx: <message>` and returns 2. The message is one line. Refs: REQ-DIST-009, REQ-DIST-002, ADR-001
- D5 `stats --write` keeps the UTC date. CI and a local run then agree on the name. REQ-STAT-005 says so. `today()` gets a comment. The test sets `SPECCTX_NOW` to a time with a zone offset. The local date and the UTC date differ then. Refs: REQ-STAT-005, ADR-003
- D6 The skill gets two lines. One line in the `plan` bullet or the Rules names the two overrides of `openspec-propose`. The `gate` bullet gets the stale route. The packaged copy comes from `bun run build`. A test compares `ASSETS` with the files under `skills/`. Refs: REQ-SKL-005, REQ-SKL-002, ADR-006
- D7 The archive guidance line "Rebuild the index after archive." becomes "Rebuild the index with `node dist/cli.js build` after archive." REQ-GOV-009 names it. Refs: REQ-GOV-009, REQ-SKL-003

## Risks / Trade-offs

- A tenth key changes every full-object test of `next`. Mitigation: the tests get the key in the same task.
- The golden for `check` changes with the hint. Mitigation: `run.sh --record` and a note in `docs/verification/033.md`.
- A long chained `repair` command hides which task failed. Mitigation: `task done` names the task, and the chain stops at the first failure.
