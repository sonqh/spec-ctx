# Design

## Context

- `codeCandidates(path)` in `src/adopt/plan.ts` gives the candidates of REQ-ADOPT-004: the initials, then two and three letters of the first segment, then a suffix letter. `deriveCode(path, taken)` takes the first free one.
- `planAdopt` sorts the capability list by length, then by name, so the shorter path keeps the base code on a collision.
- The dogfood record, finding 4, asks for a second pass for a repeated first segment.

## Decisions

- D1 A family is three or more capability folders with the same first kebab segment. Two members stay as they are, because `UA` and `UP` read fine and existing tests expect them.
- D2 The family code is `seg1.slice(0, 3) + rest.slice(0, 3)`, where `rest` is the remaining segments joined without a separator, upper case, letters only. It is at most six letters, so it matches `[A-Z]{2,6}` of REQ-ADOPT-004. A member with one segment, the family head such as `cli`, takes no family code.
- D3 `codeCandidates(path, family)` takes a second argument. With `family` true it puts the family code first and keeps the rest of the list. `deriveCode` passes it through. `planAdopt` computes the family set once from the capability list before it derives any code. The config path and the existing ID checks run before derivation, as today.
- D4 A collision inside a family, such as `cli-config` and `cli-configure`, falls through to the REQ-ADOPT-004 candidates for the second member. The shorter path keeps the family code, by the existing sort.
- D5 The dry run and the report print one line per family after the `cap:` lines: `family: cli  prefix CLI  <n> codes`. The `--json` output of the dry run adds `families: [{ segment, prefix, count }]`.
- D6 The measure is a dry run on a clone of the OpenSpec fork at 8899171 with its `spec-ctx.toml` removed, so every code derives. The record lists the `cli-*` codes before and after. The fork itself stays frozen and its labels do not change.

## Risks

- A six letter code makes IDs longer, such as `REQ-CLICON-003`. That is the trade for reading them.
- A repo with a family that already adopted keeps its short codes. The rule applies only to new derivations.
