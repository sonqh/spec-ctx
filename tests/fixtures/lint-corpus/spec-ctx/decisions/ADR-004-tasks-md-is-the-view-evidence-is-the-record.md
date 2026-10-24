# ADR-004 tasks.md is the human view, evidence is the record

Status: accepted. Date: 2026-10-24.

## Decision

- `tasks.md` stays the file humans and OpenSpec read. The checkbox shows state.
- The checkbox is written by `specctx task done`, after the task's `Verify:` command passed. An agent does not tick it by hand.
- Each done task has an evidence file under `.ctx/evidence/<change>/<task>.json`. It holds the command, its exit code, a digest of its output, and the time. It also holds the digests of the files that carry the task's requirement tags.
- `specctx check --strict` reports a ticked task with no evidence, and evidence whose file digests no longer match the tree.
- `.ctx/` is committed. Evidence travels with the branch.

## Why

- A ticked box with no evidence is a claim. A claim went wrong twice in agentrc: a task marked done before its spec changed, and a change pushed with a red validate.
- OpenSpec reads `tasks.md` for progress. Keeping the checkbox keeps compatibility with its `status`, `apply`, and `archive` commands.
- Evidence beside the tree, not in a database, keeps the tool free of a server and works in any CI.

## Consequences

- `Verify:` must be a command for `done` to run it. Prose Verify is allowed and produces evidence with `kind: manual` and a warning in strict mode.
- Evidence files are small JSON and are sorted for stable diffs.

Refs: REQ-TASK-003, REQ-VER-001, REQ-CHK-003
