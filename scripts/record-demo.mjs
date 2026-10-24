// Records docs/demo.cast, an asciicast v2 file, from real runs of specctx in a temp project.
// Play it with: asciinema play docs/demo.cast
// Run with: node scripts/record-demo.mjs   (needs dist/ and network for npx openspec)
import { execSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const work = mkdtempSync(join(tmpdir(), "specctx-demo-"));
const cli = `node ${join(root, "dist/cli.js")}`;
const events = [];
let t = 0;
const type = (s) => {
  for (const ch of s) {
    t += 0.05;
    events.push([+t.toFixed(3), "o", ch]);
  }
};
const run = (shown, real) => {
  type(`$ ${shown}`);
  t += 0.3;
  events.push([+t.toFixed(3), "o", "\r\n"]);
  const start = Date.now();
  let out;
  try {
    out = execSync(real, { cwd: work, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    out = (e.stdout ?? "") + (e.stderr ?? "");
  }
  t += Math.max(0.2, (Date.now() - start) / 1000);
  events.push([+t.toFixed(3), "o", out.replace(/\n/g, "\r\n")]);
  t += 1.2;
};

try {
  execSync("npx -y @fission-ai/openspec@1.14.3 init --tools none --no-animation .", { cwd: work, stdio: "ignore" });
  run("npx spec-ctx init --all", `${cli} init --all`);
  // a small change written with the spec-driven-ids templates
  cpSync(join(root, "tests/fixtures/schema-project/openspec/changes/001-export"), join(work, "openspec/changes/001-export"), { recursive: true });
  cpSync(join(root, "tests/fixtures/schema-project/src"), join(work, "src"), { recursive: true });
  writeFileSync(join(work, "spec-ctx.toml"), '[ids]\ncaps = ["EXP"]\n');
  run("specctx status", `${cli} status`);
  run("specctx task next", `${cli} task next`);
  run("specctx task start 001/1.1 | head -8", `${cli} task start 001/1.1 | head -8`);
  run("specctx task done 001/1.1", `${cli} task done 001/1.1`);
  run("specctx id new REQ EXP", `${cli} id new REQ EXP`);
  run("specctx handoff write && head -6 .ctx/handoff.md", `${cli} handoff write && head -6 .ctx/handoff.md`);
  const header = { version: 2, width: 100, height: 30, title: "spec-ctx: init, task next, task done" };
  const lines = [JSON.stringify(header), ...events.map((e) => JSON.stringify(e))];
  writeFileSync(join(root, "docs/demo.cast"), lines.join("\n") + "\n");
  console.log(`wrote docs/demo.cast, ${t.toFixed(0)} s`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
