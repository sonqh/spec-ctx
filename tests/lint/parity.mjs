// Covers: REQ-LINT-001
// Runs `specctx lint` in one process on every corpus file and mode, and diffs the output with the goldens.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { main } from "../../dist/main.js";

const [corpus, gold] = process.argv.slice(2);
const MODES = {
  tells: ["tells", "--baseline", "0"],
  ste: ["ste", "--baseline", "0", "--disable", "synonym-rotation"],
  "ste-all": ["ste", "--baseline", "0"],
  "tells-json": ["tells", "--json"],
  "ste-json": ["ste", "--json"],
};

function walk(dir) {
  const out = [];
  for (const n of readdirSync(dir).sort()) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (n.endsWith(".md")) out.push(p);
  }
  return out;
}

async function run(args) {
  let out = "";
  const code = await main(["lint", ...args], { cwd: process.cwd(), out: (s) => (out += s), err: () => {} });
  return `${out}exit: ${code}\n`;
}

let n = 0;
const bad = [];
for (const f of walk(corpus)) {
  const rel = relative(corpus, f);
  for (const [mode, args] of Object.entries(MODES)) {
    const want = readFileSync(join(gold, `${rel}.${mode}.out`), "utf8");
    const got = await run([...args, f]);
    if (got !== want) bad.push(`${rel} ${mode}`);
  }
  n++;
}
for (const lint of ["tells", "ste"]) {
  const want = readFileSync(join(gold, `selftest.${lint}.out`), "utf8");
  let out = "";
  const code = await main(["lint", lint, "--selftest"], { cwd: process.cwd(), out: (s) => (out += s), err: (s) => (out += s) });
  if (`${out}exit: ${code}\n` !== want) bad.push(`selftest ${lint}`);
}
if (bad.length) {
  console.log(bad.join("\n"));
  console.log(`lint parity: ${bad.length} difference(s)`);
  process.exit(1);
}
console.log(`lint parity: ${n} files identical`);
