// Covers: REQ-STAT-005, REQ-CLI-001
import { afterEach, describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { Project, REPO } from "../helpers.ts";

let p: Project;
afterEach(() => {
  p?.cleanup();
  delete process.env.SPECCTX_NOW;
});

const logLine = (ok: boolean) => JSON.stringify({ at: "2026-10-24T10:00:00.000Z", duration_s: 5, failed_step: ok ? null : "bun run test", ok, steps: 3 });

describe("stats command", () => {
  test("SCN-STAT-005-2 eight passing and two failing runs", async () => {
    p = new Project();
    p.write(".ctx/gate-log.jsonl", [...Array(8).fill(true), false, false].map(logLine).join("\n") + "\n");
    const r = await p.run("stats");
    expect(r.out).toContain("gate_pass_rate 0.80 (8/10)\n");
    expect(r.out).toContain("gate_failures_caught 2\n");
    expect(r.out).toContain("gate_runs 10\n");
  });

  test("only the last 100 lines count", async () => {
    p = new Project();
    p.write(".ctx/gate-log.jsonl", [...Array(50).fill(false), ...Array(100).fill(true)].map(logLine).join("\n") + "\n");
    expect((await p.run("stats")).out).toContain("gate_pass_rate 1.00 (100/100)\n");
  });

  test("no gate log prints n/a", async () => {
    p = new Project();
    const s = JSON.parse((await p.run("stats", "--json")).out);
    expect(s.gate.gate_pass_rate).toMatchObject({ value: null, text: "n/a" });
  });

  test("SCN-STAT-005-3 two writes on one day leave one file that passes both linters", async () => {
    p = new Project();
    process.env.SPECCTX_NOW = "2026-10-24T08:00:00.000Z";
    expect((await p.run("stats", "--write")).out.startsWith("wrote docs/metrics/2026-10-24.md\n")).toBe(true);
    process.env.SPECCTX_NOW = "2026-10-24T20:00:00.000Z";
    await p.run("stats", "--write");
    expect(readdirSync(p.path("docs/metrics"))).toEqual(["2026-10-24.md"]);
    const file = p.path("docs/metrics/2026-10-24.md");
    expect(p.read("docs/metrics/2026-10-24.md")).toContain("| total |");
    for (const args of [["tells", "--baseline", "0", file], ["ste", "--baseline", "0", "--disable", "synonym-rotation", file]]) {
      const r = spawnSync(process.execPath, [join(REPO, "dist/cli.js"), "lint", ...args], { encoding: "utf8" });
      expect(r.status, r.stdout).toBe(0);
    }
  });

  test("--change narrows the rows and --json lists the tasks behind the ratios", async () => {
    p = new Project();
    p.write("openspec/changes/002-t/tasks.md", "# Tasks\n\n- [ ] 2.1 A. [REQ-AAA-001] Verify: `true`\n");
    await p.run("task", "done", "002/2.1");
    const s = JSON.parse((await p.run("stats", "--json", "--change", "002")).out);
    expect(s.rows.map((r: { change: string }) => r.change)).toEqual(["002-t"]);
    expect(s.rows[0].evidence_ratio.tasks).toEqual(["002/2.1"]);
  });

  test("SCN-CLI-001-6 stats sits under Read in the help", async () => {
    p = new Project(null);
    const lines = (await p.run("--help")).out.split("\n");
    const read = lines.slice(lines.indexOf("Read:") + 1, lines.indexOf("Write:"));
    expect(read.some((l) => l.startsWith("  `stats`"))).toBe(true);
  });
});
