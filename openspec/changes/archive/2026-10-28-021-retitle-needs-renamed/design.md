# Design

## Decisions

- D1 The rule lives in `check()` next to the other base rules. For every `req` entry with status `modified` or `removed` in an active change, it finds the main entry with the same ID. When the titles differ, it reads the delta file once and collects every `- TO:` line under a `## RENAMED` header. A TO line matches when its header title equals the delta title and its ID, when present, equals the delta ID. Without a match the entry gets the finding. Archived changes never get it. Follows ADR-006 item 7.
- D2 `Finding` gets an optional `detail` field. `check()` builds these findings as objects, not as `Problem` tuples, so the tuple shape stays. `checkText` appends two spaces and the detail after the ID when it is present. The detail reads `"<old>" -> "<new>"`. `--json` prints `detail` on those findings and nothing new on the others, so a consumer that reads `file`, `line`, `rule`, and `id` sees no change.
- D3 The hint is one entry in `RULES`, in Strict mode. It reads `Add to the delta before the MODIFIED block:` and then the three lines of the RENAMED block with `<ID>`, `<old title>`, and `<new title>`. The hint has line breaks, so the block pastes as it is. The finding line carries the real ID and titles.
- D4 The rule is hard and not in `BASELINE_RULES`. The fix is the RENAMED block, which upstream needs anyway. A project with a retitle under a stable ID but no RENAMED block had no path to archive on upstream before this rule.
- D5 The test uses the no-ID fixture after `adopt`. It changes the title of the MODIFIED `REQ-UA-001 Session timeout` header and expects the finding with the detail. It then adds the RENAMED pair and expects no finding. The fixture already holds a RENAMED pair for `REQ-UA-003`, which stays quiet. When `SPECCTX_OPENSPEC` is set, the test also runs `<command> validate add-mfa --strict` on the project with the RENAMED pair and expects exit 0. That keeps the rule in step with upstream.

## Risks / Trade-offs

- Upstream may one day match headers by ID. The rule then goes quiet on its own, because every retitle would carry a RENAMED block or would no longer need one. Nothing else changes.
- A RENAMED TO line that upstream writes without the ID still matches, because the ID in the TO line is optional for this rule.

## Open Questions

None.
