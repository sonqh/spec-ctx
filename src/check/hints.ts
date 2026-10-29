// REQ-CHK-004 the rules of check and one fix hint per rule. The check summary prints the hint of each rule it found.

/** `hard` rules set exit 1. `advisory` rules print a warning and keep exit 0. */
export const RULES: Record<string, { level: "hard" | "advisory"; hint: string }> = {
  "missing-id": { level: "hard", hint: "Add an ID to the header. Run specctx adopt --dry-run to see the plan." },
  "scenario-id-mismatch": { level: "hard", hint: "Give the scenario the number of its requirement." },
  "bad-ref": { level: "hard", hint: "Write only IDs on the Refs line, separated by commas." },
  "task-without-req": { level: "hard", hint: "Cite a requirement in brackets on the task line, for example [REQ-ABC-001]." },
  "task-without-verify": { level: "hard", hint: "Add Verify: and a command in backticks to the task line." },
  "duplicate-id": { level: "hard", hint: "Give one of the two entries a new ID from specctx id new." },
  "duplicate-change-key": { level: "hard", hint: "Rename one change folder, so that each key names one change." },
  "reused-id": { level: "hard", hint: "The ID is retired. Get a new ID from specctx id new." },
  "dangling-ref": { level: "hard", hint: "Fix the ID or remove the link. No entry has this ID." },
  "unknown-task-req": { level: "hard", hint: "The task cites an ID that the index does not hold. Fix the ID on the task line." },
  "req-without-scn": { level: "hard", hint: "Add a scenario under the requirement." },
  "code-tag-no-canonical": { level: "hard", hint: "The tag names an archived requirement. Tag the current requirement." },
  "unknown-cap": { level: "hard", hint: "Add the code to caps under [ids] in spec-ctx.toml." },
  uncovered: { level: "hard", hint: "Add a test with a Covers tag for the requirement." },
  "scenario-untested": { level: "hard", hint: "Name the scenario ID in a test." },
  "done-without-evidence": { level: "hard", hint: "Run specctx task done. It runs the Verify command and writes the evidence." },
  "stale-evidence": { level: "hard", hint: "Run specctx task reopen and then specctx task done." },
  "evidence-without-done": { level: "hard", hint: "Run specctx task done, or remove the evidence file." },
  "manual-evidence": { level: "advisory", hint: "Give the task a Verify command and run specctx task done again." },
  // REQ-CHK-001 the hint is the block to paste. The finding line carries the ID and both titles (021/D3).
  // REQ-ADOPT-010 FROM copies the main header and TO copies the delta header, each in its own form (027/D4).
  "retitle-needs-renamed": {
    level: "hard",
    hint: "Add to the delta before the MODIFIED block. Write each ID as its header writes it, bare or in brackets:\n## RENAMED Requirements\n- FROM: `### Requirement: <ID> <old title>`\n- TO: `### Requirement: <ID> <new title>`",
  },
};

export function hintOf(rule: string): string {
  return RULES[rule]?.hint ?? "Read the check rules in the check spec.";
}
