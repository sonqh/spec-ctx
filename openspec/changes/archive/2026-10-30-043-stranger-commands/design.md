# Design

## Context

- About 30 strings in `src/` start a command with `specctx `. The files are `src/loop/next.ts`, `src/loop/fails.ts`, `src/cli/workflow.ts`, `src/cli/commands.ts`, and `src/check/hints.ts`.
- `src/cli/help.ts` documents the command name. Its pages and goldens must not change.
- npm 10 sets `npm_command=exec` for `npm exec` and `npx`, and `run-script` for `npm run`.
- `init` keeps an existing `spec-ctx.toml`, with or without `--force`.
- The relative README targets are six images under `docs/demo/clips/`, the `skills/` folder, and `docs/getting-started.md`.

## Goals / Non-Goals

**Goals:**
- A stranger and an agent can paste every printed command.

**Non-Goals:**
- A version bump, new commands, and a change to the help text.

## Decisions

- D1 `src/runcmd.ts` exports `runCommand(run, args)`. It returns the prefix, a space, and the arguments. `Config` gets `cli: { run: string }` with the default `specctx`. Each print passes `cfg.cli.run`. The hint table in `src/check/hints.ts` writes `{run}` where the command goes, and `hintOf(rule, run)` fills it. `src/cli/commands.ts` reads the config again after `init` to print its `next:` line. Refs: REQ-CLI-010
- D2 Skills and templates, `src/stats/write.ts`, `src/adopt/write.ts`, and `src/lint/cli.ts` name the tool in prose or in usage text, not as a command to paste. They stay bare, and the source test lists them by path. Refs: REQ-CLI-010
- D3 `runPrefixFor(env)` in `src/init/init.ts` returns `npx -y spec-ctx@<VERSION>` when `env.npm_command` is `exec`, else null. `configText` appends a `[cli]` section with a comment when it gets a prefix. Only a new file gets it, because `init` keeps an existing file. Refs: REQ-DIST-015
- D4 The README test finds every Markdown link or image target and every `src=` and `href=` value. A target passes when it starts with `https://`, `http://`, `mailto:`, or `#`. Anything else fails. Refs: REQ-GOV-011
- D5 This repository sets `[cli] run = "node dist/cli.js"`. The `specctx-run` skill keeps its line about `npx spec-ctx`, because step 1 of the loop is a command the agent types before any print. `CLAUDE.md` keeps its line about what `specctx` is here. Refs: REQ-CLI-010
