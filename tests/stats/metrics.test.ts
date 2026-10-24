// Covers: REQ-STAT-001, REQ-STAT-002, REQ-STAT-003, REQ-STAT-004
import { afterEach, describe, expect, test } from "vitest";
import { cpSync } from "node:fs";
import { join } from "node:path";
import { median } from "../../src/stats/stats.ts";
import { Project, REPO } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const TASKS = "openspec/changes/007-m/tasks.md";

function evidence(pr: Project, n: number, fields: (i: number) => Record<string, unknown>): void {
  pr.write(TASKS, "# Tasks\n\n" + Array.from({ length: n }, (_, i) => `- [x] 1.${i + 1} T. [REQ-AAA-001] Verify: \`true\`\n`).join(""));
  for (let i = 0; i < n; i++) {
    pr.write(`.ctx/evidence/007/1.${i + 1}.json`, JSON.stringify({ task: `007/1.${i + 1}`, kind: "command", at: "2026-10-24T10:00:00.000Z", files: {}, reqs: ["REQ-AAA-001"], verify: {}, ...fields(i) }) + "\n");
  }
}
const json = async (pr: Project, ...a: string[]) => JSON.parse((await pr.run("stats", "--json", ...a)).out);
const row = (s: { rows: { change: string }[] }, c: string) => s.rows.find((r) => r.change === c) as Record<string, { text: string; value: number | null; tasks?: string[] }>;

describe("stats metrics", () => {
  test("SCN-STAT-001-1 one row per change with evidence, a total row, five metric columns", async () => {
    p = new Project(null);
    for (const d of ["openspec", "decisions", "spec-ctx.toml", ".ctx/evidence"]) cpSync(join(REPO, d), p.path(d), { recursive: true });
    const r = await p.run("stats");
    expect(r.code).toBe(0);
    const lines = r.out.split("\n");
    expect(lines[0]!.split(/ {2,}/)).toEqual(["change", "context_ratio", "evidence_ratio", "stale_catches", "cycle_time_median_s", "debt"]);
    const s = await json(p);
    const rows = lines.slice(1, 1 + s.rows.length + 1);
    expect(rows.map((l) => l.split(/ {2,}/)[0])).toEqual([...s.rows.map((x: { change: string }) => x.change), "total"]);
    for (const c of ["001-engine-port", "002-ids-and-tasks", "003-distribution", "004-adopt-existing"]) expect(s.rows.map((x: { change: string }) => x.change)).toContain(c);
    for (const l of rows) expect(l.split(/ {2,}/)).toHaveLength(6);
  });

  test("SCN-STAT-001-2 evidence without bundle_chars gives context_ratio n/a", async () => {
    p = new Project();
    evidence(p, 2, () => ({}));
    const s = await json(p);
    expect(row(s, "007-m").context_ratio).toMatchObject({ value: null, text: "n/a" });
    expect(row(s, "007-m").cycle_time_median_s.text).toBe("n/a");
    expect((await p.run("stats")).out).toMatch(/^007-m +n\/a +/m);
  });

  test("SCN-STAT-002-1 the context ratio is the mean of bundle_chars over spec_chars", async () => {
    p = new Project();
    evidence(p, 2, (i) => ({ bundle_chars: i === 0 ? 100 : 300 }));
    const s = await json(p);
    const r = row(s, "007-m").context_ratio;
    expect(r.value).toBeCloseTo((100 / s.spec_chars + 300 / s.spec_chars) / 2, 10);
    expect(r.text).toMatch(/^\d\.\d{4} \(n=2\)$/);
  });

  test("SCN-STAT-003-1 nine command and one manual give 0.90 (9/10)", async () => {
    p = new Project();
    evidence(p, 10, (i) => ({ kind: i === 9 ? "manual" : "command" }));
    const r = row(await json(p), "007-m").evidence_ratio;
    expect(r.text).toBe("0.90 (9/10)");
    expect(r.tasks).toHaveLength(9);
    expect(r.tasks).not.toContain("007/1.10");
  });

  test("SCN-STAT-003-2 reopen files whose reason holds stale are stale catches", async () => {
    p = new Project();
    evidence(p, 3, () => ({}));
    const reasons = ["stale-evidence 007/1.1 src/a.ts", "stale-evidence 007/1.2 src/a.ts", "spec changed"];
    reasons.forEach((reason, i) => p.write(`.ctx/evidence/007/1.${i + 1}.reopened-1.json`, JSON.stringify({ task: `007/1.${i + 1}`, kind: "command", at: "x", reason }) + "\n"));
    const r = row(await json(p), "007-m").stale_catches;
    expect(r.value).toBe(2);
    expect(r.text).toBe("2 (of 3 reopens)");
    expect(r.tasks).toEqual(["007/1.1", "007/1.2"]);
  });

  test("task reopen keeps its reason in the old evidence", async () => {
    p = new Project();
    p.write(TASKS, "# Tasks\n\n- [ ] 1.1 T. [REQ-AAA-001] Verify: `true`\n");
    await p.run("task", "done", "007/1.1");
    await p.run("task", "reopen", "007/1.1", "stale-evidence 007/1.1 src/a.ts");
    expect(JSON.parse(p.read(".ctx/evidence/007/1.1.reopened-1.json")).reason).toBe("stale-evidence 007/1.1 src/a.ts");
    expect(row(await json(p), "007-m").stale_catches.value).toBe(1);
  });

  test("SCN-STAT-004-1 the cycle time is the median over tasks with a start time", async () => {
    p = new Project();
    const took = [120, 300, 900];
    evidence(p, 3, (i) => ({ started_at: new Date(Date.parse("2026-10-24T10:00:00.000Z") - took[i]! * 1000).toISOString() }));
    expect(row(await json(p), "007-m").cycle_time_median_s).toMatchObject({ value: 300, text: "300 (n=3)" });
    expect(median([1, 2, 3, 4])).toBe(3);
    expect(median([])).toBeNull();
  });

  test("SCN-STAT-004-2 debt is the baseline plus new debt findings", async () => {
    p = new Project();
    p.write(".ctx/baseline.json", JSON.stringify(Array.from({ length: 19 }, (_, i) => `uncovered REQ-OLD-${String(i + 1).padStart(3, "0")}`)) + "\n");
    p.append("openspec/specs/alpha/spec.md", "\n### Requirement: REQ-AAA-003 New one\nText.\n\n#### Scenario: SCN-AAA-003-1 S\n- a\n\n### Requirement: REQ-AAA-004 New two\nText.\n\n#### Scenario: SCN-AAA-004-1 S\n- a\n");
    p.write("tests/new.cases.ts", "// SCN-AAA-003-1 SCN-AAA-004-1\n");
    // the base fixture also holds manual evidence for the active task 001/1.1
    p.write(".ctx/evidence/001/1.1.json", p.read(".ctx/evidence/001/1.1.json").replace('"manual"', '"command"'));
    const s = await json(p);
    expect(s.total.debt).toMatchObject({ value: 21, text: "21 (19 baselined + 2 new)" });
  });
});
