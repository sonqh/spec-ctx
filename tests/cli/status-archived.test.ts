// Covers: REQ-CLI-001
import { afterEach, describe, expect, test } from "vitest";
import { rmSync } from "node:fs";
import { archivedAt } from "../../src/cli/status.ts";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const TASK = "# Tasks\n\n- [x] 1.1 T. [REQ-AAA-001] Verify: `true`\n";
function archive(pr: Project, folder: string, archived?: string): void {
  pr.write(`openspec/changes/archive/${folder}/tasks.md`, TASK);
  pr.write(`openspec/changes/archive/${folder}/.openspec.yaml`, `schema: spec-driven\ncreated: 2026-10-24\n${archived ? `archived: "${archived}"\n` : ""}`);
}
function noActive(pr: Project): void {
  rmSync(pr.path("openspec/changes/001-x"), { recursive: true, force: true });
}

describe("status archive order", () => {
  test("SCN-CLI-001-7 same day archives order by the archived time", async () => {
    p = new Project();
    noActive(p);
    archive(p, "2026-10-24-005-metrics", "2026-10-24T18:00:00Z");
    archive(p, "2026-10-24-006-polish", "2026-10-24T09:00:00Z");
    const r = await p.run("status");
    expect(r.out).toContain("no active change\nlast archived: 005-metrics\n");
  });

  test("SCN-CLI-001-3 with no archived value the folder name decides", async () => {
    p = new Project();
    noActive(p);
    archive(p, "2026-10-24-005-metrics");
    archive(p, "2026-10-24-006-polish");
    archive(p, "2026-10-23-004-adopt", "2026-10-23T23:00:00Z");
    expect((await p.run("status")).out).toContain("last archived: 006-polish\n");
  });

  test("the fallback is the date at the start of the folder name", () => {
    p = new Project();
    archive(p, "2026-10-24-005-metrics");
    expect(archivedAt(p.root, "2026-10-24-005-metrics")).toBe("2026-10-24");
    expect(archivedAt(p.root, "no-date")).toBe("");
  });
});
