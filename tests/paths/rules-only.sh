#!/usr/bin/env bash
# Covers: REQ-SCH-005, REQ-ADOPT-009
# SCN-SCH-005-1 the rules that init --schema merges into openspec/config.yaml reach the artifact instructions
# of the stock spec-driven schema on upstream OpenSpec. The schema copy went in 025 (ADR-006 item 8).
set -euo pipefail
here=$(cd "$(dirname "$0")/../.." && pwd)
[ -f "$here/dist/cli.js" ] || (cd "$here" && bun run build >/dev/null)
specctx="node $here/dist/cli.js"
openspec="npx -y @fission-ai/openspec@latest"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cd "$work"
$openspec init --tools none --no-animation . >/dev/null 2>&1
$specctx init --schema >/dev/null
# init leaves the stock schema in place. Only the merged rules and operations carry the ID instructions.
grep -q '^schema: spec-driven$' openspec/config.yaml
$openspec new change rules-only >/dev/null 2>&1
json=$($openspec instructions specs --change rules-only --json 2>/dev/null)
printf '%s' "$json" | node -e '
let s = "";
process.stdin.on("data", (d) => (s += d)).on("end", () => {
  const j = JSON.parse(s);
  if (j.schemaName !== "spec-driven") { console.error("schemaName is " + j.schemaName + ", want spec-driven"); process.exit(1); }
  const rules = Array.isArray(j.rules) ? j.rules : null;
  if (!rules) { console.error("no rules list in the JSON. Keys: " + Object.keys(j).join(", ")); process.exit(1); }
  const hit = rules.find((r) => String(r).includes("specctx id new"));
  if (!hit) { console.error("no rule names specctx id new. Rules: " + JSON.stringify(rules)); process.exit(1); }
  console.log("rules: " + rules.length + " item(s). Hit: " + hit);
});
'
# the plain text an agent reads carries the same rule
text=$($openspec instructions specs --change rules-only 2>/dev/null)
printf '%s\n' "$text" | grep -q 'specctx id new' || { echo "the instruction text has no specctx id new"; printf '%s\n' "$text" | head -40; exit 1; }
# the tasks instruction carries the Verify rule too
tasks=$($openspec instructions tasks --change rules-only 2>/dev/null)
printf '%s\n' "$tasks" | grep -q 'Verify:' || { echo "the tasks instruction has no Verify rule"; exit 1; }
# the apply guidance reaches the agent: task done only, no checkbox edit, no /opsx:apply
apply=$($openspec instructions apply --change rules-only 2>/dev/null || true)
printf '%s\n%s\n' "$tasks" "$apply" | grep -q 'Close each task only with `specctx task done <id>`' || { echo "no task done guidance in the tasks or apply instructions"; printf '%s\n' "$apply" | head -40; exit 1; }
echo "rules-only: the stock schema carries the merged rules on upstream $($openspec --version 2>/dev/null)"
