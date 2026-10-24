# spec-ctx

spec-ctx is a deterministic context engine and task workflow for OpenSpec projects. The CLI is `specctx`. Specs live in `openspec/`. Decisions live in `decisions/`. Every requirement has an ID. Read `decisions/ADR-002-id-scheme.md` once.

## First thing in every session

Run the `bootstrap-context` skill. It gives you only the specs for your task. The engine is the TypeScript CLI. Run `bun run build` once if `dist/` is missing.

The loop for every task:

```bash
node dist/cli.js status
node dist/cli.js task next
node dist/cli.js task start <task>     # prints the bundle and sets the current task
# work
node dist/cli.js task done <task>      # runs Verify, writes evidence, sets the checkbox
node dist/cli.js handoff write
```

Tick no checkbox by hand. Allocate IDs with `node dist/cli.js id new`. Do not open `openspec/specs/` or `openspec/changes/*/specs/` by hand. Use `bundle` or `task start`.

## Workflow

- One OpenSpec change at a time, in order: 001, 002, 003. Use `/opsx:apply <change>` and `/opsx:archive <change>`.
- Tag code with its REQ: `// REQ-IDX-001`. Tag tests: `// Covers: REQ-IDX-001`.
- A task closes when `task done` ran its `Verify:` command with exit 0 and wrote the evidence under `.ctx/evidence/`.
- Before archive: `check --strict` and `npx -y @fission-ai/openspec@latest validate --all --strict` must both exit 0. Run validate again after archive, before push.
- Run `bun run ci:local` before every push. It runs the same steps as CI on this machine and saves GitHub Actions minutes. The `pre-push` hook runs it too. `SPECCTX_SKIP_PUSH_GATE=1` skips the hook and says so.
- Run `node dist/cli.js handoff write` before you stop. Commit `.ctx/` with the work. Only `.ctx/index.json` stays out of git.

## Writing rules

- Every markdown file follows the `ste-humanize` skill, Human mode. Short sentences. Active voice. No semicolons. No dashes. Bullets for parallel parts. Technical terms stay as the field uses them.
- Help text and error strings in code follow Strict mode.
- Lint: `python3 scripts/tells-lint.py --baseline 0 <file>` and `python3 scripts/ste-lint.py --baseline 0 --disable synonym-rotation <file>`. Help text must pass `ste-lint.py --baseline 0` with no disable.

## Hard rules

- No LLM call anywhere in the engine. No daemon, no file watcher. See ADR-003.
- Only Node 22 APIs. No `Bun.` global outside `scripts/`. See ADR-001.
- Runtime dependencies: `smol-toml` only. A new one needs an ADR.
- Tests write only under a temp dir or `tests/fixtures/`. Never the real home or another repo.
- The Python engine under `tools/ctx/` is the parity oracle. Fix a bug in both engines or in neither.

## Stack

TypeScript, Bun for dev and build, Node 22 at run time, `bun test` or vitest, `smol-toml`. Python 3 only for `scripts/*-lint.py` and the parity oracle.
