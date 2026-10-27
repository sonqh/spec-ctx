# Changelog

This file lists the notable changes in each release of `spec-ctx`. Versions follow semver.

## 0.1.2

### Changed

- `init` never replaces `spec-ctx.toml` and never exits 2 because a file exists. Without `--force`, it keeps each file with other content and lists it as `kept <file> (other content)`. The `next:` line then names the same command with `--force`.
- `init --schema` repairs the config of a project that already has `spec-ctx.toml`. It needs no `--force`.
- `check` reports no `missing-id` for a header inside an archived change. `adopt` never writes IDs there.
- `baseline write` also records the `missing-id` findings of active changes, as `missing-id <file> <title>`. The existing path then ends with `gate --strict` exit 0 on a project with archived changes or a delta header that matches no main requirement. Found on a fork of OpenSpec, see `docs/dogfood/openspec.md`.
- `task start` prints one hint line when the task cites no REQ. It names `specctx query --change <change> --kind req` and the citation to add.
- `query --kind` accepts the kind in any case. `--kind REQ` and `--kind req` return the same entries.
- `baseline write` records the hard lint findings per file and rule as `lint <file> <rule> <count>`. `gate` fails the lint step only when a count rises above its line. It prints one summary line and cuts the detail at 50 lines (`--json` keeps every line). `baseline prune` lowers and drops the lines. `spec-ctx.toml` gets `[gate] markdown`, the globs the gate lints. `--markdown` still overrides it.
- `task backfill` writes evidence only for ticked tasks of active changes. Archived changes stay untouched. On a fork of OpenSpec it wrote 1,351 files for the archive before.
- `init` adds `.ctx/index.json` and `adopt-report.md` to `.gitignore` under a `# spec-ctx` comment when they are absent, and creates the file when it is missing. It prints `wrote .gitignore (2 lines)` or `kept .gitignore`. When `.gitignore` ignores `.claude/` and `init` writes skills there, it prints one note that names the tracked copies under `.agents/skills/`.
- `init` writes `tests = ["test/**"]` when `test/` exists and `tests/` does not, and `code = ["lib/**"]` when `lib/` exists and `src/` does not.
- `adopt --dry-run` ends with `exit 1: <n> headers need an ID. Next: specctx adopt`. The exit code stays 1.
- `query --change <name>` with no term lists every canonical entry of that change. `--kind` still filters. Without `--change`, no term stays a usage error. The hint of `task start` names this call.

## 0.1.1

### Added

- `--help` on every command prints help for that command.
- `check` prints a summary with a hint for each kind of finding.
- The engine detects the project root and its OpenSpec layout.
- Commands end with a `next:` line that names the next step.
- Output has color on a TTY. Set `NO_COLOR` to turn it off.
- `task start` ends with a footer that gives the bundle size.
- `gate` writes its own log.
- `init --schema` repairs config items that YAML reads as mappings. The repair quotes each `rules` and `operations` item.
- The `spec-driven-ids` schema has a README with a copy install path.

### Changed

- A change folder with a kebab-case name, such as `013-schema-catalog`, gets a change key.
- `caps` can be empty.
- When Verify fails, `task done` prints `Verify failed (exit n). The task stays open.`
- The lint rules match the ste-humanize oracle at commit 60bc25a.

## 0.1.0

First release on npm.
