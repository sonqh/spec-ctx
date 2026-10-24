# Delegation prompt for the implementing agent

Paste everything below this line into a fresh Claude Code session (Opus) opened at the repository root.

---

You are implementing `agentrc`, a CLI that compiles a personal `profile.yaml` into native config for AI coding agents. The repository already holds the complete specification. Your job is to implement it, change by change, with the tools the repo provides.

## Repository

- Root: this directory. It is an OpenSpec project (`openspec/config.yaml`, four changes under `openspec/changes/`).
- Specs: `openspec/changes/<change>/specs/*/spec.md`. Every requirement has an ID like `REQ-CLD-004`. Every scenario has an ID like `SCN-CLD-004-1`.
- Decisions: `decisions/ADR-001` to `ADR-006`. Read ADR-005 (ID scheme) first. The others are referenced from specs when they matter.
- Context engine and task workflow: [spec-ctx](https://github.com/sonqh/spec-ctx), through `bash scripts/specctx.sh`. Use it. Do not read the spec tree by hand.
- Session skill: `.claude/skills/specctx-bootstrap/SKILL.md`. Run it first.
- Writing skill: every markdown you write follows `ste-humanize` (see CLAUDE.md, Writing rules). Lint with `scripts/tells-lint.py` and `scripts/ste-lint.py`.

## Objective

Implement the active changes in order. `specctx status` lists them. Each change is done when every task in its `tasks.md` is `[x]` through `specctx task done`, `specctx check --strict` exits 0, and `npx openspec validate --all --strict` exits 0. Then archive it with the OpenSpec archive workflow and continue.

Archived: `001-foundation` to `007-adopt-spec-ctx`.

## How to work

- Start every session with the `specctx-bootstrap` skill. It runs `specctx status` and `specctx task start`, which prints a bundle of only the REQ IDs that task cites. Stay inside that bundle. Ask for more IDs with `specctx related` only when the task needs them.
- Use `/opsx:apply <change>` for implementation. Follow its task order.
- Tag code with the REQ it implements (`// REQ-CLD-004`) and tests with `// Covers: REQ-CLD-004`. `specctx check --strict` fails on an active REQ with no covering test.
- Every scenario named in a task's `Verify:` clause becomes a test. Golden files go under `tests/golden/`.
- All filesystem tests run against a temp `HOME`. Never touch the real home directory.
- Close a task only with `specctx task done <task>`. It runs the `Verify:` command, writes the evidence, and sets the checkbox. Never tick a box by hand.
- Run `specctx check --strict` after each task group.
- Run `specctx handoff write` before you stop.

## Constraints

- Stack: TypeScript, Node 22 or bun, zod, vitest, smol-toml, @clack/prompts. No other runtime dependency without an ADR.
- No LLM in compile, render, plan, or apply (ADR-002). No daemon (ADR-003).
- Never read or write `auth.json`, `credentials*`, `*.token`, `.env` under an agent config dir (REQ-APPLY-009).
- Platforms: macOS and Linux. Skip Windows.

## Decisions you may make alone

- Internal module layout under `src/`.
- Test helpers and fixture content, as long as fixtures cover every scenario a task cites.
- Minor wording in help text, as long as it passes `ste-lint.py --baseline 0`.

## Decisions you must stop and ask about

- Any change to a `### Requirement:` text or a scenario. Specs are the contract. If a spec is wrong or impossible, write the problem in `.ctx/handoff.md` under `open_questions` and stop that task.
- Adding a runtime dependency.
- Changing an ADR.
- Anything that would write outside a temp HOME during tests.

## Deliverables per change

- Code and tests under `src/` and `tests/`.
- `tasks.md` with every task `[x]`.
- `docs/verification/<change>.md`: one line per task with the command run and its result. Written in ste-humanize style.
- Archived change under `openspec/changes/archive/`.

## Report format at the end of each session

Result, key decisions, verification run, remaining risks, next task. Short. Bullets.
