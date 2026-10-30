# Design

## Context

The facts below come from the code.

- Step 2 of `decideNext` in `src/loop/next.ts` returns `ask` for an open question whose `task` is the change folder, the key, or a task of the change. Step 9 returns `archive` with `human` from `[loop] archive` and the command `<openspec> archive <c> -y`. It never reads the resolved questions.
- `handoff ask --change <c>` stores the full folder name as `task` (029/D1). A question has the keys `n`, `asked_at`, `task`, `text`, `status`, `answer`, and `resolved_at`.
- `evidenceFindings` in `src/check/evidence.ts` reports `stale-evidence` when a digest under `files` of an evidence file differs from the tree. Only `check --strict` and `gate` call it.
- `task done` refuses a task that is `[x]` with evidence. `task reopen <t> <why>` clears the box and moves the evidence to `<t>.reopened-<n>.json` with the reason. `stats` counts a reopen reason that holds `stale` as a stale catch.
- `checkText` in `src/cli/commands.ts` prints `<rule>  <count>  <hint>` with `hintOf(rule)` from the table in `src/check/hints.ts`. `check --json` prints the finding objects as they are.

## Goals / Non-Goals

**Goals:**
- The archive stop has the same shape as the plan stop: ask, open, resolve, continue.
- `next` sends the agent to a stale task before the gate fails on it.

**Non-Goals:**
- A change to the step order of `next` before step 6.
- A change to `check --json` or to the hint of any rule except the two in the request.

## Decisions

- D1 A question gets an optional `stage` field with the value `plan` or `archive`. `handoff ask --change <c>` sets it. The value is `archive` when the change has at least one task and every task of the change is `[x]` in the index. Otherwise the value is `plan`. A question without `--change` gets no `stage`. The text of the question plays no part. The alternative was a flag `--stage archive` on `handoff ask`. The request gives the archive command with no flag, and a flag the agent can forget would let a plan question approve an archive. Refs: REQ-LOOP-007, REQ-HND-002, 029/D1
- D2 Step 9 of `next` under `[loop] archive = "ask"` looks for one resolved question of the change. Its `task` is the folder and its `stage` is `archive`. Its `resolved_at` comes after the `at` of the newest evidence of the change. With one, it returns `archive`, `human: false`, the reason `archive approved in question <n>`, and the command `<openspec> archive <c> -y`. Without one, it returns `archive`, `human: true`, and the command `specctx handoff ask --change <c> "archive <c>?"`. The time test makes an approval lapse when a task closes again after it. Step 2 already returns `ask` while the question is open, so it needs no change. The alternative was a file `.ctx/archive-approved`. The request forbids a new state file. Refs: REQ-LOOP-007, REQ-LOOP-001, ADR-006
- D3 REQ-HND-002 stays as it is, for the reason of 029/D2. REQ-LOOP-007 states the new field. REQ-LOOP-001 changes only in SCN-LOOP-001-4, and REQ-CLI-007 only in SCN-CLI-007-6. Both named the old archive command under `ask`. Task 1.2 found the second one. Refs: REQ-LOOP-001, REQ-LOOP-007, REQ-CLI-007
- D4 Stale evidence uses the existing action `repair`. `repair` already means a `[x]` task whose evidence does not prove it, and its fix is to run Verify again. `fix` means a failed Verify of the current task and carries an attempt count. `start` means an open task. `gate` runs every check and fixes nothing. The command chains `specctx task reopen <t> "stale evidence: <file>" && specctx task done <t>`, because `task done` refuses a `[x]` task with evidence. The reason text holds `stale`, so `stats` counts the catch. The new state is `evidence_stale`. Refs: REQ-LOOP-008, REQ-LOOP-001, REQ-STAT-003
- D5 The stale rule runs after step 6 and before step 7. While a task is current, its edits can make an earlier task stale for a short time. The rule waits until the current task closes, so it never runs Verify on half done work. The earliest task is the first in the order of the file and the line of `tasks.md`. The file is the first stale path in sorted order. A new function `staleOf(root, task)` in `src/check/evidence.ts` returns that path or null. `evidenceFindings` and `next` both use it, so the two never differ. Refs: REQ-LOOP-008, REQ-CHK-003
- D6 `Finding` gets an optional `hint` field. `checkText` collects the distinct hints of the findings of each rule in finding order and joins them with a newline. A rule with no finding hint prints `hintOf(rule)`, so the output of every other rule stays byte equal. `check --json` drops the `hint` key from each finding, so REQ-CHK-004 holds. Refs: REQ-CHK-006, REQ-CHK-004
- D7 `retitleFindings` reads the header line of the main requirement and of the delta block. It builds the hint from the two lines as they are. `FROM` copies the main header, because upstream OpenSpec matches it against the main spec. `TO` copies the delta header. So the block shows the bare or bracketed form that each file uses, as 027/D4 asks. Refs: REQ-CHK-006, REQ-ADOPT-010, 027/D4
- D8 The `stale-evidence` hint becomes `Run specctx task reopen <task> <why>, then specctx task done <task>.` The table test in `tests/check/dupkey.test.ts` reads the hint from the table, so it follows. Refs: REQ-CHK-006
- D9 The skill keeps the shape of 029/D6. The `plan` bullet runs `specctx check --strict` and `specctx gate --strict` in place of `openspec validate <c> --strict`, because the gate runs the OpenSpec validate and the spec-length check. It names `id new --count <n>`. The `archive` bullet runs the command field when `human` is true, which is the archive question, and the archive steps when `human` is false. The `repair` bullet runs the command field. The three copies stay equal. Refs: REQ-SKL-004, REQ-SKL-003, 029/D6

## Risks / Trade-offs

- [The gate fails at the plan step on a finding outside the change] → The plan is not ready until the tree is clean. The baseline covers known debt.
- [`handoff ask --change` with every task `[x]` and a plan question in mind gets `stage: archive`] → No one needs a plan question after the last task closes. The stage follows the files, not the intent.
- [The repair command chains two commands with `&&`] → A failed Verify leaves the task open. `next` then returns `start` for it, the normal path.
- [Two retitles in one delta print two blocks] → Each block is correct on its own. A merge is out of scope.
