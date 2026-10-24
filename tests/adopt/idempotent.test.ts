// Covers: REQ-ADOPT-003
import { afterEach, describe, expect, test } from "vitest";
import { NO_ID_FIXTURE, Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

describe("adopt is idempotent", () => {
  test("SCN-ADOPT-003-1 a second run changes no file", async () => {
    p = new Project(NO_ID_FIXTURE);
    expect((await p.run("adopt")).code).toBe(0);
    const first = p.snapshot();
    first.delete(".ctx/index.json");
    const r = await p.run("adopt");
    expect(r).toMatchObject({ code: 0, out: "nothing to adopt\n" });
    const second = p.snapshot();
    second.delete(".ctx/index.json");
    expect(second).toEqual(first);
    expect((await p.run("adopt", "--dry-run")).out).toBe("nothing to adopt\n");
  });

  test("a header that starts with an ID is never rewritten", async () => {
    p = new Project(NO_ID_FIXTURE);
    p.write("openspec/specs/profile-schema/spec.md", p.read("openspec/specs/profile-schema/spec.md").replace("### Requirement: Required name", "### Requirement: REQ-PS-007 Required name"));
    const r = await p.run("adopt", "--dry-run");
    expect(r.out).not.toContain("REQ-PS-007 Required name  ->");
    expect(r.out).toContain("### Requirement: Unknown keys  ->  ### Requirement: REQ-PS-008 Unknown keys");
    expect(r.out).toContain("#### Scenario: Missing name  ->  #### Scenario: SCN-PS-007-1 Missing name");
  });
});
