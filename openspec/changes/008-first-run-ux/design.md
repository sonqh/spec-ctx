# Design

## Context

Seven small fixes and one README rewrite. The change key is the only one that touches the data model. Everything else is messages, help text, and one log line.

## Goals / Non-Goals

**Goals:**
- A fresh OpenSpec project with kebab-case change names works end to end: `init --all`, `id new`, `task start`, `task done`, `check`, `gate`, `stats`.
- Every command answers `--help` with its own page.
- Every output that stops the user names the next step.
- A stranger reads the first screen of the README and knows what the tool does and how to install it.

**Non-Goals:**
- Color. It needs a TTY check, `NO_COLOR`, and tests for both. A later change.
- New check rules beyond the duplicate key.
- Changing exit codes. `task next` with nothing open still exits 1. `adopt --dry-run` with work still exits 1. Scripts depend on both. The message changes, the code does not.

## Decisions

- D1 Change key. `changeKey(folder)` returns the leading digits when the folder matches `^(\d+)-`. Otherwise it returns the full folder name. Task IDs, decision IDs, evidence paths, `stats`, `handoff`, and `--change` filters all use the key. Every place that accepts a key also accepts the full folder name. Two changes, active or archived, with one key are a hard `check` finding `duplicate-change-key`. Amends ADR-002. The rows for Design decision and Task read `<key>/D<n>` and `<key>/<group>.<n>` with a line that defines the key.
- D2 Why not the full folder name as the only key. Our three repos hold evidence under `.ctx/evidence/001/` and handoffs that cite `003/3.3`. A move would need a migration and would break the parity goldens. The digits are shorter to type and to read in a bundle. The full name as alias gives users who prefer it the same result.
- D3 Gate log. `specctx gate` appends the log line that REQ-STAT-005 describes, after its last step or at the first failure. `scripts/ci-local.sh` removes its own append so one run writes one line. The `steps` field lists the gate steps. The field names do not change, so old lines still count.
- D4 Empty caps. `caps = []` means no restriction. `id new` then accepts any code that matches `[A-Z]{2,6}`. With a non-empty list the current behavior stays. The `unknown-cap` message ends with `Add "<code>" to caps under [ids] in spec-ctx.toml.` Modifies REQ-IDS-001.
- D5 Per command help. `help.ts` becomes a table: one record per command with `usage`, `summary`, `flags`, `exit`, `example`. `specctx --help` renders the three groups from the table as today. `specctx <cmd> --help`, `specctx <cmd> <sub> --help`, and `specctx help <cmd>` render that record only. `lint tells --help` and `lint ste --help` render from the same table in the same style. `help` and `lint` join the unknown command list. Every rendered page passes `lint ste --baseline 0`.
- D6 Check summary. Human output of `check` prints the findings as today, then one blank line, then `<n> findings in <m> files (<h> hard, <a> advisory)`, then one line per rule present: `<rule>  <count>  <hint>`. Hints live in one table next to the rule definitions. `--json` does not change. Exit codes do not change.
- D7 Next steps. A fixed table of messages. `status`: after the counts, `next: specctx task next` when a task is open, `next: archive <change>` when every task is done, `next: specctx check` when uncovered REQs exist. `task next` with nothing open: `no open task. Every task in the active changes is done. Next: archive <change>.` `init`: `next: specctx status`. `adopt --dry-run` with work: `<n> headers need an ID. Next: specctx adopt`. `adopt` with 0 headers: `nothing to adopt` and no `adopt-report.md`. `init` when every file exists and matches: `nothing to do`, exit 0.
- D8 Project detection. Every command except `init` and `--help` looks for `openspec/` at the root. Without it, print `not an OpenSpec project (no openspec/ under <root>). Run npx -y @fission-ai/openspec@latest init first.` and exit 2. Nothing is written.
- D9 README. The order is fixed. Title. One sentence of value with the measured numbers from `docs/metrics/`. A three command quickstart. One real `task start` excerpt of at most 12 lines. The demo SVG. Install, with the git form first and the npm form marked as available after publish. The two paths. `Develop`, `Layout`, `IDs`, and the gate description move to `docs/CONTRIBUTING.md`. `SPECCTX_OPENSPEC` gets a line in the config reference. `stats` prints a footer: `context_ratio = bundle chars / chars of all specs. Lower is better.`

## Risks / Trade-offs

- A folder like `2fa-login` keeps its full name as key, because the rule needs a dash right after the digits.
- The per command help table is a rewrite of `help.ts`. The golden test for `--help` output changes once. Record it in the verification record.
- Moving sections out of the README changes anchors. Nothing links to them yet.

## Open Questions

None.
