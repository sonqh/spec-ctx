# Draft issue for OpenSpec: stable IDs as the base fingerprint for requirements

This is a draft. The issue is not open yet. Open it only after a review, and send no pull request until a maintainer asks for one.

## Title

Stable requirement IDs as the base fingerprint for archive and parallel changes

## Problem

OpenSpec finds a requirement by its header text. A MODIFIED, REMOVED, or RENAMED block in a change points at the main spec through the text after `### Requirement:`.

Header text is not stable. People improve wording, and agents rewrite headers when they edit a block. Each rewrite breaks the link between a delta and its main requirement:

- A MODIFIED block whose header changed no longer matches. `openspec archive` refuses it, or the author must add a RENAMED block by hand.
- Two changes in flight that touch the same requirement have no shared key. A merge can keep one scenario list and drop the other without a warning.
- Code, tests, and task lists cannot point at a requirement in a way that survives a rename.

The parallel merge plan in this repository, [`openspec-parallel-merge-plan.md`](https://github.com/Fission-AI/OpenSpec/blob/main/openspec-parallel-merge-plan.md), names the same gap:

- Root cause 2, "Missing base fingerprint": a change does not record which version of a requirement it was written against. Archive cannot see that the live spec moved.
- Phase 2, "Increase Delta Granularity": scenario level operations "backed by stable scenario identifiers (explicit IDs or generated hashes) stored in `meta.json`".

This proposal is the "explicit IDs" branch of Phase 2, and it fits beside the Phase 0 content hash. The two answer different questions. The ID says which requirement a block is about. The hash says which version of it the author saw. An ID in the header also lets Phase 1 rebase find the matching block after a rename, which a hash alone cannot do.

## Proposal

Give each requirement and scenario an ID that never changes once published:

- Requirement header: `### Requirement: REQ-<CAP>-<NNN> <name>`, for example `REQ-IDX-003 Index sources`.
- Scenario header: `#### Scenario: SCN-<CAP>-<NNN>-<n> <name>`.
- `<CAP>` is a short capability code from the project config. `<NNN>` comes from a tool and is never reused. A removed ID goes to a retired list.
- A line `Refs: REQ-ABC-001, ADR-002` links a requirement to other IDs.

With an ID in the header, archive can match a delta block to its main block by ID first and by header text second. A rename keeps the ID, so it needs no RENAMED block. Two parallel changes that touch `REQ-IDX-003` share the key that the merge plan asks for.

The scheme needs no change to the delta format. The ID is the first word of the header text, so current parsers read it today.

## Evidence from a real project

spec-ctx implements the scheme beside OpenSpec as a separate CLI. Its engine started inside agentrc, an OpenSpec project with six archived changes:

- 110 canonical requirements and 160 canonical scenarios, all with IDs.
- 1,149 index entries, with code tags and test tags on the requirements.
- 185 kB of spec markdown. A task loads one requirement and its links as a bundle of about 4.7 kB.
- `specctx check --strict` gates every commit on ID integrity, test coverage of each main requirement, and a named test for each scenario.

During the work on spec-ctx itself, archive refused one MODIFIED block with new header text, and `openspec validate` predicted the same refusal for a second one. The IDs stayed the same. Each fix was a RENAMED block that the ID could have made unnecessary.

## What we offer

- The ID scheme and its rules: `decisions/ADR-002-id-scheme.md` in https://github.com/sonqh/spec-ctx.
- A schema bundle, `spec-driven-ids`, a fork of `spec-driven` with ID placeholders in its templates. It validates with `openspec schema validate` and archives with `openspec archive` unchanged.
- An engine under the MIT license that indexes the IDs, finds dangling links, and allocates the next free number.
- Help with a design for ID matching in archive, if the maintainers want it. A pull request follows only on an invitation.

## How this fits the plan

| Plan item | What IDs add |
| --- | --- |
| Phase 0 fingerprint in `meta.json` | Key the fingerprint by ID, not by header text. A rename no longer looks like a new requirement. |
| Phase 1 rebase | Match blocks by ID first, header text second. |
| Phase 2 scenario identifiers | Use `SCN-<CAP>-<NNN>-<n>` as the explicit ID the plan already names. |
| Phase 3 spec graph | The `Refs:` lines are edges that need no new syntax. |

## Questions for the maintainers

- Is ID matching in archive a direction you want, or should IDs stay a convention outside the core?
- Would you accept the ID as an optional prefix, with header text as the fallback when no ID is present?
- Does the parallel merge plan already have a fingerprint design that IDs should follow?
