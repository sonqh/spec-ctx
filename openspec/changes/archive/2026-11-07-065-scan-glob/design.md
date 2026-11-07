# Design

## Context

- `changeOf(path)` in `src/index/scan.ts` reads `^openspec/changes/(archive/)?([^/]+)/` and returns `main` for any other path. `scanMarkdown` uses it for the change of each entry. `structureEntries` uses it for the change entry.
- `src/index/structure.ts` and `src/graph/links.ts` each hold a copy of `CHANGE_DIR`. `folderOf` runs at query time.
- `globBase` in `src/util/glob.ts` returns the literal path before the first wildcard segment. For `openspec/changes/**/*.md` it is `openspec/changes`.
- `gate --rerun` in `src/gate/rerun.ts` and `status` in `src/cli/status.ts` call `changeOf` for paths of `openspec/changes`. They keep the default rules.

## Goals / Non-Goals

**Goals:**
- Name a change from the folder under the prefix of its glob. Keep the default result byte for byte.
- One function holds the rule.

**Non-Goals:**
- A new index field. A change to `check`, `next`, or `gate --rerun` for custom prefixes.

## Decisions

- D1 Rule. For each glob in `[scan] changes` the module keeps the fixed prefix and the compiled glob. A path takes the first glob, in list order, that matches it and yields a folder. The folder is the first segment after `<prefix>/`. When that segment is `archive`, the folder is the next segment and the name loses a leading `YYYY-MM-DD-`. The archive flag and the date come from the same step. `scanMarkdown` takes the archive status from the module when a glob yielded a folder. Else it keeps `includes("/archive/")`, so decisions and other files keep their status. Refs: REQ-IDX-015
- D2 Files with no folder. A file that sits directly under the prefix, such as `work/changes/notes.md`, has no change folder. A glob with an empty prefix, such as `**/*.md`, names no folder at all. Both give `main`, as a path that no glob matches does today. A file `<prefix>/archive/x.md` has no folder either and gives `main`. Deviation from today: under the default glob, `openspec/changes/archive/x.md` gives the change `archive`, because the old regex backtracks. D2 gives `main`. A test names the case. Refs: REQ-IDX-015
- D3 Several globs. A glob with another prefix names the folders under its own prefix. A glob with an empty prefix listed first matches every path and yields no folder, so the next glob decides. Refs: REQ-IDX-015
- D4 Query time. The rules reach `structure` as a parameter. `structure(entries, rules = DEFAULT)` in `src/graph/links.ts` passes them to `folderOf(file, rules)`. The parameter goes through `walkFound`, `related`, and `mainVersion` in `src/graph/related.ts`. `bundle.ts` and `commands.ts` pass `changeRules(cfg.scan.changes)`. Config loads on every query path, as `loadIndex(root, cfg)` shows. The index format and the parity goldens do not change. The cache of `structure` keys on the entries, so each call site passes one rule set. Refs: REQ-IDX-015
- D5 Scope. `check`, `next`, `status`, `adopt`, `gate`, and `gate --rerun` read `openspec/changes` by path. Each keeps that rule. `activeFolders` in `src/loop/next.ts` returns no folder on a repo with a custom glob, so `next` stops with a clear reason. A repo that moves its changes out of `openspec/changes` keeps those limits. Another issue holds them. One effect stays in scope. `src/tasks/tasks.ts` skips the change `main` when it lists active changes. Custom glob tasks leave `main` and become active changes. A test names it. Refs: REQ-IDX-015

## Risks / Trade-offs

- The module runs once per scanned markdown file. The compiled globs come from the scanner, so the cost is one pass over the globs.
- A caller that omits the rules gets the default rules. A custom glob repo then reads the wrong folder. The call sites in `bundle.ts` and `commands.ts` pass the rules, and a test covers `related change/a`.
