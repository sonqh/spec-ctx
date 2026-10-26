#!/usr/bin/env bash
# Records the README demo: six clips, one command each, in order on one temp copy of tests/fixtures/no-id-repo before adopt.
# Writes docs/demo/clips/<n>-<name>.cast and .svg, and docs/demo/loop.txt. Needs dist/ (bun run build). asciinema comes from pip, svg-term-cli from npm.
# REQ-GOV-008 the story: adopt, status, the next task, the bundle with its footer, a refused and a passing done, the handoff.
set -euo pipefail
root=$(cd "$(dirname "$0")/../.." && pwd)
out="$root/docs/demo"
clips="$out/clips"
[ -f "$root/dist/cli.js" ] || (cd "$root" && bun run build >/dev/null)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
rm -f "$out/loop.cast" "$out/loop.svg"
rm -rf "$clips"
mkdir -p "$clips"

# the project: the fixture plus docs/demo/specs, before adopt, after init. Task 1.3 cites the ID that adopt gives its requirement.
# A login file without the prompt, and a test file that covers the requirement.
cp -R "$root/tests/fixtures/no-id-repo/." "$work/project"
cd "$work/project"
# six more capabilities without IDs, so the bundle of one task is a small share of the tree
cp -R "$root/docs/demo/specs/." openspec/specs/
node "$root/dist/cli.js" init >/dev/null
sed -i 's/^- \[ \] 1.3 Add the TOTP prompt to the login form$/- [ ] 1.3 Add the TOTP prompt to the login form. [REQ-UA-004] Verify: `grep -q totp src\/login.ts`/' openspec/changes/add-mfa/tasks.md
grep -q 'REQ-UA-004\] Verify' openspec/changes/add-mfa/tasks.md
mkdir -p src tests
printf 'export const prompt = "password";\n' > src/login.ts
printf '// Covers: REQ-UA-004\n// SCN-UA-004-1 SCN-UA-004-2\nimport { prompt } from "../src/login";\n' > tests/login.test.ts

# the helpers of every clip: each command is typed at 0.02 seconds per character and run.
# A pause of 0.8 seconds follows a command, and the clip holds 1.5 seconds after its last command. No caption.
cat > "$work/lib.sh" <<'LIB'
export FORCE_COLOR=1
specctx() { node "$SPECCTX_ROOT/dist/cli.js" "$@" 2>/dev/null; }
show() {
  printf '\033[1;32m$\033[0m '
  for ((i = 0; i < ${#1}; i++)); do printf '%s' "${1:i:1}"; sleep 0.02; done
  printf '\n'
  eval "$1" || true
  sleep "${2:-0.8}"
}
LIB
export SPECCTX_ROOT="$root"

# one clip: <n> <name> <rows> <heading>, the session on stdin
clip() {
  local n=$1 name=$2 rows=$3 heading=$4 cast="$clips/$1-$2.cast"
  { printf 'source %q\n' "$work/lib.sh"; cat; } > "$work/$n.sh"
  if command -v asciinema >/dev/null; then
    asciinema rec --overwrite --quiet --cols 100 --rows "$rows" -i 1.5 -t "$n. $heading" -c "bash $work/$n.sh" "$cast"
  else
    # fallback: script records a typescript and its timing, then node writes an asciicast v2 file
    script -q --timing="$work/timing" -c "bash $work/$n.sh" "$work/typescript" >/dev/null
    node - "$work/timing" "$work/typescript" "$cast" "$rows" "$n. $heading" <<'NODE'
const fs = require("node:fs");
const [timing, ts, cast, rows, title] = process.argv.slice(2);
const data = fs.readFileSync(ts);
let pos = data.indexOf(10) + 1; // skip the header line of script
let t = 0;
const lines = [JSON.stringify({ version: 2, width: 100, height: Number(rows), title })];
for (const l of fs.readFileSync(timing, "utf8").trim().split("\n")) {
  const [d, n] = l.split(" ").map(Number);
  t += Math.min(d, 1.5);
  lines.push(JSON.stringify([+t.toFixed(3), "o", data.subarray(pos, pos + n).toString("utf8")]));
  pos += n;
}
fs.writeFileSync(cast, lines.join("\n") + "\n");
NODE
  fi
  # the plain text transcript of the clip, after its heading line, without escape codes
  node - "$cast" "$heading" "$n" >> "$out/loop.txt" <<'NODE'
const fs = require("node:fs");
const [cast, heading, n] = process.argv.slice(2);
const events = fs.readFileSync(cast, "utf8").trim().split("\n").slice(1).map((l) => JSON.parse(l));
const text = events.filter((e) => e[1] === "o").map((e) => e[2]).join("");
const plain = text.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "");
process.stdout.write(`${n === "1" ? "" : "\n"}# ${n}. ${heading}\n${plain.replace(/\n*$/, "\n")}`);
NODE
  # the hold: one empty event 1.5 seconds after the last output, so the player keeps the last screen
  node - "$cast" <<'NODE'
const fs = require("node:fs");
const [cast] = process.argv.slice(2);
const lines = fs.readFileSync(cast, "utf8").trim().split("\n");
const last = JSON.parse(lines[lines.length - 1]);
if (last[2] !== "") fs.appendFileSync(cast, JSON.stringify([+(last[0] + 1.5).toFixed(3), "o", ""]) + "\n");
NODE
  if ! npx -y svg-term-cli@2.1.1 --in "$cast" --out "$clips/$n-$name.svg" --window >/dev/null 2>&1; then
    rm -f "$clips/$n-$name.svg"
    echo "no SVG converter for clip $n" >&2
    return 1
  fi
}

: > "$out/loop.txt"
clip 1 adopt 18 "Give every requirement an ID" <<'S'
show "specctx adopt --dry-run | head -6"
show "specctx adopt" 1.5
S
clip 2 status 6 "Where are we" <<'S'
show "specctx status" 1.5
S
clip 3 next 6 "What is next" <<'S'
show "specctx task next" 1.5
S
clip 4 start 20 "Only the spec this task needs" <<'S'
show "specctx task start add-mfa/1.3" 1.5
S
clip 5 done 10 "Done means Verify passed" <<'S'
show "specctx task done add-mfa/1.3"
show "cat > src/login.ts <<'EOF'
// REQ-UA-004
export const prompt = \"totp\";
EOF"
show "specctx task done add-mfa/1.3" 1.5
S
clip 6 handoff 12 "Hand off to the next session" <<'S'
show "specctx handoff write"
show "head -8 .ctx/handoff.md" 1.5
S

# the limits: each clip under 7 seconds, all SVGs under 400 kB together
total=0
ok=1
for cast in "$clips"/*.cast; do
  svg="${cast%.cast}.svg"
  len=$(tail -n 1 "$cast" | node -e 'process.stdin.on("data", (d) => console.log(JSON.parse(d)[0]))')
  size=$(wc -c < "$svg")
  total=$((total + size))
  echo "$(basename "$cast" .cast): ${len} s, svg ${size} bytes"
  node -e "process.exit(Number('$len') < 7 ? 0 : 1)" || ok=0
done
echo "svg total ${total} bytes"
[ "$ok" = 1 ] && [ "$total" -lt 400000 ]
