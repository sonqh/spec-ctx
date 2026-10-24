# Design

## Context

spec-ctx is the engine agentrc used, moved out and extended. This change makes agentrc a consumer. The specs that described the engine leave this repo. Governance stays, rewritten to name spec-ctx as the gate.

## Goals / Non-Goals

**Goals:**
- One source of truth for the engine: spec-ctx.
- agentrc CI green on `specctx check --strict` with no uncovered requirement.
- A fresh session on agentrc starts with `specctx status` and `task next`.

**Non-Goals:**
- Porting the Python engine tests. spec-ctx owns them.
- Publishing spec-ctx. That happens in spec-ctx. Until then the repo installs from git.

## Decisions

- Retire, do not port. The REQ-CTX and REQ-BOOT requirements describe the engine, and the engine now has its own specs in spec-ctx (REQ-IDX, REQ-QRY, REQ-CHK, REQ-TASK, REQ-HND, REQ-SKL). Alternative: keep them and run the TypeScript engine against the Python tests. Rejected because every change to the engine would then need two spec edits. Follows ADR-005: an ID is retired, never deleted silently.
- Install from git until publish: `npx github:sonqh/spec-ctx#main`. The spec-ctx package builds on install through its `prepare` script. The hook and CI read the command from one place, `scripts/specctx.sh`, so the switch to `npx spec-ctx@<version>` is a one line change. Creates no ADR.
- Evidence backfill is manual and dated. Archived tasks get `kind: manual`, note `migrated from python ctx`. New tasks close through `task done` only. Follows spec-ctx ADR-004.
- The retire reason names the replacement ID, for example `moved to sonqh/spec-ctx REQ-IDX-001`. A reader of `retired-ids.md` can follow the trail. Creates no ADR.
- `REQ-GOV-005` keeps its ID. Its text changes from "run `ctx check`" to "run `specctx check`". Follows ADR-005: wording changes, the ID stays.

## Risks / Trade-offs

- Installing from git on every CI run is slower than npm and depends on GitHub availability. Mitigation: pin the ref to a commit. Switch to npm after publish.
- Manual evidence for 70 archived tasks is a bulk claim. Mitigation: the note says so, and `check --strict` lists manual evidence as a warning in spec-ctx.
- Agents that memorized `python3 tools/ctx/ctx.py` will try it. Mitigation: `CLAUDE.md` and the skills name the new commands, and the path no longer exists.
