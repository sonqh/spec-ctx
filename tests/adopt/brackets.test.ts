// Covers: REQ-ADOPT-010
import { afterEach, describe, expect, test } from "vitest";
import { loadConfig } from "../../src/config.ts";
import { NO_ID_FIXTURE, Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const MAIN = "openspec/specs/user-auth/spec.md";
const DELTA = "openspec/changes/add-mfa/specs/user-auth/spec.md";
const BRACKETS = "[ids]\nbrackets = true\n";

function snap(pr: Project): Map<string, string> {
  const s = pr.snapshot();
  s.delete(".ctx/index.json");
  return s;
}

describe("[ids] brackets (027/D2, 027/D3)", () => {
  test("the key is a boolean with the default false", () => {
    p = new Project(null);
    expect(loadConfig(p.root).ids.brackets).toBe(false);
    p.write("spec-ctx.toml", BRACKETS);
    expect(loadConfig(p.root).ids.brackets).toBe(true);
    p.write("spec-ctx.toml", '[ids]\nbrackets = "yes"\n');
    expect(() => loadConfig(p.root)).toThrow("spec-ctx.toml: ids.brackets must be true or false.");
  });

  test("SCN-ADOPT-010-1 the default writes the bare form", async () => {
    p = new Project(NO_ID_FIXTURE);
    expect((await p.run("adopt")).code).toBe(0);
    expect(p.read(MAIN)).toContain("### Requirement: REQ-UA-001 Session timeout\n");
    expect(p.read(MAIN)).toContain("#### Scenario: SCN-UA-001-1 Idle session\n");
    expect(p.read(MAIN)).not.toContain("[REQ-");
  });

  test("SCN-ADOPT-010-2 true writes the bracketed form in the plan and in the files", async () => {
    p = new Project(NO_ID_FIXTURE);
    p.write("spec-ctx.toml", BRACKETS);
    const dry = await p.run("adopt", "--dry-run");
    expect(dry.code).toBe(1);
    expect(dry.out).toContain(`${MAIN}:8  ### Requirement: Session timeout  ->  ### Requirement: [REQ-UA-001] Session timeout\n`);
    expect(dry.out).toContain("#### Scenario: Idle session  ->  #### Scenario: [SCN-UA-001-1] Idle session\n");
    const r = await p.run("adopt");
    expect(r.code, r.out + r.err).toBe(0);
    const main = p.read(MAIN);
    expect(main).toContain("### Requirement: [REQ-UA-001] Session timeout\n");
    expect(main).toContain("#### Scenario: [SCN-UA-001-1] Idle session\n");
    const delta = p.read(DELTA);
    expect(delta).toContain("### Requirement: [REQ-UA-001] Session timeout\n");
    expect(delta).toContain("- FROM: `### Requirement: [REQ-UA-003] Remember device`\n");
    expect(delta).toContain("- TO: `### Requirement: [REQ-UA-003] Trusted device`\n");
    // the key stays in spec-ctx.toml next to the codes that adopt wrote
    expect(loadConfig(p.root).ids.brackets).toBe(true);
    // adopt added no finding, so check shows only the legacy tasks of the fixture
    const c = await p.run("check");
    expect(c.out).not.toMatch(/missing-id|duplicate-id|scenario-id-mismatch|retitle-needs-renamed/);
  });

  test("SCN-ADOPT-010-3 a second run with true on a bare adopted tree changes nothing", async () => {
    p = new Project(NO_ID_FIXTURE);
    expect((await p.run("adopt")).code).toBe(0);
    p.write("spec-ctx.toml", p.read("spec-ctx.toml").replace(/^brackets = false$/m, "brackets = true"));
    expect(loadConfig(p.root).ids.brackets).toBe(true);
    const first = snap(p);
    expect(await p.run("adopt")).toMatchObject({ code: 0, out: "nothing to adopt\n" });
    expect(snap(p)).toEqual(first);
    expect((await p.run("adopt", "--dry-run")).out).toBe("nothing to adopt\n");
  });

  test("a RENAMED FROM line keeps the form of a main header that has an ID", async () => {
    p = new Project(NO_ID_FIXTURE);
    p.write("spec-ctx.toml", BRACKETS);
    p.write(MAIN, p.read(MAIN).replace("### Requirement: Remember device", "### Requirement: REQ-UA-009 Remember device"));
    const r = await p.run("adopt", "--dry-run");
    expect(r.out).toContain("->  - FROM: `### Requirement: REQ-UA-009 Remember device`\n");
    expect(r.out).toContain("->  - TO: `### Requirement: [REQ-UA-009] Trusted device`\n");
  });
});

describe("retitle of a bracketed header (027/D4)", () => {
  async function retitled(): Promise<Project> {
    const pr = new Project(NO_ID_FIXTURE);
    expect((await pr.run("init")).code).toBe(0);
    pr.write("spec-ctx.toml", pr.read("spec-ctx.toml").replace(/^brackets = false$/m, "brackets = true"));
    expect(loadConfig(pr.root).ids.brackets).toBe(true);
    expect((await pr.run("adopt")).code).toBe(0);
    expect((await pr.run("baseline", "write")).code).toBe(0);
    pr.write(DELTA, pr.read(DELTA).replace("### Requirement: [REQ-UA-001] Session timeout", "### Requirement: [REQ-UA-001] Idle timeout"));
    pr.touchForward(DELTA);
    return pr;
  }

  test("SCN-ADOPT-010-4 the finding fires with the hint, and a bracketed RENAMED pair clears it", async () => {
    p = await retitled();
    const r = await p.run("check");
    expect(r.code).toBe(1);
    const line = p.read(DELTA).split("\n").findIndex((l) => l === "### Requirement: [REQ-UA-001] Idle timeout") + 1;
    expect(r.out).toContain(`${DELTA}:${line}  retitle-needs-renamed  REQ-UA-001  "Session timeout" -> "Idle timeout"\n`);
    // REQ-CHK-006 the hint shows the bracketed form of both headers (031/D7)
    expect(r.out).toContain("retitle-needs-renamed  1  Add to the delta before the MODIFIED block:\n## RENAMED Requirements\n- FROM: `### Requirement: [REQ-UA-001] Session timeout`\n- TO: `### Requirement: [REQ-UA-001] Idle timeout`\n");
    const pair = "## RENAMED Requirements\n\n- FROM: `### Requirement: [REQ-UA-001] Session timeout`\n- TO: `### Requirement: [REQ-UA-001] Idle timeout`\n\n";
    p.write(DELTA, p.read(DELTA).replace("## MODIFIED Requirements\n", pair + "## MODIFIED Requirements\n"));
    p.touchForward(DELTA, 10000);
    const ok = await p.run("check");
    expect(ok.code, ok.out).toBe(0);
  });

  test("SCN-ADOPT-010-4 a bare main header and a bracketed delta compare by title", async () => {
    p = new Project(NO_ID_FIXTURE);
    expect((await p.run("adopt")).code).toBe(0);
    expect((await p.run("baseline", "write")).code).toBe(0);
    // the delta moves to the bracketed form with the same title: no retitle
    p.write(DELTA, p.read(DELTA).replace("### Requirement: REQ-UA-001 Session timeout", "### Requirement: [REQ-UA-001] Session timeout"));
    p.touchForward(DELTA);
    expect((await p.run("check")).code).toBe(0);
    // a new title in the bracketed form needs the pair, and a TO line in that form clears it
    p.write(DELTA, p.read(DELTA).replace("### Requirement: [REQ-UA-001] Session timeout", "### Requirement: [REQ-UA-001] Idle timeout"));
    p.touchForward(DELTA, 10000);
    expect((await p.run("check")).out).toContain("retitle-needs-renamed  REQ-UA-001");
    const pair = "## RENAMED Requirements\n\n- FROM: `### Requirement: REQ-UA-001 Session timeout`\n- TO: `### Requirement: [REQ-UA-001] Idle timeout`\n\n";
    p.write(DELTA, p.read(DELTA).replace("## MODIFIED Requirements\n", pair + "## MODIFIED Requirements\n"));
    p.touchForward(DELTA, 15000);
    const ok = await p.run("check");
    expect(ok.code, ok.out).toBe(0);
  });
});
