#!/usr/bin/env bash
# Covers: REQ-SCH-006
# SCN-SCH-006-4 the fresh path with [ids] brackets = true: openspec init, specctx init --skills, brackets on,
# specctx init --schema, one change from the bracketed templates, both tasks done, then gate --strict exit 0.
# Every requirement and scenario header of the change has its ID in square brackets. Citations and tags stay bare.
set -euo pipefail
here=$(cd "$(dirname "$0")/../.." && pwd)
[ -f "$here/dist/cli.js" ] || (cd "$here" && bun run build >/dev/null)
specctx="node $here/dist/cli.js"
openspec="npx -y @fission-ai/openspec@latest"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cd "$work"
$openspec init --tools none --no-animation . >/dev/null 2>&1
$specctx init --skills >/dev/null
grep -q '^brackets = false$' spec-ctx.toml || { echo "init did not write brackets = false"; exit 1; }
sed -i.bak 's/^brackets = false$/brackets = true/' spec-ctx.toml && rm spec-ctx.toml.bak
$specctx init --schema >/dev/null

# the templates and the rules carry the bracketed form
tpl=openspec/templates/spec-driven-ids
grep -q '^### Requirement: \[REQ-<CAP>-NNN\] ' "$tpl/spec.md" || { echo "spec.md has no bracketed requirement placeholder"; exit 1; }
grep -q '^#### Scenario: \[SCN-<CAP>-NNN-1\] ' "$tpl/spec.md" || { echo "spec.md has no bracketed scenario placeholder"; exit 1; }
grep -q '"### Requirement: \[REQ-ABC-001\] Name"' openspec/config.yaml || { echo "the rules show the bare form"; exit 1; }
grep -q ' \[REQ-<CAP>-NNN\] Verify:' "$tpl/tasks.md" || { echo "tasks.md lost its bare citation"; exit 1; }

# a change from the templates, with IDs from specctx id new
$openspec new change add-greeting >/dev/null 2>&1
chg=openspec/changes/add-greeting
req=$($specctx id new REQ GRT)
scns=$($specctx id new SCN GRT --for "$req" --count 2)
scn1=$(printf '%s\n' "$scns" | sed -n 1p)
scn2=$(printf '%s\n' "$scns" | sed -n 2p)
[ "$req" = "[REQ-GRT-001]" ] && [ "$scn1" = "[SCN-GRT-001-1]" ] && [ "$scn2" = "[SCN-GRT-001-2]" ] || { echo "unexpected IDs: $req $scns"; exit 1; }
# the bare ID for the task citation, the code tag, and the Covers tag
bare=$(printf '%s' "$req" | tr -d '[]')
mkdir -p "$chg/specs/greeting"
sed -e 's#<!-- Explain the motivation.*-->#A caller wants a greeting with a name.#' \
    -e 's#<!-- Describe what will change.*-->#Add `greet(name)`.#' \
    -e 's#^- `<capability-path>`: .*#- `greeting`: the greeting text for a caller#' \
    -e 's#^- `<existing-capability-path>`: .*#_None._#' \
    -e 's#<!-- Affected code.*-->#`src/greeting.js` and `test/greeting.test.js`.#' \
    -e '/^<!-- Capabilities being introduced/,/-->[[:space:]]*$/d' \
    -e '/^<!-- Existing capabilities/,/-->[[:space:]]*$/d' "$tpl/proposal.md" > "$chg/proposal.md"
sed -e 's#<!-- The current state.*-->#A new project with no greeting.#' \
    -e 's#<!-- What this design gives -->#One function.#' \
    -e 's#<!-- What stays out of scope -->#Localization.#' \
    -e "s#^- <!-- The decision.*Refs: <!-- .* -->#- D1 \`greet\` takes one name and defaults to \`world\`. Refs: $bare#" \
    -e 's#<!-- Known risks.*-->#None.#' \
    -e '/^<!--.*-->[[:space:]]*$/d' "$tpl/design.md" > "$chg/design.md"
sed -e "s|^### Requirement: \[REQ-<CAP>-NNN\] .*|### Requirement: $req Greet by name|" \
    -e 's|^<!-- Requirement text.*-->$|The system SHALL return `Hello, <name>` for a name and `Hello, world` without one.|' \
    -e '/^Refs: <!--/d' \
    -e "s|^#### Scenario: \[SCN-<CAP>-NNN-1\] .*|#### Scenario: $scn1 A name is given|" \
    -e 's|^- \*\*WHEN\*\* <!-- condition -->|- **WHEN** the caller passes `Ada`|' \
    -e 's|^- \*\*THEN\*\* <!-- expected outcome -->|- **THEN** the result is `Hello, Ada`|' \
    -e 's|^<!-- New capability only.*-->$|The greeting text that the library returns to a caller.|' \
    "$tpl/spec.md" > "$chg/specs/greeting/spec.md"
printf '\n#### Scenario: %s No name\n- **WHEN** the caller passes nothing\n- **THEN** the result is `Hello, world`\n' "$scn2" >> "$chg/specs/greeting/spec.md"
sed -e 's|^## 1\. <!-- Task group name -->|## 1. Greeting|' \
    -e "s|^- \[ \] 1.1 <!-- Task description --> \[REQ-<CAP>-NNN\] Verify: \`<!-- command -->\`|- [ ] 1.1 Add \`greet(name)\` [$bare] Verify: \`node -e 0\`|" \
    -e "s|^- \[ \] 1.2 <!-- Task description --> \[REQ-<CAP>-NNN\] Verify: \`<!-- command -->\`|- [ ] 1.2 Cover both scenarios [$bare] Verify: \`node -e 0\`|" \
    -e '/^## 2\./,$d' "$tpl/tasks.md" | sed -e '${/^$/d}' > "$chg/tasks.md"
! grep -q '<!--' "$chg/proposal.md" "$chg/design.md" "$chg/specs/greeting/spec.md" "$chg/tasks.md" || { echo "a template comment is left"; grep -n '<!--' "$chg"/*.md "$chg"/specs/*/*.md; exit 1; }
grep -q "\[$bare\] Verify: \`node -e 0\`" "$chg/tasks.md"
mkdir -p src tests
printf '// %s\nexport function greet(name = "world") { return `Hello, ${name}`; }\n' "$bare" > src/greeting.js
printf '// Covers: %s\n// %s %s\n' "$bare" "$(printf '%s' "$scn1" | tr -d '[]')" "$(printf '%s' "$scn2" | tr -d '[]')" > tests/greeting.test.js

$openspec validate --all --strict >/dev/null 2>&1 || { $openspec validate --all --strict; exit 1; }
$specctx status >/dev/null
$specctx task done add-greeting/1.1 >/dev/null
$specctx task done add-greeting/1.2 >/dev/null
out=$($specctx check --strict)
[ "$out" = "0 findings" ] || { echo "$out"; exit 1; }
$specctx handoff write >/dev/null
$specctx gate --strict
# every requirement and scenario header of the change has its ID in square brackets
hdrs=$(grep -hE '^#{3,4} (Requirement|Scenario): ' "$chg"/specs/*/spec.md)
[ "$(printf '%s\n' "$hdrs" | wc -l | tr -d ' ')" = 3 ] || { echo "expected 3 headers"; printf '%s\n' "$hdrs"; exit 1; }
! printf '%s\n' "$hdrs" | grep -vqE '^#{3,4} (Requirement|Scenario): \[(REQ|SCN)-[A-Z]+-[0-9]+(-[0-9]+)?\] ' || { echo "a header is not bracketed"; printf '%s\n' "$hdrs"; exit 1; }
echo "fresh path with brackets: gate --strict exit 0 on upstream $($openspec --version 2>/dev/null)"
