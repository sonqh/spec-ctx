# ADR-006 One loop, one engine, upstream OpenSpec

Status: accepted. Date: 2026-10-28.

## Context

Two independent reviews ran on 2026-10-28, one on architecture and one on product, both read only. They are in `reviews/`. They looked at spec-ctx 0.1.2, the OpenSpec fork on branch `spec-ctx-adopt`, and the two dogfood runs. Both found the same things.

- The engine works. context_ratio 0.043, evidence_ratio 0.87, `adopt` wrote 1,625 IDs in 1.5 s and upstream OpenSpec kept working.
- The seam between the two tools fails. The upstream `/opsx:apply` skill tells the agent to tick `- [x]` by hand (`apply-change.ts:130`) and to read every context file (`:107`). It drops `operationGuidance` on conflict (`:99-102`). Our own `schema.yaml` line 300 says "mark complete as you go".
- `task done --manual` closes a task that has a Verify command without running it (`src/cli/workflow.ts:112-122`). This breaks ADR-004.
- `baseline write` replaces the file. Nothing compares it to the base branch. A pull request can hide new debt and get a green gate.
- The fork of OpenSpec costs a rebase per upstream release and a second install for every user. It covers one case: a retitle under a stable ID without a RENAMED block.
- `schemas/spec-driven-ids/schema.yaml` is 301 lines. 278 are a copy of upstream text and drift on every upstream release.
- A user must know about 12 commands and three skills. Nothing chains the steps.

The owner's goal: a user types one prompt and invokes packaged skills. The agent then continues on the current task on its own. Or it triggers the next skill in a workflow we define. It stops when the change reaches the archive.

## Decision

1. One engine, one truth per fact. OpenSpec owns planning state through its artifact graph (`openspec status --json`, `openspec instructions`). spec-ctx owns task and verification state through the checkbox plus evidence (ADR-004). Open questions move from `handoff.md` into `.ctx/questions.json`. `handoff.md` becomes a pure view again. `current.json` and `gate-log.jsonl` are per session and ignored by git.

2. One new read command: `specctx next --json`. It is a pure function of the files on disk and prints one object with a closed `action` enum: `plan`, `cite`, `start`, `work`, `fix`, `repair`, `gate`, `archive`, `ask`, `stop`. It never reimplements the artifact graph. For planning it returns `action: plan` and defers to OpenSpec's `nextSteps`.

3. One user skill, `specctx-run`. It loops: run `next`, act on the action, run `handoff write`, repeat. It calls the upstream `openspec-propose` and `openspec-archive-change` skills by name and never calls `/opsx:apply`. It stops on any action it does not know. A new session resumes by running it again, because no state lives in the context window. `specctx-bootstrap`, `specctx-next`, and `specctx-done` become aliases for one release, then go.

4. Two human stops by default: the plan (the upstream propose skill already stops there) and archive (`[loop] archive = "ask"`). A failed Verify writes `.ctx/evidence/<c>/<t>.fail-<n>.json`. At `[loop] max_attempts` (default 3) the engine writes a question and the loop stops. Only `handoff resolve` leaves that state.

5. The engine decides the next action, the retry count, the IDs, and the bundle. It decides that a task passed from the exit code of its frozen Verify command. It decides that a change may archive from the gate exit code. The LLM decides artifact text, code, the Verify command at planning time, and the fix after a failure. It also decides the citation for a legacy task and the text of a question. The LLM may not tick a box, write evidence, write the baseline, or archive. Each of those is a command whose precondition the engine checks.

6. Close the bypasses before the loop ships. `task done` refuses `--manual` when the task has a Verify command. `task done` on a ticked task with no evidence runs Verify and writes the evidence (the repair path for a hand tick). `gate` fails when `.ctx/baseline.json` gained entries against the merge base, unless the commit subject starts with `baseline:`, the same pattern as REQ-GOV-007. `task done` refuses when the Verify command in `tasks.md` differs from the one frozen in `current.json` at `task start`.

7. No fork of OpenSpec. The branch `spec-ctx-adopt` stays as a tagged fixture. The owner closes its draft pull request. The one case it covered becomes a `check` rule `retitle-needs-renamed`: a delta header whose ID exists in main with other text and no RENAMED line. Its hint prints the exact RENAMED block to paste. The upstream ask stays at the issue level (#1967). If upstream ever takes ID matching, the rule goes quiet and nothing else changes.

8. The schema copy goes. `schemas/spec-driven-ids/` keeps the templates with ID placeholders and the config fragment only. Adopters use upstream `spec-driven`. The ID and Verify rules reach the agent through `openspec/config.yaml` `rules` and `operations`, which upstream injects into every artifact instruction. `init` merges those rules item by item into an existing `rules` key instead of keeping it untouched. Before the cut, a test on the fresh path must show that rules alone produce headers with IDs. If it does not, the bundle stays with a test that diffs it against upstream.

9. The linters leave the adopter's default gate. `init` writes `[gate] markdown = []`. This repository opts in. The linters move to their own package beside the ste-humanize skill in a later change. ADR-005 stays for this repository.

10. The gate pins OpenSpec. `init` writes `[gate] openspec` with the version it detects, not `@latest`. One contract test runs the pinned CLI on a fixture and reads only `isPlanningComplete` and `nextSteps`.

11. `task backfill` and REQ-TASK-006 go. The baseline covers legacy ticked tasks as `done-without-evidence`.

## Why

- Maintenance. Every item above removes a place where the same fix lands twice. The pairs: the fork and spec-ctx, the schema copy and upstream, three skills and one loop, backfill and the baseline, the engine and the linters.
- Users. A stranger installs upstream OpenSpec and spec-ctx, runs two init commands, and knows one skill. No tarball, no config edit.
- Closed loop. State on disk, a closed action enum, and two human stops give an agent a loop it can resume after any interruption. They give a human two places to look.
- Safety. A loop turns every bypass into a habit. Item 6 closes the three bypasses the reviews found before any loop runs them.

## Consequences

- A retitle under a stable ID needs a RENAMED block on upstream OpenSpec. The `retitle-needs-renamed` hint must be good enough to paste as is.
- There is no fully unattended run. At the plan stop a human reads the Verify commands. That is the main defense against a weak command such as `true`.
- An unattended loop runs Verify spans from `tasks.md` with `sh -c`. Run it only on trusted branches.
- Upstream can change the JSON of `status` and `instructions`. The pin and the contract test turn that into a known failure.

## Order of work

Phase 0, release 0.2.0: items 6, 7, 11, 9, 10, the `retitle-needs-renamed` rule, `questions.json`, `.gitignore` for `current.json` and `gate-log.jsonl`. Exit: `tests/paths/fresh.sh` and `existing.sh` pass on upstream `@fission-ai/openspec` with no fork. The fresh path ends with `gate --strict` exit 0 with no config edit.

Phase 1, release 0.3.0: items 2, 3, 4, 8. Exit: five changes in a row on this repository archived through `/specctx-run` with only the two stops and evidence_ratio 1.00, plus one change on Codex.

Phase 2, release 0.4.0: the GitHub Action reruns the Verify command of each task closed in a pull request. It compares the exit code with the evidence. A `check` rule flags a weak Verify (`true`, `exit 0`, a lone `echo`). Exit: two weeks of replay on this repository and one external repository with zero flaky failures.

Phase 3: a note on #2157, the README with the positioning, the family prefix pass in `adopt` for readable CAP codes. Exit: three people the owner does not know archive a change through `/specctx-run`.

Refs: ADR-002, ADR-003, ADR-004, ADR-005, REQ-TASK-003, REQ-ADOPT-005, REQ-CLI-004, REQ-GOV-007
