# Proposal

## Why

Changes 015 and 016 made `gate --strict` pass on a fork of OpenSpec. The friction log in `docs/dogfood/openspec.md` still holds five small cuts that a stranger hits on day one. `task backfill` wrote 1,812 evidence files on the fork, 1,351 of them for archived changes, so the first commit was 1,924 files. `init` wrote three skills under `.claude/`, which the fork ignores in `.gitignore`, and said nothing. It wrote `tests = ["tests/**"]` where the fork uses `test/`. It left `adopt-report.md` and `.ctx/index.json` for git to pick up. `adopt --dry-run` exits 1 and its text reads like success, so a CI job fails with no reason on the screen. And an agent that reads the hint from `task start` has no way to list the requirements of one change, because `query` needs a term. Items 2, 3, 5, 6, and 10 of the friction log.

## What Changes

- `task backfill` writes manual evidence only for ticked tasks of active changes. Archived changes stay untouched.
- `init` adds `.ctx/index.json` and `adopt-report.md` to `.gitignore` under a `# spec-ctx` comment when they are absent, and creates the file when it is missing. It prints `wrote .gitignore (2 lines)` or `kept .gitignore`. When `.gitignore` ignores `.claude/` and `init` writes skills there, it prints one note that names the tracked copies under `.agents/skills/`.
- `init` looks at the tree before it writes `spec-ctx.toml`. With `test/` and no `tests/` it writes `tests = ["test/**"]`. With `lib/` and no `src/` it writes `code = ["lib/**"]`.
- `adopt --dry-run` keeps exit 1 when headers need an ID, and its last line says why: `exit 1: <n> headers need an ID. Next: specctx adopt`.
- `query --change <name>` with no term lists every canonical entry of that change. `--kind` still filters. Without `--change`, no term stays a usage error. The hint of `task start` names the new call.
- REQ-TASK-006 gets SCN-TASK-006-3. REQ-DIST-002 gets SCN-DIST-002-6 to -8. REQ-ADOPT-001 gets SCN-ADOPT-001-3. REQ-QRY-001 gets SCN-QRY-001-5. SCN-TASK-002-4 changes its hint text.

Out of scope: the CAP code pass for a repeated first segment (item 4), the `status` list (item 8), and the `bundle` footer (item 12).

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `task-workflow`: REQ-TASK-006, REQ-TASK-002.
- `distribution`: REQ-DIST-002.
- `adopt-existing`: REQ-ADOPT-001.
- `query`: REQ-QRY-001.

## Impact

- `src/cli/workflow.ts`, `src/cli/commands.ts`, `src/init/init.ts`, `src/config.ts`, `src/graph/query.ts`, `src/cli/help.ts`.
- `tests/tasks/backfill.test.ts`, `tests/tasks/start.test.ts`, `tests/init/init.test.ts`, `tests/adopt/dryrun.test.ts`, `tests/query/query.test.ts`, `tests/paths/existing.sh`.
- `CHANGELOG.md`, `README.md`, `docs/dogfood/openspec.md`.
