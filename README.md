# spec-ctx

A deterministic context engine and task workflow for [OpenSpec](https://github.com/Fission-AI/OpenSpec) projects. The CLI is `specctx`.

OpenSpec gives you a proposal, specs, a design, and tasks. spec-ctx adds what an AI agent needs to work on them without reading the whole tree:

- Stable IDs on every requirement, scenario, decision, and task.
- An index that links each ID to code, tests, and other IDs.
- `bundle`: the few kilobytes of spec that one task needs, with the file and line of each block.
- `task next`, `task start`, `task done`: the checkbox changes only after the `Verify:` command of the task exits 0, and the evidence stays beside the tree.
- A generated handoff, so the next session starts with one command.

No LLM call. No daemon. The same files give the same bytes.

## Install

spec-ctx needs Node 22.

```bash
npx spec-ctx init --all
```

The command writes `spec-ctx.toml`, installs the `spec-driven-ids` schema into `openspec/schemas/`, adds its rules to `openspec/config.yaml`, and installs three skills into `.claude/skills/` and `.agents/skills/`. Run it in a project after `openspec init`.

To keep the CLI on your path, run `npm install -g spec-ctx`. The examples below use `specctx`. With `npx`, write `npx spec-ctx` in its place.

Each GitHub release also carries a single binary for Linux and macOS.

## The loop

```bash
specctx status                 # active changes, current task, open questions
specctx task next              # the next open task, its REQ IDs, and its Verify command
specctx task start 001/1.1     # the spec bundle for that task
specctx task done 001/1.1      # run Verify, write evidence, set the checkbox
specctx check --strict         # IDs, links, coverage, and evidence
specctx handoff write          # .ctx/handoff.md for the next session
```

The skills `specctx-bootstrap`, `specctx-next`, and `specctx-done` teach an agent this loop. Install them alone with `npx skills add sonqh/spec-ctx` or `specctx init --skills`.

## Demo

`docs/demo.cast` is a recording of `init --all`, `task next`, `task start`, `task done`, `id new`, and `handoff write` in a fresh project. It runs for about 20 seconds. Play it with `asciinema play docs/demo.cast`. `node scripts/record-demo.mjs` records it again.

## IDs

| Kind | Pattern | Example |
| --- | --- | --- |
| Requirement | `REQ-<CAP>-<NNN>` | `REQ-IDX-003` |
| Scenario | `SCN-<CAP>-<NNN>-<n>` | `SCN-IDX-003-2` |
| Decision record | `ADR-<NNN>` | `ADR-002` |
| Design decision | `<change>/D<n>` | `002/D3` |
| Task | `<change>/<group>.<n>` | `002/3.2` |

Tag code with a comment `// REQ-IDX-003`. Tag tests with `// Covers: REQ-IDX-003`. Link IDs with a line `Refs: REQ-IDX-001, ADR-002`. Get a new ID with `specctx id new REQ IDX`. Retire an ID with `specctx id retire REQ-IDX-009 "merged into REQ-IDX-003"`.

## Commands

| Command | Use |
| --- | --- |
| `build` | Write `.ctx/index.json`. Every other command rebuilds a stale index first. |
| `status` | Active changes with task counts, the current task, and open questions. |
| `query <term...>` | Entries that hold every term. Flags: `--kind`, `--change`, `--limit`, `--all`. |
| `related <ID>` | Linked entries with the reason for each link. Flags: `--depth`, `--all`. |
| `bundle <ID...>` | Spec text of the IDs, their scenarios, decisions, and neighbors. Flags: `--budget`, `--depth`, `--all`. |
| `check` | ID and link integrity. `--strict` adds test coverage and evidence. |
| `id new`, `id retire` | Allocate and retire IDs. |
| `task next`, `start`, `verify`, `done`, `reopen` | The task state machine. |
| `handoff write`, `ask`, `resolve` | The session handoff and its open questions. |
| `init` | Config file, schema bundle, and skills. Flags: `--schema`, `--skills`, `--all`, `--force`. |

Every command takes `--root <path>` and `--json`. Exit codes: 0 for success, 1 for findings or a failed Verify command, 2 for a usage error, 3 for an internal error.

## Config reference

`spec-ctx.toml` sits at the project root. Every key is optional.

```toml
[scan]
specs = ["openspec/specs/**/*.md"]      # main specs
changes = ["openspec/changes/**/*.md"]  # active and archived changes
decisions = ["decisions/*.md"]          # decision records
code = ["src/**"]                       # files with code tags
tests = ["tests/**"]                    # files with Covers tags and scenario IDs
ignore = []                             # globs that the scan skips

[ids]
caps = []                               # capability codes. check reports a REQ with another code.
task_pattern = '\d+\.\d+'               # the task number in a tasks.md checkbox

[bundle]
budget = 8000                           # characters
depth = 1

[verify]
timeout_s = 600
```

## GitHub Action

```yaml
- uses: sonqh/spec-ctx@v0
  with:
    version: latest   # npm version of spec-ctx
    strict: true
```

The action runs `specctx check --strict`, both markdown linters, and `openspec validate --all --strict`.

## Develop

```bash
bun install
bun run build
bun run test          # Bun
bun run test:node     # Node 22
node dist/cli.js status
git config core.hooksPath .githooks
```

The engine was first built and used inside [sonqh/agentrc](https://github.com/sonqh/agentrc). The specs of spec-ctx live in `openspec/` and the decisions in `decisions/`.

## License

MIT.
