# Tasks

Run `bun run build` before every Verify. Every Verify runs from the repo root.

## 1. Change key

- [x] 1.1 Rename `changeNum` to `changeKey` in `src/index/scan.ts`. Return the digits for `^(\d+)-`, else the full folder name. Update every caller (`tasks.ts`, `stats.ts`, `handoff.ts`, `ids.ts`, `workflow.ts`, `evidence.ts`). Add `resolveChange(input)` that accepts a key or a full folder name and returns the folder. Use it in `task start`, `task done`, `task verify`, `task reopen`, `--change`, and `stats --change`. Add `tests/fixtures/kebab-repo/` with changes `add-mfa` and `add-sso`, each with tasks 1.1 and 1.2, and one task whose Verify command is `true`. [REQ-IDX-005] Verify: `bun test tests/index tests/tasks && bash tests/parity/run.sh`
- [x] 1.2 Add `duplicate-change-key` to `check` as a hard rule. Add the fixture `tests/fixtures/dup-key-repo/` with `001-a` and `001-b`. [REQ-CHK-004] Verify: `bun test tests/check`
- [x] 1.3 Amend `decisions/ADR-002-id-scheme.md`. The Design decision and Task rows read `<key>/D<n>` and `<key>/<group>.<n>`. Add one line under the table that defines the key and names 008/D1. Lint. [REQ-IDX-005] Verify: `node dist/cli.js lint tells --baseline 0 decisions/ADR-002-id-scheme.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation decisions/ADR-002-id-scheme.md`

## 2. Gate log and IDs

- [x] 2.1 `gate` appends the log line to `.ctx/gate-log.jsonl` with `at`, `ok`, `failed_step`, `duration_s`, `steps`. Remove the append from `scripts/ci-local.sh`. Add a test that runs `gate` on a fixture twice and counts two lines. [REQ-STAT-005] Verify: `bun test tests/cli/gate.test.ts tests/stats`
- [x] 2.2 Empty `caps` accepts any `[A-Z]{2,6}` code. The `unknown-cap` message ends with the `Add "<code>" to caps under [ids] in spec-ctx.toml.` hint. Update the comment in the generated `spec-ctx.toml`. [REQ-IDS-001] Verify: `bun test tests/ids`
- [x] 2.3 `stats` prints the `context_ratio` footer. [REQ-STAT-005] Verify: `bun test tests/stats && node dist/cli.js stats | tail -1 | grep -q "context_ratio = bundle chars"`

## 3. Help and messages

- [x] 3.1 Rewrite `src/cli/help.ts` as a table of command records with `usage`, `summary`, `flags`, `exit`, `example`, and a group. Render `specctx --help` from it with the same three groups. Render `specctx <cmd> --help`, `specctx <cmd> <sub> --help`, and `specctx help <cmd>` as one page with the sections `Usage`, `Flags`, `Exit codes`, `Example`. Move `lint tells --help` and `lint ste --help` to the same table. Add `help` and `lint` to the unknown command list. Every page passes `lint ste --baseline 0`. Re-record the help golden and note it in `docs/verification/008.md`. [REQ-CLI-006] Verify: `bun test tests/cli/help.test.ts && for c in status build query related bundle check gate stats init adopt "task next" "task start" "task done" "id new" "handoff write" "lint tells" "lint ste"; do node dist/cli.js $c --help > /tmp/h.md && node dist/cli.js lint ste --baseline 0 /tmp/h.md || exit 1; done`
- [ ] 3.2 `check` human output ends with the summary line and the per rule lines with hints. Put the hint table in `src/check/hints.ts` next to the rule names. Every rule has a hint. `--json` is unchanged. [REQ-CHK-004] Verify: `bun test tests/check && node dist/cli.js check --json | node -e 'JSON.parse(require("fs").readFileSync(0,"utf8"))'`
- [ ] 3.3 Project detection. Every command except `init`, `--help`, and `--version` exits 2 with `not an OpenSpec project (no openspec/ under <root>)` and writes nothing when `openspec/` is missing. Test in an empty temp dir and assert no `.ctx/`. [REQ-CLI-007] Verify: `bun test tests/cli/root.test.ts`
- [ ] 3.4 Next step lines. `status` ends with `next: specctx task next`, `next: archive <change>`, or `next: specctx check` by state. `task next` with nothing open prints the REQ-TASK-001 message. `init` ends with `next: specctx status`. `init` with nothing to do prints `nothing to do` and exits 0. `adopt --dry-run` with work ends with `<n> headers need an ID. Next: specctx adopt`. `adopt` with nothing to do writes no `adopt-report.md`. Update the skills under `skills/` that quote these messages. [REQ-CLI-007] [REQ-TASK-001] Verify: `bun test tests/cli tests/tasks tests/adopt`

## 4. README and docs

- [ ] 4.1 Create `docs/CONTRIBUTING.md` from the README sections `Develop`, `Layout`, `IDs`, and the gate steps. Rewrite `README.md` in the order of 008/D9. The value sentence uses the ratio from the newest `docs/metrics/*.md`. The quickstart puts the git install form first with a real 12 character SHA. The `task start` excerpt has at most 12 lines. The config reference lists `SPECCTX_OPENSPEC`. Lint both files. [REQ-GOV-006] Verify: `test $(grep -c "^## Develop" README.md) -eq 0 && grep -q "^## Develop" docs/CONTRIBUTING.md && head -25 README.md | grep -q "npx -y github:sonqh/spec-ctx#" && ! head -25 README.md | grep -q "\.svg" && node dist/cli.js lint tells --baseline 0 README.md docs/CONTRIBUTING.md && node dist/cli.js lint ste --baseline 0 --disable synonym-rotation README.md docs/CONTRIBUTING.md`
- [ ] 4.2 Write `docs/verification/008.md`. List the re-recorded help golden. Run the full gate. [REQ-GOV-001] Verify: `bun run ci:local`

## Workflow follow-up

- Run `specctx check --strict` and `npx -y @fission-ai/openspec@latest validate --all --strict` before archive, and validate again after.
- Archive with `/opsx:archive 008-first-run-ux`, then `specctx build`.
