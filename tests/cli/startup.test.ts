// Covers: REQ-CLI-003, REQ-DIST-001
import { describe, expect, test } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REPO } from "../helpers.ts";

function loaded(entry: string, args: string[]): string[] {
  const dir = mkdtempSync(join(tmpdir(), "specctx-trace-"));
  const file = join(dir, "trace.txt");
  try {
    execFileSync("node", ["--import", join(REPO, "tests/cli/trace-hooks.mjs"), entry, ...args], {
      env: { ...process.env, SPECCTX_TRACE_FILE: file },
    });
    return readFileSync(file, "utf8").trim().split("\n");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const HEAVY = /\/(src|dist)\/(index|graph|check)\//;

describe("startup", () => {
  test("SCN-CLI-003-1 --version loads no module from index, graph, or check", () => {
    const entries = [join(REPO, "src/cli.ts")];
    if (existsSync(join(REPO, "dist/cli.js"))) entries.push(join(REPO, "dist/cli.js"));
    for (const entry of entries) {
      const urls = loaded(entry, ["--version"]);
      expect(urls.some((u) => u.endsWith("/cli.js") || u.endsWith("/cli.ts"))).toBe(true);
      expect(urls.filter((u) => HEAVY.test(u))).toEqual([]);
      // a real command does load them, so the trace works
      expect(loaded(entry, ["status", "--root", REPO]).some((u) => HEAVY.test(u))).toBe(true);
    }
  });

  test("SCN-DIST-001-1 node dist/cli.js --version prints the version", () => {
    if (!existsSync(join(REPO, "dist/cli.js"))) execFileSync("bun", ["run", "build"], { cwd: REPO });
    const out = execFileSync("node", [join(REPO, "dist/cli.js"), "--version"], { encoding: "utf8" });
    const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));
    expect(out).toBe(pkg.version + "\n");
  });

  test("SCN-DIST-001-2 no Bun global in the source outside scripts/", () => {
    const hits: string[] = [];
    const walk = (dir: string): void => {
      for (const n of readdirSync(dir)) {
        const p = join(dir, n);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|js|mjs)$/.test(n) && /\bBun\./.test(readFileSync(p, "utf8"))) hits.push(p);
      }
    };
    walk(join(REPO, "src"));
    expect(hits).toEqual([]);
  });
});
