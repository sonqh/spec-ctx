# agentrc

agentrc compiles `profile.yaml` into native config for AI coding agents. Specs live in `openspec/`. Decisions live in `decisions/`. Every requirement has an ID. Read `decisions/ADR-005-id-scheme.md` once.

## First thing in every session

Run the `specctx-bootstrap` skill. It gives you only the specs for your task. [spec-ctx](https://github.com/sonqh/spec-ctx) is the engine. Call it through `bash scripts/specctx.sh`, the one place that names the install source. The examples write it as `specctx`.

The loop for every task:

```bash
specctx status
specctx task next
specctx task start <task>     # prints the bundle and sets the current task
# work
specctx task done <task>      # runs Verify, writes evidence, sets the checkbox
specctx handoff write
```

Do not open `openspec/specs/` or `openspec/changes/*/specs/` by hand. Use `specctx bundle` or `specctx task start`. Allocate IDs with `specctx id new REQ <CAP>`. Every command rebuilds a stale index first.

## Workflow

- One OpenSpec change at a time. Use `/opsx:apply <change>` to implement and `/opsx:archive <change>` when every task is `[x]`.
- Tag code with its REQ: `// REQ-CLD-004`. Tag tests: `// Covers: REQ-CLD-004`.
- Close a task only with `specctx task done <task>`. Tick no checkbox by hand.
- Before archive: `specctx check --strict` and `npx openspec validate --all --strict` must both exit 0.
- Run `bash scripts/ci-local.sh` before every push. It runs the CI steps on this machine and saves GitHub Actions minutes. The `pre-push` hook runs it too. `SPECCTX_SKIP_PUSH_GATE=1` skips the hook and says so.
- Run `specctx handoff write` before you stop. Commit `.ctx/` with the work. Only `.ctx/index.json` stays out of git.

## Writing rules

- Every markdown file follows the `ste-humanize` skill, Human mode. Short sentences. Active voice. No semicolons. No dashes. Bullets for parallel parts. Technical terms stay as the field uses them.
- Help text and error strings in code follow Strict mode.
- Lint: `python3 scripts/tells-lint.py <file>` and `python3 scripts/ste-lint.py <file>`. CI runs both with baseline 0 on `openspec/`, `decisions/`, and root markdown.

## Hard rules

- No LLM call in `compile`, `render`, `plan`, or `apply`. See ADR-002.
- No daemon, no file watcher. See ADR-003.
- Never read or write files matching `auth.json`, `credentials*`, `*.token`, `.env` under an agent config dir. See REQ-APPLY-009.
- Every artifact path must resolve under the agent config dir or `~/.agents/skills`.
- Tests run against a temp `HOME`. Never against the real one.

## Stack

TypeScript, Node 22 or bun, zod, vitest, smol-toml, @clack/prompts. Python 3 only for `scripts/*-lint.py`. Golden files under `tests/golden/`.
