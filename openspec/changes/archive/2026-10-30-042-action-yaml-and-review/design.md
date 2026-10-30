# Design

## Context

- `action.yml` has two descriptions with `${{`. One of them also holds `: `, which breaks YAML.
- `package.json` lists no YAML parser and `node_modules` holds none.
- `lastGate` in `src/loop/next.ts` accepts any passing non-rerun line, so a plain `gate` ends the loop.
- On push, `github.event.before` is forty zeros for a new branch. After a force push the old commit may be missing from the clone.
- `COVER_TAG` in `src/index/scan.ts` reads only a comma list that starts with a REQ ID. `SCN_RE` names scenarios from the whole file and stays as it is.

## Goals / Non-Goals

**Goals:**
- Fix the four findings.

**Non-Goals:**
- A version bump, stats, new commands, and other changes to the plan or archive stops.

## Decisions

- D1 `action.yml` quotes with double quotes every `description` that holds `: `. No `description` holds `${{`, because the runner may evaluate it and a local test cannot check that. `tests/action/yaml-quotes.sh` applies both rules to a file and `tests/action/selftest.sh` runs it on `action.yml` and on two planted bad copies. The change adds no dependency. Refs: REQ-DIST-014
- D2 `appendGateLog` takes `strict: boolean` and writes it. `runGate` and the rerun line pass `o.strict`. `lastGate` takes the last non-rerun line and counts it only when `ok` is true and `strict` is true. Refs: REQ-STAT-005, REQ-LOOP-011
- D3 `runRerun` checks the base before it asks for a merge base. Forty zeros print the zero line and pass. A base that `git rev-parse --verify <base>^{commit}` cannot resolve prints the fetch line and fails. The check lives in `src/gate/rerun.ts` as `baseProblem`. Refs: REQ-VER-013
- D4 The `Covers:` parser takes the rest of the line after `Covers:` and collects every match of `\bREQ-[A-Z]{2,6}-\d{3}\b`. It drops a repeat on one line. SCN IDs on the line add nothing to the REQ list. Scenario naming stays with `SCN_RE`. Refs: REQ-IDX-007
