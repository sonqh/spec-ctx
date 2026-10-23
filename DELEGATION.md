# Delegation prompt for the implementing agent

Paste everything below this line into a fresh Claude Code session (Opus) opened at the repository root.

---

You are implementing `spec-ctx`, a TypeScript CLI (`specctx`) that is a deterministic context engine and task workflow for OpenSpec projects. The repository holds the complete specification. Your job is to implement it, change by change, with the tools the repo provides.

## Repository

- Root: this directory. An OpenSpec project with three changes under `openspec/changes/`: `001-engine-port`, `002-ids-and-tasks`, `003-distribution`. Implement them in that order.
- Specs: `openspec/changes/<change>/specs/*/spec.md`. Every requirement has an ID like `REQ-IDX-003`. Every scenario has an ID like `SCN-IDX-003-1`.
- Decisions: `decisions/ADR-001` to `ADR-005`. Read ADR-001 and ADR-002 first.
- Bootstrap engine: `tools/ctx/ctx.py`, the Python engine from agentrc. Use it to load specs until change 001 lands. It is also the parity oracle for the port.
- Session skill: `.claude/skills/bootstrap-context/SKILL.md`. Run it first.
- Writing: every markdown you write follows `ste-humanize` (CLAUDE.md, Writing rules).

## Objective

Each change is done when every task in its `tasks.md` is `[x]`, every `Verify:` command exited 0, `check --strict` exits 0, and `npx -y @fission-ai/openspec@latest validate --all --strict` exits 0. Archive it, run validate again, push, continue.

## How to work

- Start every session with the bootstrap skill. Stay inside the bundle for the task. Use `related` only when the task needs more.
- Tag code `// REQ-XXX-NNN` and tests `// Covers: REQ-XXX-NNN`.
- Every scenario in a task's cited requirements becomes a test.
- Mark a task `[x]` only after its Verify command passed. After change 002 lands, use `specctx task done` and never tick by hand.
- Parity: a difference between the Python engine and the TypeScript engine is a bug in one of them. Decide which from the spec. Fix it in both. Note it in `docs/verification/001.md`.
- Write `.ctx/handoff.md` before you stop.

## Constraints

- TypeScript. Bun for dev and build. Node 22 at run time. No `Bun.` global outside `scripts/`.
- Runtime dependency: `smol-toml` only. Dev dependencies are free as long as `npx spec-ctx` needs none of them.
- No LLM call, no daemon, no file watcher (ADR-003).
- Tests write only to a temp dir or `tests/fixtures/`.
- Build under 1 s on 2,000 files on Node 22.

## Decisions you may make alone

- Module layout under `src/`.
- Test helpers and fixture content, as long as fixtures cover every scenario a task cites.
- Help text wording that passes `ste-lint.py --baseline 0`.

## Decisions you must stop and ask about

- Any change to a `### Requirement:` text or a scenario. Record the problem in `.ctx/handoff.md` under `open_questions` and stop that task.
- A new runtime dependency. A change to an ADR.
- Publishing to npm (003/3.3) and pushing to the agentrc repo (003/4.1). Prepare everything, then stop and ask.

## Deliverables per change

- Code and tests under `src/` and `tests/`.
- `tasks.md` with every task `[x]`.
- `docs/verification/<change>.md`: one line per task with the command run and its result.
- Archived change under `openspec/changes/archive/`.

## Report format at the end of each session

Result, key decisions, verification run, remaining risks, open questions, next task. Short. Bullets.
