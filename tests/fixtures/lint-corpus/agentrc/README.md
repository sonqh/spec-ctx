# agentrc

agentrc compiles a personal `profile.yaml` into native config for AI coding agents. Claude Code and Codex first. Cursor and Gemini CLI later.

## Install

agentrc needs Node 22 or later and git. agentrc uses git to fetch `cct` catalog items.

```bash
git clone https://github.com/sonqh/agentrc.git
cd agentrc
npm install
npm link
```

`npm install` builds `dist/`. `npm link` puts `agentrc` on your PATH.

## Use

```bash
agentrc init
```

`init` does these steps in order:

1. It tells you what it does and where it can write. It writes nothing in your agent config before you confirm.
2. It reads your current Claude Code and Codex config. Imported values become the defaults.
3. It asks twelve core questions and one question for catalog items. Each question shows what the answer makes.
4. It asks once about each agent you chose that is not installed: keep it or disable it.
5. It writes `~/.agentrc/profile.yaml`. Comments in the file list the allowed values.
6. It fetches the catalog items in the profile and pins them.
7. It shows one line per file and asks before it writes. Add `--diff` to see the full diff.
8. It lists the files it wrote and the commands to check and undo.

The name defaults to `git config user.name`. The role has no default.

Commands:

| Command | What it does |
| --- | --- |
| `agentrc init` | Asks the questions, then plans and applies. |
| `agentrc apply` | Writes the agent files. Backs up each file first. |
| `agentrc status` | Compares the lockfile with the files on disk. Exit 1 on drift. |
| `agentrc revert` | Restores the last backup set and tells you what `status` will show. `--list` shows the sets. |

Advanced commands:

| Command | What it does |
| --- | --- |
| `agentrc plan [--diff]` | Shows what apply would change. Writes nothing. |
| `agentrc elicit` | Asks the questions and writes the profile. Applies nothing. |
| `agentrc import` | Writes a draft profile from your current config. |
| `agentrc validate` | Checks the profile. |
| `agentrc resolve` | Fetches catalog items and pins their digests. |
| `agentrc update [item]` | Moves unpinned items to the latest ref. Applies nothing. |

Catalog items use the form `skills/<owner>/<name>` or `cct/<path>`, with an optional `@<ref>`. A failed fetch prints four lines: `item`, `source`, `cause`, and `fix`. Add `--verbose` to see the output of git or npm.

Run `agentrc --help` for the command list and the terms. Run `agentrc <command> --help` for flags. Use `init --answers <file>` to answer from a YAML file. The file must hold `name` and `role` when no profile exists yet. Use `--assist <repo>` with `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` set to get suggested answers. Set `AGENTRC_ASSIST_MODEL` to pick the model.

agentrc never reads or writes `auth.json`, `credentials*`, `*.token`, or `.env` files in an agent config dir.

## What it writes

- Claude Code: a managed block in `~/.claude/CLAUDE.md`, `rules/*.md`, owned keys in `settings.json`, managed servers in `~/.mcp.json`, `skills/`, and `commands/`.
- Codex: a managed block in `~/.codex/AGENTS.md`, owned keys and `[mcp_servers.*]` tables in `config.toml`, `prompts/`, and skills in `~/.agents/skills/`.

Text outside the managed block and keys agentrc does not own stay as you wrote them.

## Develop

```bash
bun install
bun run test
bash scripts/specctx.sh status
bash scripts/specctx.sh check --strict
npx -y @fission-ai/openspec@latest validate --all --strict
git config core.hooksPath .githooks
```

## Layout

- `src/`: the CLI, the compiler, the adapters, the apply pipeline, elicit, import, and the catalog resolver.
- `tests/`: vitest tests and golden files.
- `openspec/`: specs. Archived changes sit under `changes/archive/`.
- `decisions/`: six ADRs and the retired ID list.
- `scripts/specctx.sh`: runs [spec-ctx](https://github.com/sonqh/spec-ctx), the context engine and task workflow. It indexes every ID and returns only the slice a task needs.
- `.ctx/`: task evidence and the session handoff from spec-ctx. Only `.ctx/index.json` stays out of git.
- `docs/verification/`: one record per change.
- `CLAUDE.md`: rules for every agent session. `AGENTS.md` points to it.

## IDs

Every requirement is `REQ-<CAP>-<NNN>`, every scenario `SCN-<CAP>-<NNN>-<n>`, every decision `ADR-<NNN>`. Links are `Refs:` lines. See `decisions/ADR-005-id-scheme.md`.
