# Design

## Context

The facts below come from the code.

- `src/index/scan.ts` strips the archive date prefix from the change name. `changeKey` keeps the leading digits. A task ID is `<key>/<number>`.
- `findTask` in `src/tasks/tasks.ts` lets an active copy win over an archived copy of one ID.
- `runVerify` in `src/verify/run.ts` runs `sh -c` with a timeout. `isWeakVerify` in `src/verify/parse.ts` names the weak forms.
- Evidence holds `verify.command`, `verify.exit`, and `cwd` as separate fields (REQ-VER-004).
- `src/baseline/ratchet.ts` runs `git merge-base HEAD <base>` and returns a skip reason when it fails.
- `appendGateLog` in `src/cli/gate.ts` writes one line per gate run.

## Goals / Non-Goals

**Goals:**
- A second machine can check the evidence of every task closed in a range.
- The rerun runs each distinct command once.

**Non-Goals:**
- The GitHub Action and the replay script.
- A rule for commands that need the network.

## Decisions

- D1 A new module `src/gate/rerun.ts` holds pure functions: `closedTasks(root, base)`, `compare(...)`, `groupRuns(...)`, and `formatMismatch(...)`. The command layer in `src/cli/gate.ts` runs the processes and prints. Refs: REQ-CLI-009, REQ-VER-005, ADR-003
- D2 `closedTasks` reads `git ls-tree -r --name-only <mb> -- openspec/changes` and `git show` for each `tasks.md`. It parses with the task regex of `scanner`. The HEAD side uses the live index. The key comes from `changeOf` and `changeKey`, so an archived copy keeps its ID. The active copy wins on a duplicate. Refs: REQ-VER-005, REQ-IDX-005
- D3 A missing merge base is a failure, unlike the baseline step. A rerun that skips would pass a pull request with no check. The message says to fetch full history, and names a shallow clone when `git rev-parse --is-shallow-repository` prints `true`. Refs: REQ-VER-005, REQ-ADOPT-008
- D4 `compare` returns a status in this order: `manual`, `no-evidence`, `verify-drift`, `weak`, then `run`. Only `run` reaches a process. The result of the process decides `ok` or `mismatch`. Stdout hashes are not compared, because output carries times and paths. Refs: REQ-VER-006, REQ-CHK-005
- D5 Dedupe keys on the frozen command and cwd of the evidence. Groups run one at a time in the ID order of their first task. The env is the current env plus `CI=1` and `SPECCTX_RERUN=1`. A set `SPECCTX_RERUN` makes the command print one line and exit 0, so a Verify command that calls `gate --rerun` cannot recurse. Refs: REQ-VER-007, REQ-CLI-009
- D6 `--json` prints `base`, `merge_base`, `ok`, and `tasks`. Each task has `id`, `status`, `kind`, `file`, `line`, and for a run `expected_exit`, `actual_exit`. The log line is `steps: ["rerun"]`. Refs: REQ-CLI-009

## Risks / Trade-offs

- A task whose Verify needs the network fails on CI. Mitigation: a later change adds a `check` rule. This change reports the failure with a reproduce line.
- A command that takes minutes runs once per group, not once per task.
