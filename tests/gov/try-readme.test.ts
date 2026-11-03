// Covers: REQ-GOV-012
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { cleanEnv, OPENSPEC_STUB, recordingNpx, REPO } from "../helpers.ts";

const SPAWN_MS = 45_000;
const TEST_MS = 60_000;
const BEGIN = "<!-- try:begin -->";
const END = "<!-- try:end -->";
const NPX = "npx -y spec-ctx";

// The lines that the output of the block must hold.
const REQUIRED_LINES = ["refused, as expected", "done add-mfa/1.1"];
// The `context` commands of the block, and the text that the output of each must hold. A new `context` line in the README is one entry here.
const CONTEXT_CHECKS = [{ command: "context add-mfa/1.1", has: "src/login.ts" }];

const readme = readFileSync(join(REPO, "README.md"), "utf8");

/** The text between the two markers, without the fence lines. */
function markedBlock(text: string): string {
  const a = text.indexOf(BEGIN);
  const b = text.indexOf(END);
  if (a < 0 || b < a) return "";
  return text
    .slice(a + BEGIN.length, b)
    .split("\n")
    .filter((l) => !/^\s*```/.test(l))
    .join("\n");
}

/** The block with the local CLI, and an echo line before each `context` command so the test can split the output. */
function localScript(block: string): string {
  const cli = `node ${join(REPO, "dist/cli.js")}`;
  return block
    .split("\n")
    .map((l) => {
      const m = l.match(/^npx -y spec-ctx (context \S+)/);
      const line = l.split(NPX).join(cli);
      return m ? `echo '@@ ${m[1]}'\n${line}` : line;
    })
    .join("\n");
}

function sectionAfterEnd(text: string): string[] {
  const rest = text.slice(text.indexOf(END) + END.length).split("\n");
  const stop = rest.findIndex((l) => l.startsWith("## "));
  return stop < 0 ? rest : rest.slice(0, stop);
}

interface Result {
  shell: string;
  code: number;
  out: string;
  err: string;
}

function shells(): string[] {
  const onPath = spawnSync("sh", ["-c", "command -v bash"], { encoding: "utf8" }).stdout.trim();
  const list = [onPath || "bash"];
  // macOS keeps bash 3.2 in /bin/bash. Run the block under it too when it is another file.
  if (existsSync("/bin/bash") && (!onPath || realpathSync("/bin/bash") !== realpathSync(onPath))) list.push("/bin/bash");
  return list;
}

const results: Result[] = [];
let work = "";
const npx = recordingNpx();

describe("README try-it block", () => {
  beforeAll(() => {
    work = mkdtempSync(join(tmpdir(), "specctx-readme-"));
    const script = localScript(markedBlock(readme));
    for (const [i, shell] of shells().entries()) {
      const dir = join(work, `run${i}`);
      spawnSync("mkdir", ["-p", dir]);
      const file = join(work, `block${i}.sh`);
      writeFileSync(file, script);
      // 053/D2 the stand-in for OpenSpec, so init and status run no npx. 053/D3 a recording npx first on the PATH proves it.
      const env = cleanEnv({ TMPDIR: work, NODE_DISABLE_COMPILE_CACHE: "1", SPECCTX_OPENSPEC: OPENSPEC_STUB });
      env.PATH = npx.path(env.PATH);
      const r = spawnSync(shell, [file], { cwd: dir, env, encoding: "utf8", timeout: SPAWN_MS });
      results.push({ shell, code: r.status ?? -1, out: r.stdout ?? "", err: r.stderr ?? "" });
    }
  }, 120_000);
  afterAll(() => {
    if (work) rmSync(work, { recursive: true, force: true });
    npx.cleanup();
  });

  test("SCN-GOV-012-1 the block exits 0 under each bash, prints the refusal and the done line, and context holds src/login.ts", () => {
    expect(markedBlock(readme)).toContain(NPX);
    expect(markedBlock(readme)).toContain("sed -i.bak");
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const r of results) {
      expect(r.code, `${r.shell}: ${r.err}`).toBe(0);
      const lines = r.out.split("\n");
      for (const want of REQUIRED_LINES) expect(lines.some((l) => l.startsWith(want)), `${r.shell}: ${want}`).toBe(true);
      for (const c of CONTEXT_CHECKS) {
        const at = lines.indexOf(`@@ ${c.command}`);
        expect(at, `${r.shell}: ${c.command}`).toBeGreaterThan(-1);
        const next = lines.findIndex((l, i) => i > at && l.startsWith("@@ "));
        const part = lines.slice(at + 1, next < 0 ? undefined : next);
        expect(part.some((l) => l.includes(c.has)), `${r.shell}: ${c.command} holds ${c.has}`).toBe(true);
      }
    }
  }, TEST_MS);

  test("SCN-GOV-012-2 the heading follows What spec-ctx adds, and the markers appear once each", () => {
    const heads = readme.split("\n").filter((l) => l.startsWith("## "));
    const i = heads.indexOf("## What spec-ctx adds");
    expect(i).toBeGreaterThan(-1);
    expect(heads[i + 1]).toBe("## Try it in two minutes");
    expect(readme.split(BEGIN)).toHaveLength(2);
    expect(readme.split(END)).toHaveLength(2);
    expect(readme.indexOf(BEGIN)).toBeLessThan(readme.indexOf(END));
    // the marked block sits inside that section
    const sec = readme.indexOf("## Try it in two minutes");
    expect(readme.indexOf(BEGIN)).toBeGreaterThan(sec);
  }, TEST_MS);

  test("SCN-GOV-012-3 two notes follow the block: the footer share and the plan approval line", () => {
    const after = sectionAfterEnd(readme);
    expect(after.some((l) => l.includes("100 percent"))).toBe(true);
    expect(after.some((l) => l.includes("`next:`") && l.includes("specctx-run"))).toBe(true);
  }, TEST_MS);

  test("SCN-GOV-012-4 the block makes no npx call in the test", () => {
    expect(npx.calls()).toEqual([]);
  });
});
