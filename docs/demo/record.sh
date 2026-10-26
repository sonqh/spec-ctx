#!/usr/bin/env bash
# Records the README demo: the life cycle of one task in six captioned steps on a temp copy of tests/fixtures/no-id-repo before adopt.
# Writes docs/demo/loop.cast, loop.svg, and loop.txt. Needs dist/ (bun run build). asciinema comes from pip, svg-term-cli from npm.
# REQ-GOV-008 the story: adopt, status, the next task, the bundle with its footer, a refused and a passing done, the handoff.
set -euo pipefail
root=$(cd "$(dirname "$0")/../.." && pwd)
out="$root/docs/demo"
[ -f "$root/dist/cli.js" ] || (cd "$root" && bun run build >/dev/null)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

# the project: the fixture before adopt, after init. Task 1.3 cites the ID that adopt gives its requirement.
# A login file without the prompt, and a test file that covers the requirement.
cp -R "$root/tests/fixtures/no-id-repo/." "$work/project"
cd "$work/project"
node "$root/dist/cli.js" init >/dev/null
sed -i 's/^- \[ \] 1.3 Add the TOTP prompt to the login form$/- [ ] 1.3 Add the TOTP prompt to the login form. [REQ-UA-004] Verify: `grep -q totp src\/login.ts`/' openspec/changes/add-mfa/tasks.md
grep -q 'REQ-UA-004\] Verify' openspec/changes/add-mfa/tasks.md
mkdir -p src tests
printf 'export const prompt = "password";\n' > src/login.ts
printf '// Covers: REQ-UA-004\n// SCN-UA-004-1 SCN-UA-004-2\nimport { prompt } from "../src/login";\n' > tests/login.test.ts

# the session: a dim caption, then each command is typed, run, and followed by a pause of 1.2 seconds
cat > "$work/session.sh" <<'SESSION'
export FORCE_COLOR=1
specctx() { node "$SPECCTX_ROOT/dist/cli.js" "$@" 2>/dev/null; }
say() { printf '\n\033[2m%s\033[0m\n' "$1"; sleep 0.6; }
show() {
  printf '\033[1;32m$\033[0m '
  for ((i = 0; i < ${#1}; i++)); do printf '%s' "${1:i:1}"; sleep 0.02; done
  printf '\n'
  eval "$1" || true
  sleep "${2:-1.2}"
}
say "# 1. Give every requirement an ID"
show "specctx adopt --dry-run | head -6"
show "specctx adopt"
say "# 2. Where are we"
show "specctx status"
say "# 3. What is next"
show "specctx task next"
say "# 4. Only the spec this task needs"
show "specctx task start add-mfa/1.3" 2
say "# 5. Done means Verify passed"
show "specctx task done add-mfa/1.3"
show "cat > src/login.ts <<'EOF'
// REQ-UA-004
export const prompt = \"totp\";
EOF" 0.6
show "specctx task done add-mfa/1.3"
say "# 6. Hand off to the next session"
show "specctx handoff write" 0.6
show "head -8 .ctx/handoff.md" 2
SESSION
export SPECCTX_ROOT="$root"

if command -v asciinema >/dev/null; then
  asciinema rec --overwrite --quiet --cols 100 --rows 32 -i 2 -t "spec-ctx: IDs, the bundle of one task, Verify, and the handoff" -c "bash $work/session.sh" "$out/loop.cast"
else
  # fallback: script records a typescript and its timing, then node writes an asciicast v2 file
  script -q --timing="$work/timing" -c "bash $work/session.sh" "$work/typescript" >/dev/null
  node - "$work/timing" "$work/typescript" "$out/loop.cast" <<'NODE'
const fs = require("node:fs");
const [timing, ts, cast] = process.argv.slice(2);
const data = fs.readFileSync(ts);
let pos = data.indexOf(10) + 1; // skip the header line of script
let t = 0;
const lines = [JSON.stringify({ version: 2, width: 100, height: 32, title: "spec-ctx: IDs, the bundle of one task, Verify, and the handoff" })];
for (const l of fs.readFileSync(timing, "utf8").trim().split("\n")) {
  const [d, n] = l.split(" ").map(Number);
  t += d;
  lines.push(JSON.stringify([+t.toFixed(3), "o", data.subarray(pos, pos + n).toString("utf8")]));
  pos += n;
}
fs.writeFileSync(cast, lines.join("\n") + "\n");
NODE
fi

# the plain text transcript: the output of the cast without escape codes
node - "$out/loop.cast" "$out/loop.txt" <<'NODE'
const fs = require("node:fs");
const [cast, txt] = process.argv.slice(2);
const events = fs.readFileSync(cast, "utf8").trim().split("\n").slice(1).map((l) => JSON.parse(l));
const text = events.filter((e) => e[1] === "o").map((e) => e[2]).join("");
fs.writeFileSync(txt, text.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "").replace(/\r\n/g, "\n").replace(/\r/g, ""));
NODE

if npx -y svg-term-cli@2.1.1 --in "$out/loop.cast" --out "$out/loop.svg" --window >/dev/null 2>&1; then
  echo "wrote docs/demo/loop.cast, loop.svg, loop.txt"
else
  rm -f "$out/loop.svg"
  echo "wrote docs/demo/loop.cast and loop.txt. No SVG converter."
fi
end=$(tail -n 1 "$out/loop.cast" | node -e 'process.stdin.on("data", (d) => console.log(Math.round(JSON.parse(d)[0])))')
size=$(cat "$out/loop.svg" 2>/dev/null | wc -c)
echo "length ${end} s, svg ${size} bytes"
[ "$end" -lt 30 ] && [ "$size" -lt 400000 ]
