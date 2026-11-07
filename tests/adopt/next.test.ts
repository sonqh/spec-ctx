// Covers: REQ-ADOPT-011, REQ-ADOPT-002
import { afterEach, describe, expect, test } from "vitest";
import { NO_ID_FIXTURE, Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const GATE = (run: string): string => `To gate the old debt later, run ${run} baseline write and commit it with a subject that starts with baseline:`;

describe("REQ-ADOPT-011 context after adopt", () => {
  test("SCN-ADOPT-011-1 an open task", async () => {
    p = new Project(NO_ID_FIXTURE);
    const r = await p.run("adopt");
    expect(r.code, r.err).toBe(0);
    const lines = r.out.trimEnd().split("\n");
    expect(lines.at(-1)).toBe("next: specctx context add-mfa/1.3");
    expect(lines.at(-2)).toBe(GATE("specctx"));
  });

  test("SCN-ADOPT-011-1 the run prefix", async () => {
    p = new Project(NO_ID_FIXTURE);
    p.write("spec-ctx.toml", '[cli]\nrun = "node dist/cli.js"\n');
    const lines = (await p.run("adopt")).out.trimEnd().split("\n");
    expect(lines.at(-1)).toBe("next: node dist/cli.js context add-mfa/1.3");
    expect(lines.at(-2)).toBe(GATE("node dist/cli.js"));
  });

  test("SCN-ADOPT-011-2 no open task", async () => {
    p = new Project(NO_ID_FIXTURE);
    const f = "openspec/changes/add-mfa/tasks.md";
    p.write(f, p.read(f).replace("- [ ] 1.3", "- [x] 1.3"));
    const r = await p.run("adopt");
    expect(r.code, r.err).toBe(0);
    const lines = r.out.trimEnd().split("\n");
    expect(lines.at(-1)).toBe("next: specctx status");
    expect(lines.at(-2)).toBe(GATE("specctx"));
  });

  test("SCN-ADOPT-011-3 nothing written", async () => {
    p = new Project(NO_ID_FIXTURE);
    const dry = await p.run("adopt", "--dry-run");
    expect(dry.out).not.toContain("context");
    expect(dry.out).not.toContain("baseline write");
    await p.run("adopt");
    const again = await p.run("adopt");
    expect(again.out).not.toContain("context");
    expect(again.out).not.toContain("baseline write");
  });
});
