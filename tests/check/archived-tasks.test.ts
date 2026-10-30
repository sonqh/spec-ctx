// Covers: REQ-CHK-001
import { afterEach, describe, expect, test } from "vitest";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const ACTIVE = "openspec/changes/001-x/tasks.md";
const ARCHIVED = "openspec/changes/archive/2026-10-01-000-old/tasks.md";
const BARE = "# Tasks\n\n## 1. Old\n\n- [x] 1.1 Old work\n";

describe("archived tasks", () => {
  test("SCN-CHK-001-8 an archived task with no REQ and no Verify gives no finding, an active one does", async () => {
    p = new Project();
    p.write(ARCHIVED, BARE);
    p.write("openspec/changes/archive/2026-10-01-000-old/proposal.md", "# Old\n");
    await p.build();
    const clean = await p.run("check");
    expect(clean.out).not.toContain("task-without-req");
    expect(clean.out).not.toContain("task-without-verify");
    expect(clean.out).not.toContain("000-old");
    const idx = JSON.parse(p.read(".ctx/index.json")) as { problems: unknown[][] };
    expect(idx.problems.filter((x) => String(x[0]).includes("/archive/") && String(x[2]).startsWith("task-without"))).toEqual([]);

    p.append(ACTIVE, "- [ ] 1.9 Bare task\n");
    await p.build();
    const r = await p.run("check");
    expect(r.out).toMatch(/task-without-req {2}001\/1\.9/);
    expect(r.out).toMatch(/task-without-verify {2}001\/1\.9/);
    expect(r.out).not.toContain("000-old");
  });
});
