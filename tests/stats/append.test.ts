// Covers: REQ-STAT-009, REQ-STAT-010, REQ-STAT-005, SCN-STAT-009-1, SCN-STAT-009-2, SCN-STAT-009-3, SCN-STAT-009-4, SCN-STAT-010-1, SCN-STAT-010-2, SCN-STAT-010-3
import { afterEach, describe, expect, test } from "vitest";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => {
  p?.cleanup();
  delete process.env.SPECCTX_NOW;
});

const DAY = "docs/metrics/2026-10-24.md";
const logLine = (ok: boolean) => JSON.stringify({ at: "2026-10-24T10:00:00.000Z", duration_s: 5, failed_step: ok ? null : "bun run test", ok, steps: 3 });
const README = (path: string, total: string): string => `# T\n\n## Measured\n\nThe newest file is \`${path}\`. Its total row:\n\n| change | a |\n| --- | --- |\n${total}\n\n- note\n\n## After\n\n| total | untouched |\n`;

async function write(): Promise<string> {
  const r = await p.run("stats", "--write");
  expect(r.code, r.err).toBe(0);
  return p.read(DAY);
}

describe("stats --write keeps old rows", () => {
  test("SCN-STAT-009-1 an edited row stays, a new change gets a row, and the total counts both", async () => {
    p = new Project();
    process.env.SPECCTX_NOW = "2026-10-24T08:00:00.000Z";
    const first = await write();
    const row = first.split("\n").find((l) => l.startsWith("| 001-x |"))!;
    expect(row).toBeTruthy();
    const total1 = first.split("\n").find((l) => l.startsWith("| total |"))!;
    p.write(DAY, first.replace(row, "| 001-x | edited | edited | edited | edited | 9 |"));
    p.write("openspec/changes/002-t/tasks.md", "# Tasks\n\n- [ ] 2.1 A. [REQ-AAA-001] Verify: `true`\n");
    expect((await p.run("task", "done", "002/2.1")).code).toBe(0);
    const second = await write();
    expect(second).toContain("| 001-x | edited | edited | edited | edited | 9 |");
    expect(second).toContain("| 002-t |");
    expect(second.split("\n").find((l) => l.startsWith("| total |"))).not.toBe(total1);
    // the new row sits after the old one, in change order
    expect(second.indexOf("| 001-x |")).toBeLessThan(second.indexOf("| 002-t |"));
  });

  test("SCN-STAT-009-2 a shorter gate log keeps the three gate rows, a longer one replaces all three", async () => {
    p = new Project();
    process.env.SPECCTX_NOW = "2026-10-24T08:00:00.000Z";
    p.write(".ctx/gate-log.jsonl", [...Array(34).fill(true), ...Array(15).fill(false)].map(logLine).join("\n") + "\n");
    const first = await write();
    expect(first).toContain("| gate_runs | 49 |");
    p.write(".ctx/gate-log.jsonl", Array(28).fill(true).map(logLine).join("\n") + "\n");
    const second = await write();
    expect(second).toContain("| gate_runs | 49 |");
    expect(second).toContain("| gate_pass_rate | 0.69 (34/49) |");
    expect(second).toContain("| gate_failures_caught | 15 |");
    p.write(".ctx/gate-log.jsonl", Array(60).fill(true).map(logLine).join("\n") + "\n");
    const third = await write();
    expect(third).toContain("| gate_runs | 60 |");
    expect(third).toContain("| gate_pass_rate | 1.00 (60/60) |");
    expect(third).toContain("| gate_failures_caught | 0 |");
  });

  test("SCN-STAT-009-3 a new day writes a new file with every row computed", async () => {
    p = new Project();
    process.env.SPECCTX_NOW = "2026-10-24T08:00:00.000Z";
    const first = await write();
    p.write(DAY, first.replace("| 001-x |", "| 001-x | edited |"));
    process.env.SPECCTX_NOW = "2026-10-25T08:00:00.000Z";
    expect((await p.run("stats", "--write")).out.startsWith("wrote docs/metrics/2026-10-25.md\n")).toBe(true);
    const next = p.read("docs/metrics/2026-10-25.md");
    expect(next).not.toContain("edited");
    expect(next.split("\n").find((l) => l.startsWith("| 001-x |"))).toBe(first.split("\n").find((l) => l.startsWith("| 001-x |")));
  });

  test("SCN-STAT-009-4 two writes with no change between them give the same bytes, with one denominator", async () => {
    p = new Project();
    process.env.SPECCTX_NOW = "2026-10-24T08:00:00.000Z";
    p.write(".ctx/gate-log.jsonl", [true, false, true].map(logLine).join("\n") + "\n");
    const first = await write();
    const second = await write();
    expect(second).toBe(first);
    // a spec edit between the runs moves the index size, but the file keeps the size its rows used
    const chars = /holds (\d+) characters/.exec(first)![1];
    p.append("openspec/specs/alpha/spec.md", "\n#### Scenario: SCN-AAA-001-9 Extra\n- **WHEN** a long extra scenario text is added to move the spec size\n- **THEN** the size grows\n");
    p.touchForward("openspec/specs/alpha/spec.md");
    const third = await write();
    expect(/holds (\d+) characters/.exec(third)![1]).toBe(chars);
  });
});

describe("stats --write sets the README total row", () => {
  test("SCN-STAT-010-1 the path and the total row follow the file, and a second run changes nothing", async () => {
    p = new Project();
    process.env.SPECCTX_NOW = "2026-10-24T08:00:00.000Z";
    p.write("README.md", README("docs/metrics/2026-10-01.md", "| total | old |"));
    const md = await write();
    const total = md.split("\n").find((l) => l.startsWith("| total |"))!;
    const readme = p.read("README.md");
    expect(readme).toBe(README(DAY, total));
    // the total row after the next section stays as it was
    expect(readme).toContain("| total | untouched |");
    await write();
    expect(p.read("README.md")).toBe(readme);
  });

  test("SCN-STAT-010-2 no section or no README leaves the README as it was", async () => {
    p = new Project();
    process.env.SPECCTX_NOW = "2026-10-24T08:00:00.000Z";
    await write();
    expect(() => p.read("README.md")).toThrow();
    p.write("README.md", "# T\n\n| total | old |\n");
    await write();
    expect(p.read("README.md")).toBe("# T\n\n| total | old |\n");
  });

  test("SCN-STAT-010-3 a missing anchor changes nothing", async () => {
    p = new Project();
    process.env.SPECCTX_NOW = "2026-10-24T08:00:00.000Z";
    const noPath = "# T\n\n## Measured\n\n| total | old |\n";
    p.write("README.md", noPath);
    await write();
    expect(p.read("README.md")).toBe(noPath);
    const noRow = "# T\n\n## Measured\n\nThe newest file is `docs/metrics/2026-10-01.md`.\n";
    p.write("README.md", noRow);
    await write();
    expect(p.read("README.md")).toBe(noRow);
  });
});

describe("stats --write --change keeps the whole file", () => {
  test("SCN-STAT-009-1 a write for one change keeps the other rows byte for byte and leaves the README", async () => {
    p = new Project();
    process.env.SPECCTX_NOW = "2026-10-24T08:00:00.000Z";
    p.write("openspec/changes/002-t/tasks.md", "# Tasks\n\n- [ ] 2.1 A. [REQ-AAA-001] Verify: `true`\n");
    expect((await p.run("task", "done", "002/2.1")).code).toBe(0);
    p.write("README.md", README("docs/metrics/2026-10-01.md", "| total | old |"));
    const first = await write();
    const rowA = first.split("\n").find((l) => l.startsWith("| 001-x |"))!;
    const rowB = first.split("\n").find((l) => l.startsWith("| 002-t |"))!;
    expect(rowA && rowB).toBeTruthy();
    // a hand edit of row A proves that the second write keeps it
    p.write(DAY, first.replace(rowA, "| 001-x | kept | kept | kept | kept | 7 |"));
    const readme = p.read("README.md");
    const r = await p.run("stats", "--write", "--change", "002");
    expect(r.code, r.err).toBe(0);
    const second = p.read(DAY);
    expect(second).toContain("| 001-x | kept | kept | kept | kept | 7 |");
    expect(second).toContain(rowB);
    expect(p.read("README.md")).toBe(readme);
  });

  test("SCN-STAT-010-3 a README with the section and a missing anchor gets one note on stderr", async () => {
    p = new Project();
    process.env.SPECCTX_NOW = "2026-10-24T08:00:00.000Z";
    p.write("README.md", "# T\n\n## Measured\n\n| total | old |\n");
    const r = await p.run("stats", "--write");
    expect(r.err).toContain("README.md has ## Measured but no line that starts The newest file is.");
    expect(r.err.split("\n").filter((l) => l.includes("README.md has")).length).toBe(1);
    p.write("README.md", "# T\n\n## Measured\n\nThe newest file is `docs/metrics/2026-10-01.md`.\n");
    expect((await p.run("stats", "--write")).err).toContain("no | total | row");
    // no section and no README give no note
    p.write("README.md", "# T\n");
    expect((await p.run("stats", "--write")).err).not.toContain("README.md has");
  });
});
