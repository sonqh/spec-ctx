# spec-ctx

spec-ctx is a light ID retrieval script for OpenSpec repositories, plus prebuilt skills that automate programming on top of it. The CLI is `specctx`. Specs live in `openspec/`. Decisions live in `decisions/`. Every requirement has an ID. Read `decisions/ADR-002-id-scheme.md` once.

## Direction

The owner set this direction in `decisions/ADR-007-query-first.md`. It binds every agent. Two layers, in this order:

1. Layer 1, retrieval. An agent asks what relates to a task, requirement, file, or change. spec-ctx returns only the linked specs, decisions, code, and tests, through the IDs. Commands: `query`, `related`, `bundle`, and the planned `context`. Layer 1 has priority.
2. Layer 2, the skills. `specctx-run`, `next`, `task start`, and `task done` automate programming on top of layer 1. A layer 2 change is in scope when it makes the skills use layer 1 better, or fixes a bug.

- A CLI that reads files. No MCP server, no server of any kind, no LLM call, no embeddings.
- Tasks, Verify, evidence, `check`, the gate, and the Action keep the links true. They are not the headline.
- Every proposal names its layer and its benefit. The product manager and the architect agents in `.claude/agents/` review each plan stop against this section before the lead approves.
- Adjust existing work to serve the two layers. Do not remove it.

## First thing in every session

To build a change, run the `specctx-run` skill. It runs `specctx next --json` and acts on the action it gets, until the change reaches the archive or a human must decide. The repo-local `bootstrap-context` skill still loads the specs for one task when you need them by hand. The engine is the TypeScript CLI. Run `bun run build` once if `dist/` is missing. In this repository `specctx` is `node dist/cli.js`.

The loop that the skill runs for every task:

```bash
node dist/cli.js next --json           # the next action, its task, and its command
node dist/cli.js task start <task>     # prints the bundle and sets the current task
# work
node dist/cli.js task done <task>      # runs Verify, writes evidence, sets the checkbox
node dist/cli.js handoff write
```

Tick no checkbox by hand. Allocate IDs with `node dist/cli.js id new`. Do not open `openspec/specs/` or `openspec/changes/*/specs/` by hand. Use `bundle` or `task start`.

## Workflow

- One OpenSpec change at a time, in order: 001, 002, 003. Plan with the upstream `openspec-propose` skill, but read specs with `specctx bundle` or `specctx query`, never `openspec show`. Archive with the command that `specctx next` prints, which runs the OpenSpec CLI archive. Never run `/opsx:apply`. The `specctx-run` skill replaces it.
- Tag code with its REQ: `// REQ-IDX-001`. Tag tests: `// Covers: REQ-IDX-001`.
- A task closes when `task done` ran its `Verify:` command with exit 0 and wrote the evidence under `.ctx/evidence/`.
- Before archive: `check --strict` and `npx -y @fission-ai/openspec@latest validate --all --strict` must both exit 0. Run validate again after archive, before push.
- Run `bun run ci:local` before every push. It runs the same steps as CI on this machine and saves GitHub Actions minutes. The `pre-push` hook runs it too. `SPECCTX_SKIP_PUSH_GATE=1` skips the hook and says so.
- Run `node dist/cli.js handoff write` before you stop. Commit `.ctx/` with the work. Only `.ctx/index.json` stays out of git.

## Writing rules

- Every markdown file follows the `ste-humanize` skill, Human mode. Short sentences. Active voice. No semicolons. No dashes. Bullets for parallel parts. Technical terms stay as the field uses them.
- Help text and error strings in code follow Strict mode.
- Lint: `node dist/cli.js lint tells --baseline 0 <file>` and `node dist/cli.js lint ste --baseline 0 --disable synonym-rotation <file>`. Help text must pass `lint ste --baseline 0` with no disable.

## Hard rules

- No LLM call anywhere in the engine. No daemon, no file watcher. See ADR-003.
- Only Node 22 APIs. No `Bun.` global outside `scripts/`. See ADR-001.
- Runtime dependencies: `smol-toml` only. A new one needs an ADR.
- Never change `version` in `package.json` unless the user asks for a release. A version bump on `main` publishes to npm. The commit subject starts with `release:`. See REQ-GOV-007.
- Tests write only under a temp dir or `tests/fixtures/`. Never the real home or another repo.
- `tests/parity/run.sh` diffs the engine against the goldens in `tests/fixtures/parity-golden/`. A golden changes only with `run.sh --record` and a note in the verification record of the change.

## Stack

TypeScript, Bun for dev and build, Node 22 at run time, `bun test` or vitest, `smol-toml`. No Python.
