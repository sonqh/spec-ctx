// Covers: REQ-GOV-013
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { cleanEnv, recordingNpx, REPO } from "../helpers.ts";

const SPAWN_MS = 45_000;
const TEST_MS = 60_000;

function porcelain(): string {
  return spawnSync("git", ["status", "--porcelain"], { cwd: REPO, env: cleanEnv(), encoding: "utf8" }).stdout;
}

let out = "";
let code = -1;
let stderr = "";
let before = "";
let after = "";
let tmpLeft: string[] = [];
let npxCalls: string[] = [];
const npx = recordingNpx();

describe("scripts/try.sh", () => {
  beforeAll(() => {
    // each run gets its own TMPDIR, so the script's temp dir is the only thing that can stay in it.
    // NODE_DISABLE_COMPILE_CACHE stops Node from writing its own cache folder into that TMPDIR.
    const mine = mkdtempSync(join(tmpdir(), "specctx-try-"));
    before = porcelain();
    // 053/D3 a recording npx first on the PATH, and a shell value of SPECCTX_OPENSPEC that would call it. try.sh must override it.
    const env = cleanEnv({ TMPDIR: mine, NODE_DISABLE_COMPILE_CACHE: "1", SPECCTX_OPENSPEC: "npx -y @fission-ai/openspec@latest" });
    env.PATH = npx.path(env.PATH);
    const r = spawnSync("bash", [join(REPO, "scripts/try.sh")], { cwd: REPO, env, encoding: "utf8", timeout: SPAWN_MS });
    npxCalls = npx.calls();
    after = porcelain();
    out = r.stdout ?? "";
    stderr = r.stderr ?? "";
    code = r.status ?? -1;
    tmpLeft = readdirSync(mine);
    rmSync(mine, { recursive: true, force: true });
  }, TEST_MS);
  afterAll(() => npx.cleanup());

  test("SCN-GOV-013-1 the story exits 0, shows the refusal and the done line, and context holds src/login.ts", () => {
    expect(code, stderr).toBe(0);
    const lines = out.split("\n");
    const headings = lines.filter((l) => l.startsWith("== "));
    expect(headings.length).toBeGreaterThanOrEqual(8);
    expect(lines).toContain("refused, as expected");
    expect(lines.some((l) => l.startsWith("done add-mfa/1.3"))).toBe(true);
    const at = lines.findIndex((l) => l.startsWith("== ") && l.includes("context add-mfa/1.3"));
    expect(at).toBeGreaterThan(-1);
    const next = lines.findIndex((l, i) => i > at && l.startsWith("== "));
    const block = lines.slice(at + 1, next === -1 ? undefined : next);
    expect(block.some((l) => l.includes("src/login.ts"))).toBe(true);
  }, TEST_MS);

  test("SCN-GOV-013-2 the run leaves its TMPDIR empty and adds no file to the repository", () => {
    expect(code, stderr).toBe(0);
    expect(tmpLeft).toEqual([]);
    expect(after).toBe(before);
  }, TEST_MS);

  test("SCN-GOV-013-3 the bundle is a small share of the spec text", () => {
    const m = out.match(/^-- bundle \d+ chars, ([\d.]+)% of \d+ chars of spec text$/m);
    expect(m, out).not.toBeNull();
    expect(Number(m![1])).toBeLessThan(25);
  }, TEST_MS);

  test("SCN-GOV-013-4 the story makes no npx call, even with SPECCTX_OPENSPEC set in the shell", () => {
    expect(npxCalls).toEqual([]);
  });
});
