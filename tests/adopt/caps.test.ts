// Covers: REQ-ADOPT-004
import { afterEach, describe, expect, test } from "vitest";
import { parse } from "smol-toml";
import { withCaps } from "../../src/adopt/config-write.ts";
import { codeCandidates, deriveCode } from "../../src/adopt/plan.ts";
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
