# Getting started with spec-ctx

This guide is for a developer who knows OpenSpec and has not seen spec-ctx. Every step below ran on a fresh Node project with upstream OpenSpec 1.15.0 on 2026-10-28. The output lines are real and trimmed. The same steps run in CI as `tests/paths/fresh.sh`.

## What spec-ctx adds

OpenSpec links a delta requirement to its main spec requirement by header text. A reword of the header breaks the link. spec-ctx gives every requirement and scenario an ID that stays: `REQ-<CAP>-NNN` for a requirement and `SCN-<CAP>-NNN-N` for a scenario. It indexes those IDs, links them to code and tests, and runs a task loop on top: `task next`, `task start`, `task done`. A task closes only when its `Verify:` command exits 0. The run leaves an evidence file.

## Install

Both tools run through `npx`. Node 22 is the floor.

```bash
npx -y @fission-ai/openspec@latest init --tools <tool>
npx -y spec-ctx@latest init --all
```

`<tool>` names your agent, such as `claude`, and skips the interactive picker. `--no-animation` keeps a terminal log clean. The rest of this guide writes `npx -y spec-ctx@latest` as `specctx` and `npx -y @fission-ai/openspec@latest` as `openspec`. `npm install -g spec-ctx` puts `specctx` on your path.

## Fresh path

Start in a Node project that has a `src/` and a `test/` folder and runs `node --test`.

```bash
$ openspec init --tools claude --no-animation
OpenSpec Setup Complete
Config: openspec/config.yaml (schema: spec-driven)
```

Skip the `/opsx:propose` hint that follows. Run spec-ctx first.

```bash
$ specctx init --all
wrote spec-ctx.toml
wrote openspec/templates/spec-driven-ids/spec.md
wrote openspec/templates/spec-driven-ids/tasks.md
wrote .claude/skills/specctx-run/SKILL.md
wrote openspec/config.yaml (rules, operations)
wrote .gitignore (4 lines)
templates: openspec/templates/spec-driven-ids/ (spec.md, tasks.md hold the ID placeholders)
next: specctx status
```

What this did:

- `spec-ctx.toml` holds the scan globs. It found `code = ["src/**"]` and `tests = ["test/**"]` on its own.
- `[gate] openspec` in that file pins the OpenSpec version that `init` found, such as `npx -y @fission-ai/openspec@1.15.0`. `gate` runs that build. Edit the line to move.
- `[gate] markdown = []`. The gate lints no markdown until you set the globs.
- `openspec/config.yaml` keeps `schema: spec-driven`. Its new `rules` tell the agent to take IDs from `specctx id new` and name the templates path. Its `operations.apply` guidance says that a task closes only with `specctx task done`. A `rules` key that existed keeps its items and gains the ones it lacked.
- `.gitignore` gets `.ctx/index.json`, `adopt-report.md`, `.ctx/current.json`, and `.ctx/gate-log.jsonl`. The rest of `.ctx/` is meant for git.
- The `specctx-run` skill under `.claude/skills/` and `.agents/skills/` runs the loop below. The three older skill names stay as aliases for one release.

Create a change and allocate IDs.

```bash
$ openspec new change add-greeting
Created change 'add-greeting' at openspec/changes/add-greeting/
Schema: spec-driven

$ specctx id new REQ GRT
REQ-GRT-001

$ specctx id new SCN GRT --for REQ-GRT-001 --count 2
SCN-GRT-001-1
SCN-GRT-001-2
```

`new change` writes only `.openspec.yaml` and `README.md`. Copy `proposal.md`, `design.md`, `specs/<capability>/spec.md`, and `tasks.md` from `openspec/templates/spec-driven-ids/` and fill them in. The two headers that matter:

```markdown
### Requirement: REQ-GRT-001 Greet by name
#### Scenario: SCN-GRT-001-1 A name is given
```

Give the spec a `## Purpose` of 50 characters or more. `openspec validate --strict` warns on a shorter one after archive. Each task cites its requirement and names the command that proves it:

```markdown
- [ ] 1.1 Add `greet(name)` in `src/greeting.js` [REQ-GRT-001] Verify: `node --test test/greeting.test.js`
- [ ] 1.2 Cover both scenarios in `test/greeting.test.js` [REQ-GRT-001] Verify: `node --test`
```

Check both tools before any code.

```bash
$ openspec validate add-greeting --type change --strict
Change 'add-greeting' is valid

$ specctx check --strict
0 findings
```

## The task loop

```bash
$ specctx status
add-greeting  done 0  open 2
next: specctx task start add-greeting/1.1

$ specctx task next
add-greeting/1.1  Add `greet(name)` in `src/greeting.js`
reqs: REQ-GRT-001
verify: node --test test/greeting.test.js

$ specctx task start add-greeting/1.1
-- add-greeting/1.1 | openspec/changes/add-greeting/tasks.md:5 | open | requested
- [ ] 1.1 Add `greet(name)` in `src/greeting.js` [REQ-GRT-001] Verify: `node --test test/greeting.test.js`

-- REQ-GRT-001 | openspec/changes/add-greeting/specs/greeting/spec.md:3 | active | ref from add-greeting/1.1
### Requirement: REQ-GRT-001 Greet by name
...
-- bundle 626 chars, 148.7% of 421 chars of spec text
```

`task start` prints the `context` answer for the task. It holds the task line and the requirement it cites with its scenarios. It holds the code and test lines that tag it, the design decision that refers to it, and the deltas and designs of the change. An agent reads this and nothing else under `openspec/`. The footer compares the bundle to all spec text. On a two task project the bundle is bigger than the spec text, because it also carries the task line. On a real tree the ratio drops to a few percent.

Write the code with a tag that names the requirement, and the test with a cover tag and the scenario IDs.

```javascript
// REQ-GRT-001
export function greet(name = "world") { ... }
```

```javascript
// Covers: REQ-GRT-001
// SCN-GRT-001-1 SCN-GRT-001-2
test("a name is given", ...)
```

Close the task. `task done` runs the Verify command and refuses on a non zero exit.

```bash
$ specctx task done add-greeting/1.1
done add-greeting/1.1. Evidence: .ctx/evidence/add-greeting/1.1.json

$ specctx task done add-greeting/1.2
done add-greeting/1.2. Evidence: .ctx/evidence/add-greeting/1.2.json
```

The checkbox in `tasks.md` is now `[x]`. The evidence file records the Verify command, its exit code, and a hash of each tagged file. `check --strict` reports a task whose tagged files changed after `task done` wrote its evidence.

## A retitle under a stable ID

Change the title of the requirement header in the delta. Keep the ID.

```bash
$ sed -i 's/REQ-GRT-001 Greet by name/REQ-GRT-001 Greeting text for a caller/' \
    openspec/changes/add-greeting/specs/greeting/spec.md

$ specctx check --strict
0 findings
```

The task, the code tag, and the test tag still point at `REQ-GRT-001`. spec-ctx does not care about the title.

Upstream OpenSpec does. It matches a MODIFIED delta to the main spec by header text. A second change that retitles `REQ-GRT-001` in a MODIFIED block needs a RENAMED block, or `openspec archive` refuses the delta. `specctx check` prints the block to paste, through the rule `retitle-needs-renamed`:

```markdown
## RENAMED Requirements
- FROM: `### Requirement: REQ-GRT-001 Greet by name`
- TO: `### Requirement: REQ-GRT-001 Greeting text for a caller`
```

Paste it into the delta above the MODIFIED block. Archive then moves the new title into `openspec/specs/greeting/spec.md` under the same ID.

## The gate

`gate` runs `check --strict`, both markdown linters, `openspec validate --all --strict`, and a 500 character length check on active deltas. It stops at the first failure.

```bash
$ specctx gate --strict
check: ok (strict)
linters: ok (0 file(s))
validate: ok (strict)
spec-length: ok
```

The linters read the globs in `[gate] markdown`. The default is empty, so `linters: ok (0 file(s))` is the normal line until you opt in. The validate step runs the command in `[gate] openspec`. The env var `SPECCTX_OPENSPEC` overrides it for one run. The archive and the steps after it:

```bash
$ openspec archive add-greeting -y
Change 'add-greeting' archived as '2026-10-28-add-greeting'.

$ openspec validate --all --strict
✓ spec/greeting

$ specctx check --strict
0 findings

$ specctx handoff write
wrote .ctx/handoff.md

$ specctx gate --strict
spec-length: ok
```

All six exit 0. `openspec/specs/greeting/spec.md` carries `REQ-GRT-001` with its scenarios.

## Existing project

- Run `specctx init --all`, then `specctx adopt --dry-run` to see the ID each header gets.
- Run `specctx adopt` to write them. It derives the capability code from the folder name.
- Run `specctx baseline write` to record the debt of the day, then `specctx gate --strict`.
- The full path with its rules is in the README under [Two paths](../README.md#two-paths).

## Things to know

- `openspec init` ends with a hint to run `/opsx:propose`. The propose skill does not know about `specctx id new`. Run `specctx init --all` first. The rules it merges into `openspec/config.yaml` reach every artifact instruction, so the agent learns the ID commands from there.
- `[ids] caps` in `spec-ctx.toml` is a guard, not a requirement. `id new REQ GRT` and `check` work with `caps = []`. Set it when you want `check` to reject an unknown code.
- `openspec new change` writes `.openspec.yaml` and `README.md` only. The templates with the ID placeholders live in `openspec/templates/spec-driven-ids/`. `init` prints that path and one rule in `openspec/config.yaml` names it. OpenSpec reads its own templates from the `spec-driven` schema. The rules carry the header format into every artifact instruction.
- The `task start` footer can read over 100 percent on a tiny project. The bundle holds decisions and task lines, which are not spec text.
- `handoff write` after the last archive prints `change: none` and `evidence: 0 task(s)`. It counts active changes only. The evidence files stay under `.ctx/evidence/<change>/`.
- `specctx task next` exits 1 with `no open task` when no change is active. Exit 1 is the findings code, not a crash.
- `openspec status --change <name>` after archive says `No changes exist.` The change is under `openspec/changes/archive/`.
- Upstream `validate --all --strict` exits 0 with an INFO line when archive would refuse a MODIFIED header. `specctx check` catches the retitle case with `retitle-needs-renamed`.
- Open questions live in `.ctx/questions.json`. `specctx handoff ask "<text>"` adds one and `specctx handoff resolve <n> "<answer>"` closes it. `handoff.md` shows both lists.
- `specctx handoff ask --change <c> "<text>"` gives the question to change `<c>`. `specctx next` then returns `ask` with `human: true` for that change until a human resolves the question. `--plan` marks the question as the plan approval. Only a `--plan` question ends the plan stop. A plain question during planning has `stage: design`. The `specctx-run` skill runs the plan stop command that `next` prints.
- Commit `.ctx/evidence/`, `.ctx/handoff.md`, `.ctx/questions.json`, and `.ctx/baseline.json`. `init` puts the per session files in `.gitignore`.
