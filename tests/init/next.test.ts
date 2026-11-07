// Covers: REQ-DIST-017, REQ-CLI-010, REQ-CLI-007
import { afterEach, describe, expect, test } from "vitest";
import { Project, BASE_FIXTURE, NO_ID_FIXTURE } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const lastLine = (out: string): string => out.trimEnd().split("\n").at(-1) as string;
const lineBeforeLast = (out: string): string => out.trimEnd().split("\n").at(-2) as string;

function tracked(pr: Project): Map<string, string> {
  const m = new Map<string, string>();
  for (const [k, v] of pr.snapshot()) if (k.startsWith("openspec/")) m.set(k, v);
  return m;
}

/** The ctx-repo fixture with task 1.1 open, so the first open task is 001/1.1. */
function openTaskProject(): Project {
  const pr = new Project(BASE_FIXTURE);
  const t = "openspec/changes/001/tasks.md";
  const files = [...pr.snapshot().keys()].filter((k) => k.endsWith("/tasks.md") && k.startsWith("openspec/changes/"));
  const f = files[0] ?? t;
  pr.write(f, pr.read(f).replace("- [x] 1.1", "- [ ] 1.1"));
  return pr;
}

describe("REQ-DIST-017 init names the next command", () => {
  test("SCN-DIST-017-1 specs without IDs", async () => {
    p = new Project(NO_ID_FIXTURE);
    const r = await p.run("init", "--all");
    expect(r.code, r.err).toBe(0);
    expect(lineBeforeLast(r.out)).toMatch(/^specs: 20 headers in 3 files need an ID \(2 capability codes\)\. adopt --dry-run shows each one\.$/);
    expect(lastLine(r.out)).toBe("next: specctx adopt");
  });

  test("SCN-DIST-017-2 specs with IDs and an open task", async () => {
    p = openTaskProject();
    const before = tracked(p);
    const r = await p.run("init");
    expect(r.code, r.err).toBe(0);
    expect(lastLine(r.out)).toBe("next: specctx context 001/1.1");
    expect(r.out).not.toContain("specs:");
    // init wrote no tracked spec file
    expect(tracked(p)).toEqual(before);
  });

  test("SCN-DIST-017-3 no open task, an empty project, and a repeated header name", async () => {
    p = new Project(null);
    p.write("openspec/config.yaml", "schema: spec-driven\n");
    p.write("openspec/specs/.gitkeep", "");
    p.write("openspec/changes/archive/.gitkeep", "");
    const r = await p.run("init");
    expect(r.code, r.err).toBe(0);
    expect(lastLine(r.out)).toBe("next: specctx status");
    expect(r.out).not.toContain("specs:");
    p.cleanup();
    p = openTaskProject();
    // the planner raises UsageExit for a repeated header name. init falls back to status
    p.write("openspec/specs/dup/spec.md", "## Purpose\nx\n\n## Requirements\n\n### Requirement: Same\nIt SHALL x.\n\n### Requirement: Same\nIt SHALL y.\n");
    const bad = await p.run("init");
    expect(bad.code, bad.err).toBe(0);
    expect(lastLine(bad.out)).toBe("next: specctx status");
    expect(bad.out).not.toContain("specs:");
  });

  test("SCN-DIST-017-4 json", async () => {
    p = new Project(NO_ID_FIXTURE);
    const before = tracked(p);
    const r = await p.run("init", "--json");
    expect(r.code, r.err).toBe(0);
    const j = JSON.parse(r.out);
    expect(j.needs_id).toBe(20);
    expect(j.next).toBe("specctx adopt");
    expect(Object.keys(j)).not.toContain("files");
    expect(Object.keys(j)).not.toContain("caps");
    expect(tracked(p)).toEqual(before);
  });

  test("SCN-DIST-017-5 run prefix and a kept file", async () => {
    p = new Project(NO_ID_FIXTURE);
    p.write("spec-ctx.toml", '[cli]\nrun = "bunx spec-ctx"\n');
    const r = await p.run("init");
    expect(r.code, r.err).toBe(0);
    expect(lastLine(r.out)).toBe("next: bunx spec-ctx adopt");
    p.cleanup();
    p = new Project(NO_ID_FIXTURE);
    p.write(".claude/skills/specctx-done/SKILL.md", "my own\n");
    const k = await p.run("init", "--all");
    expect(k.code, k.err).toBe(0);
    expect(k.out).toContain("specs: 20 headers");
    expect(lastLine(k.out)).toBe("next: specctx init --all --force");
  });
});
