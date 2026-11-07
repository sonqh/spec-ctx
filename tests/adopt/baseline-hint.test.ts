// Covers: REQ-ADOPT-002
import { afterEach, describe, expect, test } from "vitest";
import { existsSync } from "node:fs";
import { NO_ID_FIXTURE, Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const NOTE = "To gate the old debt later, run specctx baseline write and commit it with a subject that starts with baseline:";

describe("baseline step after adopt", () => {
  test("SCN-ADOPT-002-5 adopt writes no baseline and ends with the gate step and the context line", async () => {
    p = new Project(NO_ID_FIXTURE);
    const r = await p.run("adopt");
    expect(r.code, r.err).toBe(0);
    expect(existsSync(p.path(".ctx/baseline.json"))).toBe(false);
    const lines = r.out.trimEnd().split("\n");
    expect(lines.at(-1)).toBe("next: specctx context add-mfa/1.3");
    expect(lines.at(-2)).toBe(NOTE);
  });

  test("SCN-ADOPT-002-5 the line uses the run prefix", async () => {
    p = new Project(NO_ID_FIXTURE);
    p.write("spec-ctx.toml", '[cli]\nrun = "node dist/cli.js"\n');
    const r = await p.run("adopt");
    expect(r.code, r.err).toBe(0);
    const lines = r.out.trimEnd().split("\n");
    expect(lines.at(-1)).toBe("next: node dist/cli.js context add-mfa/1.3");
    expect(lines.at(-2)).toBe("To gate the old debt later, run node dist/cli.js baseline write and commit it with a subject that starts with baseline:");
  });

  test("SCN-ADOPT-002-6 no step when nothing was written", async () => {
    p = new Project(NO_ID_FIXTURE);
    const dry = await p.run("adopt", "--dry-run");
    expect(dry.out).not.toContain("baseline write");
    expect(dry.out).not.toContain("baseline:");
    await p.run("adopt");
    const again = await p.run("adopt");
    expect(again.out).toBe("nothing to adopt\n");
    expect(again.out).not.toContain("baseline");
    const json = await p.run("adopt", "--json");
    expect(json.out).not.toContain("baseline");
  });
});
