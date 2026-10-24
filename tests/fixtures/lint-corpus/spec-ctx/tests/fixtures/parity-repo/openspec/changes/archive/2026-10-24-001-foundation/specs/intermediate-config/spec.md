# Spec Delta

## Purpose

Defines IntermediateConfig, the agent-independent structure that compile produces from a profile and resolved catalog items. Every adapter reads only this structure.

## ADDED Requirements

### Requirement: REQ-IC-001 Compile is pure
`compile(profile, catalog)` SHALL return the same IntermediateConfig bytes for the same profile bytes and the same catalog digests. It SHALL not read the clock, the network, or any file outside the profile and the catalog cache.

Refs: ADR-002

#### Scenario: SCN-IC-001-1 Repeat compile
- **WHEN** compile runs twice on the same inputs
- **THEN** the two JSON outputs are byte-identical

### Requirement: REQ-IC-002 Top-level shape
IntermediateConfig SHALL be a JSON object with the keys `version`, `instructions`, `permissions`, `hooks`, `mcp`, `skills`, `commands`, `env`, and `degradations`. Every key SHALL be present even when empty.

#### Scenario: SCN-IC-002-1 Empty profile sections
- **WHEN** `extensions` lists nothing
- **THEN** `skills`, `mcp`, and `commands` are empty arrays, not absent

### Requirement: REQ-IC-003 instructions shape
`instructions` SHALL contain `global` (markdown string, at most 120 lines) and `rules` (array of `{id, paths, body}`), where `paths` is a list of glob strings and `body` is markdown. A rule with an empty `paths` list SHALL be invalid.

Refs: REQ-PROF-004

#### Scenario: SCN-IC-003-1 Language rule from identity
- **WHEN** `identity.languages` contains `typescript`
- **THEN** `rules` contains an entry whose `paths` include `**/*.ts` and `**/*.tsx`

#### Scenario: SCN-IC-003-2 Global stays short
- **WHEN** the generated `global` exceeds 120 lines
- **THEN** compile fails with the line count in the message

### Requirement: REQ-IC-004 permissions shape
`permissions` SHALL contain `allow` and `deny`, each an array of `{tool, pattern}`. `risk.secrets_read: deny` SHALL produce deny entries for `~/.ssh/**`, `~/.aws/**`, `~/.gnupg/**`, `~/.kube/**`, `~/.npmrc`, `~/.git-credentials`, `~/.config/gh/**` on the `Read` and `Edit` tools.

Refs: REQ-PROF-006

#### Scenario: SCN-IC-004-1 Secrets deny list
- **WHEN** `risk.secrets_read` is `deny`
- **THEN** `permissions.deny` contains a `Read` entry for `~/.ssh/**`

### Requirement: REQ-IC-005 hooks shape
`hooks` SHALL be an array of `{id, event, matcher, kind, command, message}`. `event` SHALL be one of `pre-tool`, `post-tool`, `stop`, `session-start`. `risk.destructive_ops: block` SHALL produce two `pre-tool` hooks: one that blocks `rm -rf` and one that blocks `git push` to `main` or `master`.

Refs: REQ-PROF-006

#### Scenario: SCN-IC-005-1 Block destructive ops
- **WHEN** `risk.destructive_ops` is `block`
- **THEN** `hooks` has an entry with `id: block-rm-rf` and one with `id: block-push-main`

#### Scenario: SCN-IC-005-2 Confirm instead of block
- **WHEN** `risk.destructive_ops` is `confirm`
- **THEN** the same two hook ids exist with `kind: confirm`

### Requirement: REQ-IC-006 mcp shape
`mcp` SHALL be an array of `{id, transport, command, args, url, env, headers, source, digest}`. `transport` SHALL be `stdio` or `http`. Exactly one of `command` or `url` SHALL be present.

Refs: REQ-CAT-002

#### Scenario: SCN-IC-006-1 Both command and url
- **WHEN** a catalog item defines both `command` and `url`
- **THEN** compile fails and names the item

### Requirement: REQ-IC-007 skills and commands shape
`skills` and `commands` SHALL be arrays of `{id, source, ref, digest, path}` where `path` is the cached directory or file. An item without a digest SHALL be invalid.

Refs: REQ-CAT-003

#### Scenario: SCN-IC-007-1 Missing digest
- **WHEN** the catalog cache has a skill with no digest file
- **THEN** compile fails and names the skill

### Requirement: REQ-IC-008 degradations
`degradations` SHALL be an array of `{agent, requirement, reason}`. Compile SHALL add an entry whenever an enabled agent lacks the capability a profile field needs, and SHALL still produce output for that agent.

Refs: REQ-ADPT-002

#### Scenario: SCN-IC-008-1 Cursor has no hooks
- **WHEN** `agents.cursor.enabled` is true and `risk.destructive_ops` is `block`
- **THEN** `degradations` contains `{agent: cursor, requirement: hooks, reason: ...}` and the cursor output has a rule text instead of a hook

### Requirement: REQ-IC-009 verbosity mapping
`working_style.verbosity` SHALL set `instructions.global` to include one of three fixed communication blocks (`terse`, `normal`, `explanatory`) stored under `src/ic/blocks/`. The block text SHALL be identical across agents.

Refs: REQ-PROF-005

#### Scenario: SCN-IC-009-1 Terse block
- **WHEN** `verbosity` is `terse`
- **THEN** `instructions.global` contains the first line of `src/ic/blocks/verbosity-terse.md`
