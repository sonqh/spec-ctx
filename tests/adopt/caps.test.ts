// Covers: REQ-ADOPT-004, REQ-ADOPT-012, SCN-ADOPT-012-1, SCN-ADOPT-012-2, SCN-ADOPT-012-3
import { afterEach, describe, expect, test } from "vitest";
import { parse } from "smol-toml";
import { withCaps } from "../../src/adopt/config-write.ts";
import { codeCandidates, deriveCode, familyCode } from "../../src/adopt/plan.ts";
import { INIT_TEXT, loadConfig } from "../../src/config.ts";
import { NO_ID_FIXTURE, Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const SPEC = (name: string) => `# ${name}\n\n## Purpose\nThe ${name} capability for a test of code derivation.\n\n## Requirements\n\n### Requirement: First\nThe tool SHALL work.\n\n#### Scenario: Works\n- **WHEN** a\n- **THEN** b\n`;

async function codes(pr: Project): Promise<Record<string, string>> {
  const j = JSON.parse((await pr.run("adopt", "--dry-run", "--json")).out);
  return Object.fromEntries(j.caps.map((c: { code: string; path: string }) => [c.path, c.code]));
}

describe("CAP derivation", () => {
  test("SCN-ADOPT-004-1 user-auth and profile-schema give UA and PS", async () => {
    p = new Project(NO_ID_FIXTURE);
    expect(await codes(p)).toEqual({ "profile-schema": "PS", "user-auth": "UA" });
  });

  test("SCN-ADOPT-004-2 a collision takes two letters of the first segment", async () => {
    p = new Project(NO_ID_FIXTURE);
    p.write("openspec/specs/upload-api/spec.md", SPEC("upload-api"));
    const c = await codes(p);
    expect(c["user-auth"]).toBe("UA");
    expect(c["upload-api"]).toBe("UPA");
  });

  test("SCN-ADOPT-004-3 a one segment name takes three letters", async () => {
    p = new Project(NO_ID_FIXTURE);
    p.write("openspec/specs/telemetry/spec.md", SPEC("telemetry"));
    expect((await codes(p)).telemetry).toBe("TEL");
  });

  test("the candidate order, then a suffix letter, and never a digit", () => {
    expect(codeCandidates("upload-api").slice(0, 4)).toEqual(["UA", "UPA", "UPLA", "UAB"]);
    expect(deriveCode("user-auth", new Set(["UA", "USA", "USEA"]))).toBe("UAB");
    expect(deriveCode("telemetry", new Set(["TEL"]))).toBe("TE");
    for (const c of codeCandidates("a-b-c-d-e-f-g-h")) expect(c).toMatch(/^[A-Z]{2,6}$/);
    expect(codeCandidates("a-b-c-d-e-f-g-h")[0]).toBe("ABCDEF");
  });

  test("SCN-ADOPT-012-1 a family of three takes family codes", async () => {
    p = new Project(NO_ID_FIXTURE);
    for (const c of ["cli-config", "cli-completion", "cli-version"]) p.write(`openspec/specs/${c}/spec.md`, SPEC(c));
    const c = await codes(p);
    expect(c["cli-config"]).toBe("CLICON");
    expect(c["cli-completion"]).toBe("CLICOM");
    expect(c["cli-version"]).toBe("CLIVER");
    expect(c["user-auth"]).toBe("UA");
    const r = await p.run("adopt", "--dry-run");
    expect(r.out).toContain("family: cli  prefix CLI  3 codes");
    const j = JSON.parse((await p.run("adopt", "--dry-run", "--json")).out);
    expect(j.families).toEqual([{ segment: "cli", prefix: "CLI", count: 3 }]);
    const w = JSON.parse((await p.run("adopt", "--json")).out);
    expect(w.families).toEqual([{ segment: "cli", prefix: "CLI", count: 3 }]);
    expect(p.read("adopt-report.md")).toContain("- `cli`: prefix `CLI`, 3 codes");
  });

  test("SCN-ADOPT-012-2 two members are no family", async () => {
    p = new Project(NO_ID_FIXTURE);
    p.write("openspec/specs/user-profile/spec.md", SPEC("user-profile"));
    const c = await codes(p);
    expect(c["user-auth"]).toBe("UA");
    expect(c["user-profile"]).toBe("UP");
  });

  test("SCN-ADOPT-012-3 a collision in a family falls through", async () => {
    p = new Project(NO_ID_FIXTURE);
    for (const c of ["cli-config", "cli-configure", "cli-version"]) p.write(`openspec/specs/${c}/spec.md`, SPEC(c));
    const c = await codes(p);
    expect(c["cli-config"]).toBe("CLICON");
    expect(c["cli-configure"]).toBe("CC");
    expect(c["cli-version"]).toBe("CLIVER");
  });

  test("REQ-ADOPT-012 the family code and the candidate order", () => {
    expect(familyCode("cli-config")).toBe("CLICON");
    expect(familyCode("cli")).toBeNull();
    expect(familyCode("2024-a")).toBeNull();
    expect(familyCode("opsx-apply-skill")).toBe("OPSAPP");
    expect(codeCandidates("cli-config", true).slice(0, 2)).toEqual(["CLICON", "CC"]);
    expect(codeCandidates("cli-config").slice(0, 1)).toEqual(["CC"]);
    expect(deriveCode("cli-config", new Set(["CLICON"]), true)).toBe("CC");
  });

  test("a code from [ids.paths] wins over derivation", async () => {
    p = new Project(NO_ID_FIXTURE);
    p.write("spec-ctx.toml", '[ids]\ncaps = ["AUTH"]\n\n[ids.paths]\nAUTH = "user-auth"\n');
    expect((await codes(p))["user-auth"]).toBe("AUTH");
  });

  test("withCaps adds the codes and the paths and keeps every comment", () => {
    const text = withCaps(INIT_TEXT, [{ code: "UA", path: "user-auth" }, { code: "PS", path: "profile-schema" }]);
    for (const line of INIT_TEXT.split("\n")) if (line.startsWith("#")) expect(text).toContain(line);
    const t = parse(text) as { ids: { caps: string[]; paths: Record<string, string> } };
    expect(t.ids.caps).toEqual(["UA", "PS"]);
    expect(t.ids.paths).toEqual({ UA: "user-auth", PS: "profile-schema" });
    // a second call with the same codes changes nothing
    expect(withCaps(text, [{ code: "UA", path: "user-auth" }])).toBe(text);
    const more = withCaps('[scan]\nignore = []\n\n[ids]\ncaps = ["AB"]\n\n[bundle]\nbudget = 9\n', [{ code: "UA", path: "user-auth" }]);
    expect(parse(more)).toEqual({ scan: { ignore: [] }, ids: { caps: ["AB", "UA"], paths: { UA: "user-auth" } }, bundle: { budget: 9 } });
  });

  test("loadConfig reads [ids.paths]", () => {
    p = new Project(null);
    p.write("spec-ctx.toml", withCaps(INIT_TEXT, [{ code: "UA", path: "user-auth" }]));
    expect(loadConfig(p.root).ids.paths).toEqual({ UA: "user-auth" });
  });
});
