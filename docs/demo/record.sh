#!/usr/bin/env bash
# Records the README demo: one task loop on a temp copy of tests/fixtures/no-id-repo after adopt.
# Writes docs/demo/loop.cast and docs/demo/loop.svg. Without a converter it writes docs/demo/loop.txt.
# Needs dist/ (bun run build). asciinema comes from pip, svg-term-cli from npm.
set -euo pipefail
root=$(cd "$(dirname "$0")/../.." && pwd)
out="$root/docs/demo"
[ -f "$root/dist/cli.js" ] || (cd "$root" && bun run build >/dev/null)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

# the project: the fixture after init and adopt, with task 1.3 tied to its requirement
cp -R "$root/tests/fixtures/no-id-repo/." "$work/project"
cd "$work/project"
node "$root/dist/cli.js" init >/dev/null
node "$root/dist/cli.js" adopt >/dev/null
rm -f adopt-report.md
sed -i 's/^- \[ \] 1.3 Add the TOTP prompt to the login form$/- [ ] 1.3 Add the TOTP prompt to the login form. [REQ-UA-004] Verify: `grep -q totp src\/login.ts`/' openspec/changes/add-mfa/tasks.md
grep -q 'REQ-UA-004\] Verify' openspec/changes/add-mfa/tasks.md

# the session: each command is typed, run, and followed by a short pause
cat > "$work/session.sh" <<SESSION
specctx() { node "$root/dist/cli.js" "\$@"; }
show() {
  printf '\033[1;32m\$\033[0m '
  for ((i = 0; i < \${#1}; i++)); do printf '%s' "\${1:i:1}"; sleep 0.03; done
  printf '\n'
  eval "\$1"
  sleep 1.5
}
show "specctx status"
show "specctx task next"
show "specctx task start add/1.3 | head -12"
show "printf '// REQ-UA-004\nexport const prompt = \"totp\";\n' > src/login.ts"
show "specctx task done add/1.3"
show "specctx stats --change add"
SESSION
mkdir -p src

if command -v asciinema >/dev/null; then
  asciinema rec --overwrite --quiet --cols 100 --rows 32 -i 2 -t "spec-ctx: one task loop" -c "bash $work/session.sh" "$out/loop.cast"
else
  # fallback: script records a typescript and its timing, then node writes an asciicast v2 file
  script -q --timing="$work/timing" -c "bash $work/session.sh" "$work/typescript" >/dev/null
  node - "$work/timing" "$work/typescript" "$out/loop.cast" <<'NODE'
const fs = require("node:fs");
const [timing, ts, cast] = process.argv.slice(2);
const data = fs.readFileSync(ts);
let pos = data.indexOf(10) + 1; // skip the header line of script
let t = 0;
const lines = [JSON.stringify({ version: 2, width: 100, height: 32, title: "spec-ctx: one task loop" })];
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
[ "$end" -lt 60 ] && [ "$size" -lt 400000 ]
