// Covers: REQ-CLI-007
import { existsSync } from "node:fs";
import { afterEach, describe, expect, test } from "vitest";
import { NO_ID_FIXTURE, Project } from "../helpers.ts";

let p: Project | undefined;
afterEach(() => {
  p?.cleanup();
  p = undefined;
});

const last = (s: string): string => s.trimEnd().split("\n").at(-1)!;
const TASKS = (body: string) => `# Tasks\n\n## 1. Group\n\n${body}`;

describe("next step lines", () => {
  test("SCN-CLI-007-2 status with an open task ends with next: specctx task next", async () => {
    p = new Project();
    expect(last((await p.run("status")).out)).toBe("next: specctx task next");
  });

  test("status with every task done ends with next: archive <change>", async () => {
    p = new Project();
    p.write("openspec/changes/001-x/tasks.md", TASKS("- [x] 1.1 A. [REQ-AAA-001] Verify: `true`\n"));
    expect(last((await p.run("status")).out)).toBe("next: archive 001-x");
  });

  test("status with no active change and uncovered REQs ends with next: specctx check", async () => {
    p = new Project();
    p.write("openspec/specs/gamma/spec.md", "# gamma\n\n## Requirements\n\n### Requirement: REQ-AAA-007 Seven\nText.\n\n#### Scenario: SCN-AAA-007-1 S\n- a\n");
    p.write("openspec/changes/001-x/tasks.md", "# Tasks\n");
    const r = await p.run("status");
    expect(r.out).toContain("no active change");
    expect(last(r.out)).toBe("next: specctx check");
  });

  test("SCN-CLI-007-3 init --all twice: the second run prints nothing to do", async () => {
    p = new Project(null);
    const a = await p.run("init", "--all");
    expect(a.code, a.err).toBe(0);
    expect(last(a.out)).toBe("next: specctx status");
    const b = await p.run("init", "--all");
    expect(b.code, b.err).toBe(0);
    expect(b.out).toBe("nothing to do\nnext: specctx status\n");
  });

  test("adopt --dry-run with work ends with the next step and still exits 1", async () => {
    p = new Project(NO_ID_FIXTURE);
    const r = await p.run("adopt", "--dry-run");
    expect(r.code).toBe(1);
    expect(last(r.out)).toMatch(/^exit 1: \d+ headers need an ID\. Next: specctx adopt$/);
  });

  test("SCN-CLI-007-4 adopt with nothing to do writes no report", async () => {
    p = new Project();
    // a config whose caps differ from the plan still writes no report
    p.write("spec-ctx.toml", "[ids]\ncaps = []\n");
    const r = await p.run("adopt");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toContain("nothing to adopt");
    expect(existsSync(p.path("adopt-report.md"))).toBe(false);
  });
});
