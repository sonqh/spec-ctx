# Proposal

## Why

ADR-008 item 7 asks for readable capability codes in `adopt`. The dogfood run on the OpenSpec fork shows the problem. Its `cli-*` family of capabilities got three patterns at once: `CA`, `CC`, `CF`, then `CLC`, `CLS`, `CLV`, then `CLIC`, `CLIV`. `CLV` is `cli-version` and `CV` is `cli-view`. A person cannot tell them apart. The adopt report says to rename a code before the IDs spread. It lists 50 codes and gives no rule to pick better ones. Nobody renames 50 codes by hand.

## What changes

- `adopt` finds families. A family is three or more capability folders that share their first kebab segment. Each member with two or more segments gets a family code first. It is the first three letters of the first segment, then the first three letters of the rest. `cli-config` is `CLICON`, `cli-completion` is `CLICOM`, `cli-version` is `CLIVER`.
- A collision inside a family falls through to the candidates of REQ-ADOPT-004. A code from `[ids] paths` or an ID already in the spec still wins. Two members are no family, so `user-auth` and `user-profile` stay `UA` and `UP`.
- The adopt report and the dry run name each family and its prefix, so a person sees why a code is six letters.
- A record in `docs/verification/063.md` with the codes of the OpenSpec fork before and after, from a dry run on a clone.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `adopt-existing`: ADDED REQ-ADOPT-012 (family codes).

## Layer and benefit

- Layer: layer 1. The codes are the ID scheme that every query, bundle, and tag goes through. It is item 7 of the order of work in ADR-008 and item 5 of ADR-007.
- Benefit: on the fork, the `cli-*` family of about 15 codes becomes readable at a glance. A person who reads `REQ-CLICON-003` in a task line knows the capability. Repos that already adopted keep their codes, because IDs already in the spec win.
- The change adds no dependency, no server, no LLM call. The output stays a pure function of the files.

## Out of scope

- Renaming codes in a repo that already adopted.
- A prompt that asks the user for a family prefix.
- Families by any segment other than the first.
