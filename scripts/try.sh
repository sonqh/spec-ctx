#!/usr/bin/env bash
# REQ-GOV-013 the story of the README block "Try it in two minutes", run on a clone with the local dist/cli.js.
# The project is tests/fixtures/no-id-repo plus docs/demo/specs/, so the bundle is a small share of the spec text.
# Everything happens in a temp dir that the script removes at the end. Run `bun run build` first.
set -euo pipefail
unset SPECCTX_RERUN
root=$(cd "$(dirname "$0")/.." && pwd)
cli="$root/dist/cli.js"
# REQ-GOV-013 the story needs no network (053/D1). status and next run the OpenSpec stand-in, not the real OpenSpec.
# The value overrides one from the shell. init writes it to spec-ctx.toml and runs no command.
export SPECCTX_OPENSPEC="sh \"$root/tests/fixtures/openspec-stub.sh\""
if [ ! -f "$cli" ]; then
  echo "try.sh: dist/cli.js is missing. Run: bun run build" >&2
  exit 1
fi
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

n=0
step() {
  n=$((n + 1))
  printf '\n== %s. %s\n' "$n" "$1"
}
specctx() { node "$cli" "$@"; }

step "Copy a small project with eight specs"
cp -R "$root/tests/fixtures/no-id-repo/." "$work/project"
cp -R "$root/docs/demo/specs/." "$work/project/openspec/specs/"
cd "$work/project"
mkdir -p src tests
printf 'export const prompt = "password";\n' > src/login.ts
ls openspec/specs

step "init"
specctx init --all

step "adopt"
specctx adopt

step "Cite the requirement in task add-mfa/1.3"
# the requirement is the one titled "Second factor" in the change. The query also matches text, so the parse keeps the exact title.
req=$(specctx query "Second factor" --change add-mfa --kind req --json | node -e '
let s = "";
process.stdin.on("data", (d) => (s += d));
process.stdin.on("end", () => {
  const hits = JSON.parse(s).filter((e) => e.title === "Second factor");
  if (hits.length !== 1) {
    console.error("try.sh: expected one requirement titled Second factor, found " + hits.length);
    process.exit(1);
  }
  console.log(hits[0].id);
});
')
echo "requirement: $req"
sed -i.bak 's/^- \[ \] 1\.3 Add the TOTP prompt to the login form$/& ['"$req"'] Verify: `grep -q totp src\/login.ts`/' openspec/changes/add-mfa/tasks.md
rm openspec/changes/add-mfa/tasks.md.bak
grep -q "$req\] Verify" openspec/changes/add-mfa/tasks.md
printf '// Covers: %s\n' "$req" > tests/login.test.ts
grep -n '1\.3' openspec/changes/add-mfa/tasks.md

step "status"
specctx status

step "task next"
specctx task next

step "task start add-mfa/1.3"
specctx task start add-mfa/1.3

step "task done add-mfa/1.3, refused because Verify fails"
specctx task done add-mfa/1.3 2>&1 || echo "refused, as expected"

step "Edit src/login.ts, then task done add-mfa/1.3"
printf '// %s\nexport const prompt = "password, then totp";\n' "$req" > src/login.ts
specctx task done add-mfa/1.3

step "context add-mfa/1.3"
specctx context add-mfa/1.3

step "context src/login.ts"
specctx context src/login.ts

step "handoff write"
specctx handoff write

printf '\n== done. The temp dir goes away now.\n'
