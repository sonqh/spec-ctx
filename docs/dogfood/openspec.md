# Dogfood: spec-ctx on a fork of OpenSpec

Date: 2026-10-27. Engine: `spec-ctx@0.1.1` from npm, then the local build of `main` at adf08e1 after change 015. Target: `sonqh/OpenSpec-spec-ctx`, a fork of `Fission-AI/OpenSpec`, at commit `6d04a1b` (2026-10-24). Branch `spec-ctx-adopt`. The run used their CLI `@fission-ai/openspec@1.15.0`. Nothing from this run went upstream.

The fork is a repository we did not write. It has 36 capabilities, 30 active changes, and 85 archived changes. This page records what a first external user gets, command by command.

## Baseline before any write

| Number | Value | Command |
| --- | --- | --- |
| capabilities | 36 | `ls openspec/specs \| wc -l` |
| main requirements | 252 | `grep -rhE '^### Requirement:' openspec/specs \| wc -l` |
| main scenarios | 749 | `grep -rhE '^#### Scenario:' openspec/specs \| wc -l` |
| active changes | 30 | `openspec list` |
| archived changes | 85 | `ls openspec/changes/archive \| wc -l` |
| delta requirements in active changes | 145 | `grep` over `openspec/changes/*/specs/**/*.md` |
| tasks open | 118 | `grep -E '^\s*- \[ \]'` over active `tasks.md` |
| tasks done | 461 | `grep -E '^\s*- \[x\]'` over active `tasks.md` |
| main spec text | 275,131 chars | `cat openspec/specs/*/spec.md \| wc -c` |
| main plus active delta text | 511,571 chars | `cat` over both trees |
| their strict validate | exit 1, 53 passed, 13 failed (66 items), 6.57 s | `npx -y @fission-ai/openspec@latest validate --all --strict` |

The 13 failures belong to the fork. 11 changes carry MODIFIED blocks that drop scenarios. 2 main specs have a requirement over 500 characters. Every later validate run returned the same pass and fail set.

## Step 2: init and dry run

`npx -y spec-ctx@0.1.1 init --all`: exit 0, 1.31 s, 15 lines. It printed 14 `wrote` lines: `spec-ctx.toml`, 6 files under `openspec/schemas/spec-driven-ids/`, 3 skills under `.claude/skills/`, the same 3 under `.agents/skills/`, and it rewrote `openspec/config.yaml` (schema `spec-driven` becomes `spec-driven-ids`, 6 guidance lines under `operations`). It printed `kept openspec/config.yaml rules` and `next: specctx status`.

`npx -y spec-ctx@0.1.1 adopt --dry-run`: exit 1, 1.11 s, 1,696 lines.

| Number | Value |
| --- | --- |
| headers that get an ID | 1,625 (381 requirements, 1,244 scenarios) |
| CAP codes | 50 (36 from `openspec/specs`, 14 only in active deltas) |
| CAP collisions | 0 |
| delta headers that match no main requirement | 16, all in `simplify-skill-installation` (`cli-init` 9, `cli-update` 7) |

The CAP codes are legal and unique. A person cannot read them. The `cli-*` family gets three patterns at once: `CA`, `CC`, `CF`, `CI`, `CL`, `CS`, `CU`, `CV`, then `CLC`, `CLS`, `CLV`, then `CLIC`, `CLIV`. `CLV` is `cli-version` and `CV` is `cli-view`. `CLC` is `cli-config` and `CLIC` is `cli-completion`. `OAS` is `opsx-apply-skill` and `OPAS` is `opsx-archive-skill`. `COI` is `context-injection` and `COL` is `config-loading`. The adopt report says to rename a code before the IDs spread. Nobody will, because the report lists 50 codes and gives no rule to pick better ones.

## Step 3: adopt, backfill, baseline, gate

| Command | Exit | Time | Result |
| --- | --- | --- | --- |
| `npx -y spec-ctx@0.1.1 adopt` | 0 | 1.47 s | `adopted 1625 header(s) in 97 file(s)`. `adopt-report.md` has 1,711 lines. |
| `git diff --stat` | | | 98 files, 1,638 insertions, 1,626 deletions. `openspec/specs`: 36 files, 1,000 lines each way. `openspec/changes`: 61 files, 625 lines each way. |
| `npx -y spec-ctx@0.1.1 task backfill --manual adopted` | 0 | 1.54 s | `backfilled 1812 task(s)` in 94 change folders. 85 of them sit in the archive. |
| `npx -y spec-ctx@0.1.1 baseline write` | 0 | 1.29 s | 5,430 entries. |
| `npx -y spec-ctx@0.1.1 gate --strict` | 1 | 1.24 s | `check: fail`, 1,617 findings in 118 files, all `missing-id`. |

Baseline entries by rule, from `python3 -c` over `.ctx/baseline.json`:

| Rule | Count |
| --- | --- |
| task-without-req | 1,985 |
| task-without-verify | 1,985 |
| scenario-untested | 748 |
| manual-evidence | 460 |
| uncovered | 252 |
| missing-id | 0 |

The 1,617 `missing-id` findings split in two. 1,547 sit in `openspec/changes/archive/**`, which `adopt` never writes by REQ-ADOPT-001. 70 sit in `simplify-skill-installation`: the 16 unmatched requirement headers and their 54 scenarios. `baseline write` does not record `missing-id`, so the gate stays red. The no-ID fixture has an empty archive and no unmatched delta, so no test saw it.

The first commit on the branch is `2c87852`: 1,924 files changed, 36,538 insertions. 1,812 of those files are evidence JSON from `task backfill`. The review diff is 20 times the spec diff.

## Step 4: their CLI on the adopted tree

| Command | Exit | Time | Result |
| --- | --- | --- | --- |
| `npx -y @fission-ai/openspec@latest validate --all --strict` | 1 | 1.78 s | 53 passed, 13 failed. Same set as the baseline. Only the header text in the messages changed. |
| `openspec list` | 0 | 1.33 s | 30 changes. |
| `openspec show add-amp-support` | 0 | 1.24 s | Prints the proposal. |
| `openspec archive add-amp-support -y` (throwaway branch) | 0 | 1.34 s | `+ 1 added`. `REQ-ATP-004` and `SCN-ATP-004-1` to `-4` land in `openspec/specs/ai-tool-paths/spec.md` with their IDs. Validate after: 52 passed, 13 failed (65 items). |

No blocker. OpenSpec treats the ID as part of the header text and carries it through archive.

## Step 5: the task life cycle

| Command | Exit | Time | Result |
| --- | --- | --- | --- |
| `npx -y spec-ctx@0.1.1 status` | 0 | 1.12 s | `index rebuilt`, then one line per change, 28 lines. `uncovered active REQs in main: 252`. |
| `npx -y spec-ctx@0.1.1 task next` | 0 | 1.10 s | `add-change-stacking-awareness/1.1`, `reqs: none`, `verify: manual`. |

`status` lists 28 changes. `openspec list` lists 30. The two without a `tasks.md` (`add-qa-smoke-harness`, `schema-alias-support`) do not appear in `status`.

Three open tasks in three changes. None of the 118 open tasks in the fork cites a REQ or has a Verify code span (`grep -c 'Verify:' openspec/changes/*/tasks.md` gives 0).

| Task | `task start` output | Bundle | `task done` |
| --- | --- | --- | --- |
| `add-change-stacking-awareness/1.1` | footer only: `-- bundle 0 chars, 0% of 733871 chars of spec text` | 0 chars | exit 2: `has no Verify command. A --manual "<note>" is required` |
| `add-global-install-scope/1.1` | same footer | 0 chars | same |
| `unify-template-generation-pipeline/1.1` | same footer | 0 chars | same |

Each `task start` took about 1.1 s. The tool counts 733,871 chars of spec text, which includes the archive. The active tree is 511,571 chars.

`task done add-change-stacking-awareness/1.1 --manual "..."` works: exit 0, the box turns to `[x]`, `.ctx/evidence/add-change-stacking-awareness/1.1.json` has `kind: manual`, `reqs: []`, `verify.command: null`. I reverted it with `git checkout`.

What an agent has to add to each task line, from `openspec/schemas/spec-driven-ids/templates/tasks.md`: a citation such as `[REQ-CSW-001]` and a span such as ``Verify: `pnpm vitest run test/core/<file>.test.ts` ``. Until then the engine gives zero context and `task done` needs `--manual`.

The work around that gives context today: `specctx query <term> --change <change> --kind req --limit 0`, then `specctx bundle <ids>`.

| Task | Term | REQ hits | Bundle | Share of 733,871 |
| --- | --- | --- | --- | --- |
| `add-change-stacking-awareness/1.1` | `metadata` | 4 | 4,769 chars | 0.65 percent |
| `add-global-install-scope/1.1` | `scope` | 14 | 8,048 chars, `truncated: 4 entries omitted` | 1.1 percent |
| `unify-template-generation-pipeline/1.1` | `manifest` | 2 | 1,878 chars | 0.26 percent |

## Step 6: the rename test

Edit: line 3 of `openspec/changes/suppress-telemetry-notice-in-json/specs/telemetry/spec.md`, `REQ-TEL-005 First-run telemetry notice` became `REQ-TEL-005 Telemetry notice on the first run`. The main spec kept its text.

| Command | Result |
| --- | --- |
| `npx -y spec-ctx@0.1.1 check` | exit 1, 1.33 s, the same 1,617 `missing-id`. No new finding. No `duplicate-id`, no `dangling-ref`. |
| `specctx query telemetry --kind req --all` | `REQ-TEL-005` twice: `modified` with the new text, `active` with the old. |
| `specctx related REQ-TEL-005 --all` | 5 scenarios on the delta, 3 on main, all linked. |
| `specctx bundle REQ-TEL-005` | Prints the delta text with status `modified`. |
| `npx -y @fission-ai/openspec@latest validate --all --strict` | Still 53 passed, 13 failed. New line: `Archive would refuse this delta: telemetry MODIFIED failed for header "### Requirement: REQ-TEL-005 Telemetry notice on the first run" - not found`. |

spec-ctx held the link by ID. OpenSpec did not. OpenSpec matches a MODIFIED block by the full header text, ID included, so archive would refuse the rename. The claim for upstream has to read in two parts. spec-ctx keeps the link by ID. OpenSpec archive still needs a RENAMED block or an ID aware matcher. I reverted the edit.

## Rerun with the local build after change 015

Change 015 fixed the gate. `node /home/claude/spec-ctx/dist/cli.js` at adf08e1 on the same fork tree:

| Command | Exit | Time | Result |
| --- | --- | --- | --- |
| `baseline write` | 0 | 0.28 s | 5,500 entries. The 70 unmatched headers are now `missing-id <file> <title>` entries. |
| `check --strict` | 0 | | `0 findings`, `baselined: 5500`. |
| `gate --strict` | 1 | | `check: ok (strict)`, then `linters: fail`: 2,096 hard findings in 279 markdown files. 1,535 of them inside `openspec/`: `dash` 981, `bold-label` 484, `stock-word` 58, `not-x-but-y` 11. The output is 8,695 lines and 1.1 MB with no summary line. |
| `gate --strict --markdown "nothing/*.md"` | 1 | 1.96 s | `check: ok`, `linters: ok (0 file(s))`, `validate: fail`. That failure is the fork's own 13 strict failures. |
| `task start add-change-stacking-awareness/1.1` | 0 | | A hint line before the footer: `task add-change-stacking-awareness/1.1 cites no REQ. Find one with specctx query <term> --change add-change-stacking-awareness --kind req, then add [REQ-<CAP>-NNN] to the task line.` |
| `query metadata --kind REQ --change add-change-stacking-awareness` | 0 | | 4 hits. Upper case works. |

The second commit on the branch is `ab69ddc`: the baseline written with the local build.

## Rerun with the local build after change 016

Change 016 put the linters on the same ratchet as `check`. `node /home/claude/spec-ctx/dist/cli.js` after 016 on the same fork tree:

| Command | Exit | Time | Result |
| --- | --- | --- | --- |
| `baseline write` | 0 | 11.4 s | 6,221 entries. 721 of them are `lint <file> <rule> <count>` lines. |
| `gate --strict` | 1 | 14.0 s | `check: ok (strict)`, `linters: ok (659 file(s), 721 baselined)`, `validate: fail`. The output is 100 lines, all from the fork's own 13 strict failures. |
| one new dash in `README.md`, then `gate --strict` | 1 | | `linters: fail, 1 new finding(s) in 1 file(s)` and `README.md  tells:dash  18 (baseline 17)`. |

The gate now stops only on the fork's own validate failures, which their maintainers own. The lint step costs 11 s on 659 files. That is the whole cost of the step, not a regression from 016: the step read the same files before and printed 8,695 lines.

The third commit on the branch is the baseline written with the 016 build.

## Friction log, in the order I hit it

1. The fork ignores `.claude/` in `.gitignore` line 145. `init` wrote three skills there and said nothing. They never reach git.
2. `spec-ctx.toml` from `init` has `tests = ["tests/**"]`. The fork uses `test/`. `init` did not look. `code = ["src/**"]` happened to match.
3. `adopt --dry-run` exits 1 while its text says success. A CI job reads that as a failure. REQ-ADOPT-001 asks for it. The text should say why: `exit 1: 1625 headers need an ID`.
4. The 50 CAP codes are unreadable in the `cli-*` family. The tool should offer a second pass for a repeated first segment. That pass takes two letters from each segment (`CLAR`, `CLCH`, `CLCO`). Or it asks the user for the family prefix.
5. `adopt-report.md` lands in the repo root. `.ctx/` appears with a 3.3 MB `index.json`. The fork ignores neither. I added one line to `.gitignore` by hand. `init` should write it, or say to.
6. `task backfill` wrote evidence for 1,812 tasks, 1,351 of them in archived changes. The review commit is 1,924 files. Backfill should skip the archive, or the evidence of archived work should live in one file.
7. `gate --strict` after the documented existing path: exit 1 with 1,617 `missing-id`. Fixed in 015.
8. `status` prints every change, 28 lines, before the summary. On a repo with 30 active changes the useful lines are at the end. Changes without `tasks.md` are missing from the list.
9. `task start` on a legacy task printed one footer with `0 chars` and nothing else. An agent gets no context and no next step. Fixed in 015 with a hint line.
10. `query --change X --kind req` with no term exits 2: `query needs at least one term`. There is no way to list every requirement of one change. An agent needs that right after `task start` says `cites no REQ`.
11. `query --kind REQ` returned nothing. `--kind req` returned 20 lines. Fixed in 015.
12. `bundle` prints no size footer. REQ-TASK-002 asks for that. An agent that runs `bundle` by hand after the hint from 015 sees no size.
13. `gate --strict` with a green `check` lints every markdown file of the adopter. 2,096 hard findings, 1.1 MB of output, no summary, no ratchet. The adopter did not write STE prose and never agreed to. Fixed in 016.
14. `gate` counts the fork's own `openspec validate --all --strict` failures as a gate failure. That is correct, and it means this fork cannot get a green gate until its maintainers fix 11 MODIFIED blocks and 2 long requirements.

## Bugs in spec-ctx

| Bug | Where | Fix |
| --- | --- | --- |
| B1 `check` reports `missing-id` on archived deltas that `adopt` never writes. The existing path ends with exit 1 on any repo with archived changes. | REQ-CHK-001, REQ-ADOPT-006 | 015, `missing-id` skips archived entries, SCN-CHK-001-6 |
| B2 Unmatched active delta headers stay `missing-id` with no baseline rule. The gate stays red until the adopter rewrites a delta of their own. | REQ-ADOPT-005 | 015, `missing-id <file> <title>` enters the baseline, SCN-ADOPT-005-4 and -5 |
| B3 `gate --strict` lints every markdown file with the STE and tells rules. A real repo gets thousands of findings and no ratchet. | REQ-LINT-003, REQ-ADOPT-006 | 016, the lint counts per file and rule join `.ctx/baseline.json`, `gate` fails only on a rise, one summary line, detail cut at 50 lines, `[gate] markdown` in `spec-ctx.toml`. SCN-ADOPT-007-1 to -3, SCN-CLI-004-4 and -5. |
| `task start` gives no hint on a task with no REQ. | REQ-TASK-002 | 015, SCN-TASK-002-4 |
| `query --kind` is case sensitive and fails in silence. | REQ-QRY-001 | 015, SCN-QRY-001-4 |

Change 015 added 4 failing tests first, then the fix. `bun run ci:local` passed in 1 m 45 s, 14 steps. Commit adf08e1 on `main`. Change 016 added 6 failing tests first, then the fix. `bun run ci:local` passed, 14 steps.

## Timings

Every spec-ctx command on this tree took 1.1 to 1.5 s through `npx -y`, and 0.3 s with the local build. Their CLI took 1.2 to 1.8 s per command, 6.6 s on the first validate while `npx` fetched the package. Nothing here is slow. The cost of the tool is the review diff and the gate noise, not the clock.

## Verdict

Not ready for a stranger yet. The core holds. `adopt` wrote 1,625 IDs in 1.5 s. Their CLI kept working. Archive carried the IDs through. A renamed delta header stayed linked by ID. Three things blocked a stranger at the start of the run. Changes 015 and 016 on `main` fix two of them. Both wait for a release. First, the documented existing path ended red on this repo. The fix needs a release, because 015 is on `main` and not on npm. Second, with that fix the gate still failed on the adopter's own prose, with 1.1 MB of output and no way to ratchet it. Change 016 fixed that: the gate on this fork now stops only on the fork's own validate failures. Third, the adopted tasks give the engine nothing. 118 open tasks, zero with a REQ or a Verify. So `task start` prints an empty bundle and `task done` needs `--manual` every time. The adoption guide has to say this: an agent adds a citation and a Verify span to each open task before the loop pays off. The tool needs a way to list the requirements of one change for that step. Four smaller fixes would remove most of the friction. Skip the archive in `task backfill`. Write the `.gitignore` lines in `init`. Detect `test/` versus `tests/`. Print a reason next to the exit 1 of `adopt --dry-run`.
