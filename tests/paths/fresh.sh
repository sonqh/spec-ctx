#!/usr/bin/env bash
# Covers: REQ-ADOPT-006, REQ-ADOPT-009
# SCN-ADOPT-006-2 SCN-ADOPT-009-1 the fresh path on upstream OpenSpec: openspec init, specctx init --all, one change
# from the templates, both tasks done, then gate --strict exit 0. spec-ctx.toml keeps the bytes that init wrote.
set -euo pipefail
here=$(cd "$(dirname "$0")/../.." && pwd)
[ -f "$here/dist/cli.js" ] || (cd "$here" && bun run build >/dev/null)
specctx="node $here/dist/cli.js"
openspec="npx -y @fission-ai/openspec@latest"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cd "$work"
$openspec init --tools none --no-animation . >/dev/null 2>&1
$specctx init --all >/dev/null
# init pins the version it found (SCN-DIST-002-10)
grep -qE '^openspec = "npx -y @fission-ai/openspec@[0-9]+\.[0-9]+\.[0-9]+"$' spec-ctx.toml || { echo "init did not pin the OpenSpec version"; grep '^openspec' spec-ctx.toml; exit 1; }
sum() { if command -v sha256sum >/dev/null; then sha256sum spec-ctx.toml; else shasum -a 256 spec-ctx.toml; fi; }
before=$(sum)

# a change from the templates, with IDs from specctx id new
$openspec new change add-greeting >/dev/null 2>&1
tpl=openspec/templates/spec-driven-ids
[ ! -d openspec/schemas ] || { echo "init --all installed a schema folder"; exit 1; }
grep -q '^schema: spec-driven$' openspec/config.yaml || { echo "init --all changed the schema line"; exit 1; }
chg=openspec/changes/add-greeting
req=$($specctx id new REQ GRT)
scns=$($specctx id new SCN GRT --for "$req" --count 2)
scn1=$(printf '%s\n' "$scns" | sed -n 1p)
scn2=$(printf '%s\n' "$scns" | sed -n 2p)
[ "$req" = REQ-GRT-001 ] && [ "$scn1" = SCN-GRT-001-1 ] && [ "$scn2" = SCN-GRT-001-2 ] || { echo "unexpected IDs: $req $scns"; exit 1; }
mkdir -p "$chg/specs/greeting"
# proposal and design: the template with its comments replaced by text
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
    -e "s#^- <!-- The decision.*Refs: <!-- .* -->#- D1 \`greet\` takes one name and defaults to \`world\`. Refs: $req#" \
    -e 's#<!-- Known risks.*-->#None.#' \
    -e '/^<!--.*-->[[:space:]]*$/d' "$tpl/design.md" > "$chg/design.md"
# the spec: the two headers that matter carry the IDs
sed -e "s|^### Requirement: REQ-<CAP>-NNN .*|### Requirement: $req Greet by name|" \
    -e 's|^<!-- Requirement text.*-->$|The system SHALL return `Hello, <name>` for a name and `Hello, world` without one.|' \
    -e '/^Refs: <!--/d' \
    -e "s|^#### Scenario: SCN-<CAP>-NNN-1 .*|#### Scenario: $scn1 A name is given|" \
    -e 's|^- \*\*WHEN\*\* <!-- condition -->|- **WHEN** the caller passes `Ada`|' \
    -e 's|^- \*\*THEN\*\* <!-- expected outcome -->|- **THEN** the result is `Hello, Ada`|' \
    -e 's|^<!-- New capability only.*-->$|The greeting text that the library returns to a caller.|' \
    "$tpl/spec.md" > "$chg/specs/greeting/spec.md"
printf '\n#### Scenario: %s No name\n- **WHEN** the caller passes nothing\n- **THEN** the result is `Hello, world`\n' "$scn2" >> "$chg/specs/greeting/spec.md"
# the tasks: two tasks that cite the REQ and name a Verify command
sed -e 's|^## 1\. <!-- Task group name -->|## 1. Greeting|' \
    -e "s|^- \[ \] 1.1 <!-- Task description --> \[REQ-<CAP>-NNN\] Verify: \`<!-- command -->\`|- [ ] 1.1 Add \`greet(name)\` [$req] Verify: \`true\`|" \
    -e "s|^- \[ \] 1.2 <!-- Task description --> \[REQ-<CAP>-NNN\] Verify: \`<!-- command -->\`|- [ ] 1.2 Cover both scenarios [$req] Verify: \`true\`|" \
    -e '/^## 2\./,$d' "$tpl/tasks.md" | sed -e '${/^$/d}' > "$chg/tasks.md"
grep -q "^### Requirement: $req Greet by name" "$chg/specs/greeting/spec.md"
grep -q "^#### Scenario: $scn1 " "$chg/specs/greeting/spec.md"
grep -q "^#### Scenario: $scn2 " "$chg/specs/greeting/spec.md"
grep -q "\[$req\] Verify: \`true\`" "$chg/tasks.md"
! grep -q '<!--' "$chg/proposal.md" "$chg/design.md" "$chg/specs/greeting/spec.md" "$chg/tasks.md" || { echo "a template comment is left"; grep -n '<!--' "$chg"/*.md "$chg"/specs/*/*.md; exit 1; }
# a code tag and a test tag, so check --strict sees the REQ covered
mkdir -p src tests
printf '// %s\nexport function greet(name = "world") { return `Hello, ${name}`; }\n' "$req" > src/greeting.js
printf '// Covers: %s\n// %s %s\n' "$req" "$scn1" "$scn2" > tests/greeting.test.js

$openspec validate --all --strict >/dev/null 2>&1 || { $openspec validate --all --strict; exit 1; }
$specctx status >/dev/null
$specctx task done add-greeting/1.1 >/dev/null
$specctx task done add-greeting/1.2 >/dev/null
[ -f .ctx/evidence/add-greeting/1.1.json ] && [ -f .ctx/evidence/add-greeting/1.2.json ] || { echo "no evidence"; exit 1; }
grep -q '^- \[x\] 1.1 ' "$chg/tasks.md" && grep -q '^- \[x\] 1.2 ' "$chg/tasks.md"
out=$($specctx check --strict)
[ "$out" = "0 findings" ] || { echo "$out"; exit 1; }
$specctx handoff write >/dev/null
$specctx gate --strict
# no config edit after init --all
[ "$(sum)" = "$before" ] || { echo "spec-ctx.toml changed after init --all"; exit 1; }
echo "fresh path: gate --strict exit 0 on upstream $($openspec --version 2>/dev/null)"
