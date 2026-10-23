// Covers: REQ-IDX-004
import { describe, expect, test } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Project, REPO } from "../helpers.ts";
import { genPerf } from "./perfgen.ts";

describe("speed", () => {
  test("SCN-IDX-004-3 build on 2,000 files with Node 22 is under 1 s", () => {
    const p = new Project(null);
    try {
      genPerf(p.root);
      const cli = existsSync(join(REPO, "dist/cli.js")) ? join(REPO, "dist/cli.js") : join(REPO, "src/cli.ts");
      // warm the file cache once, then time a cold process
      execFileSync("node", [cli, "build", "--root", p.root]);
      const t0 = performance.now();
      execFileSync("node", [cli, "build", "--root", p.root]);
      const dt = performance.now() - t0;
      const idx = JSON.parse(readFileSync(p.path(".ctx/index.json"), "utf8"));
      expect(idx.scanned.count).toBe(2001);
      expect(dt, `build took ${dt.toFixed(0)} ms`).toBeLessThan(1000);
    } finally {
      p.cleanup();
    }
  });
});
