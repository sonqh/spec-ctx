#!/usr/bin/env bash
# Records the README demo: one task told in five captioned steps on a temp copy of tests/fixtures/no-id-repo after adopt.
# Writes docs/demo/loop.cast, loop.svg, and loop.txt. Needs dist/ (bun run build). asciinema comes from pip, svg-term-cli from npm.
# REQ-GOV-008 the story: next task, a refused done, the work, a passing done with the diff of tasks.md, a stale catch.
set -euo pipefail
root=$(cd "$(dirname "$0")/../.." && pwd)
out="$root/docs/demo"
[ -f "$root/dist/cli.js" ] || (cd "$root" && bun run build >/dev/null)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

# the project: the fixture after init and adopt, with task 1.3 tied to its requirement and a login file without the prompt
cp -R "$root/tests/fixtures/no-id-repo/." "$work/project"
cd "$work/project"
node "$root/dist/cli.js" init >/dev/null
node "$root/dist/cli.js" adopt >/dev/null
rm -f adopt-report.md
sed -i 's/^- \[ \] 1.3 Add the TOTP prompt to the login form$/- [ ] 1.3 Add the TOTP prompt to the login form. [REQ-UA-004] Verify: `grep -q totp src\/login.ts`/' openspec/changes/add-mfa/tasks.md
grep -q 'REQ-UA-004\] Verify' openspec/changes/add-mfa/tasks.md
mkdir -p src
printf 'export const prompt = "password";\n' > src/login.ts
# the legacy findings of the fixture go to the baseline, so check shows only what the session causes
node "$root/dist/cli.js" baseline write >/dev/null 2>&1
# one commit after adopt, so git diff shows the checkbox flip
git init -q
git config user.name "spec-ctx demo"
git config user.email "demo@example.invalid"
git add -A
git commit -qm "adopt"

# the session: a dim caption, then each command is typed, run, and followed by a short pause
cat > "$work/session.sh" <<'SESSION'
export FORCE_COLOR=1
specctx() { node "$SPECCTX_ROOT/dist/cli.js" "$@" 2>/dev/null; }
say() { printf '\n\033[2m%s\033[0m\n' "$1"; sleep 0.6; }
show() {
  printf '\033[1;32m$\033[0m '
  for ((i = 0; i < ${#1}; i++)); do printf '%s' "${1:i:1}"; sleep 0.02; done
  printf '\n'
  eval "$1" || true
  sleep "${2:-1.4}"
}
say "# 1. The next task and the command that proves it"
show "specctx task next"
say "# 2. Done? Not until Verify passes"
show "specctx task done add-mfa/1.3" 1.8
say "# 3. The agent does the work"
show "cat > src/login.ts <<'EOF'
// REQ-UA-004
export const prompt = \"totp\";
EOF" 1
say "# 4. Verify passes. The box flips and the evidence is written"
show "specctx task done add-mfa/1.3" 1
show "git diff --no-color openspec/changes/add-mfa/tasks.md | grep '^[-+]- '" 2
say "# 5. A later edit makes the evidence stale. check says so"
show "echo >> src/login.ts" 0.5
show "specctx check --strict" 2.5
SESSION
export SPECCTX_ROOT="$root"

if command -v asciinema >/dev/null; then
  asciinema rec --overwrite --quiet --cols 100 --rows 32 -i 2 -t "spec-ctx: one task, refused, done, and caught stale" -c "bash $work/session.sh" "$out/loop.cast"
else
  # fallback: script records a typescript and its timing, then node writes an asciicast v2 file
  script -q --timing="$work/timing" -c "bash $work/session.sh" "$work/typescript" >/dev/null
  node - "$work/timing" "$work/typescript" "$out/loop.cast" <<'NODE'
const fs = require("node:fs");
const [timing, ts, cast] = process.argv.slice(2);
const data = fs.readFileSync(ts);
let pos = data.indexOf(10) + 1; // skip the header line of script
let t = 0;
const lines = [JSON.stringify({ version: 2, width: 100, height: 32, title: "spec-ctx: one task, refused, done, and caught stale" })];
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
