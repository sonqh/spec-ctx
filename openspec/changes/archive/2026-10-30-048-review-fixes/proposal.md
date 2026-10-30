# Proposal

## Why

Two reviews of change 047 found two defects.

- A `decision for <cited REQ>` block can drop out of the budget at `--depth 2` or more. The walk reaches the decision at depth 2 through the back link of the requirement, and the block keeps that hit. It lands in budget class 3 and goes before the deltas. The old `task start` kept these decisions at depth 1 at every depth.
- `handoff resolve <n> "<answer>"` on a plan or archive question counts as approval, whatever the answer says. A lead answered "Not yet ..." to an archive question, and `next` then returned `archive approved in question <n>`. A human no read as a yes.

## What changes

- Fix 1. In `bundle()`, a `decision for <ID>` hit takes depth 1 when there is no hit or the existing hit is deeper. This is the override rule that the code and test lines already use. It applies to the cited requirements and to a second requested ID.
- Fix 2. A plan or archive question needs an explicit verdict. `handoff resolve <n> --approve "<answer>"` approves. `handoff resolve <n> --reject "<answer>"` rejects. A resolve with neither flag exits 2. A resolved question with no verdict does not count as approved at either stop. A rejected question keeps `next` at the stop, with a reason that names the rejection. At the plan stop, a rejection holds the stop even after a task started. A new question that a human approves ends the stop. The newest question of the stage decides, the one with the highest number `n`. Other stages keep today's behavior. The command that `next` prints at the stops shows both flags.
- The skill text in `skills/specctx-run/SKILL.md` names the verdict form. It says that the agent never resolves a plan or archive question. The human does.

## Layers and benefit

- Fix 1 is layer 1, retrieval. `bundle`, `context`, and `task start` keep the decision that governs a cited requirement at any depth, so the answer for a task stays complete.
- Fix 2 is layer 2, the skills, and it fixes a bug. A human no can never read as a yes at the two human stops. The stops keep the links true, because an archive on a no would move unfinished work out of the active specs.

## Out of scope

- `--since`, the benchmark, speed work, and a version bump.
- A verdict for design and cap questions.
- A migration of old questions. A resolved plan or archive question with no verdict counts as not approved. The human asks again.
