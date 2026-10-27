# Changelog

This file lists the notable changes in each release of `spec-ctx`. Versions follow semver.

## Unreleased

### Changed

- `init` never replaces `spec-ctx.toml` and never exits 2 because a file exists. Without `--force`, it keeps each file with other content and lists it as `kept <file> (other content)`. The `next:` line then names the same command with `--force`.
- `init --schema` repairs the config of a project that already has `spec-ctx.toml`. It needs no `--force`.

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
