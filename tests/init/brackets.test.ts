// Covers: REQ-SCH-006, REQ-SCH-003
import { afterEach, describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { INIT_TEXT } from "../../src/config.ts";
import { bracketForm } from "../../src/init/init.ts";
import { Project, REPO } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const TPL = "openspec/templates/spec-driven-ids";
const BUNDLE = join(REPO, "schemas/spec-driven-ids");
const FILES = ["design.md", "proposal.md", "spec.md", "tasks.md"];
const CONFIG = "schema: spec-driven\n";
/** A code tag of the fragment examples, built so the scan does not read it as a link. */
const TAG = "// " + "REQ-ABC-001";

/** A fresh project with spec-ctx.toml and the given brackets value, or no spec-ctx.toml when null. */
function project(brackets: boolean | null): Project {
  const pr = new Project(null);
  pr.write("openspec/config.yaml", CONFIG);
  if (brackets !== null) pr.write("spec-ctx.toml", INIT_TEXT.replace("\nbrackets = false\n", `\nbrackets = ${brackets}\n`));
  return pr;
}

const bundle = (f: string): string => readFileSync(join(BUNDLE, f), "utf8");

describe("bracketForm", () => {
  test("wraps the header ID and nothing else", () => {
    expect(bracketForm("### Requirement: REQ-<CAP>-NNN <!-- x -->")).toBe("### Requirement: [REQ-<CAP>-NNN] <!-- x -->");
    expect(bracketForm("#### Scenario: SCN-<CAP>-NNN-1 <!-- --for REQ-<CAP>-NNN -->")).toBe("#### Scenario: [SCN-<CAP>-NNN-1] <!-- --for REQ-<CAP>-NNN -->");
    expect(bracketForm(`- 'e.g. "### Requirement: REQ-ABC-001 Name".'`)).toBe(`- 'e.g. "### Requirement: [REQ-ABC-001] Name".'`);
    expect(bracketForm("### Requirement: [REQ-ABC-001] Name")).toBe("### Requirement: [REQ-ABC-001] Name");
    expect(bracketForm(`- [ ] 1.1 x [REQ-<CAP>-NNN] Verify: \`c\`\nRefs: REQ-ABC-002\n${TAG}`)).toBe(`- [ ] 1.1 x [REQ-<CAP>-NNN] Verify: \`c\`\nRefs: REQ-ABC-002\n${TAG}`);
  });
});

describe("init --schema with brackets", () => {
  // SCN-SCH-006-1
  test("brackets = true installs bracketed header placeholders and bare task citations", async () => {
    p = project(true);
    const r = await p.run("init", "--schema");
    expect(r.code).toBe(0);
    const spec = p.read(`${TPL}/spec.md`);
    expect(spec).toMatch(/^### Requirement: \[REQ-<CAP>-NNN\] /m);
    expect(spec).toMatch(/^#### Scenario: \[SCN-<CAP>-NNN-1\] /m);
    expect(spec).not.toMatch(/^### Requirement: REQ-/m);
    expect(spec).not.toMatch(/^#### Scenario: SCN-/m);
    const tasks = p.read(`${TPL}/tasks.md`);
    expect(tasks).toBe(bundle("templates/tasks.md"));
    expect(tasks).toContain(" [REQ-<CAP>-NNN] Verify:");
    expect(tasks).not.toContain("[[");
    expect(p.read(`${TPL}/design.md`)).toBe(bundle("templates/design.md"));
    expect(p.read(`${TPL}/proposal.md`)).toBe(bundle("templates/proposal.md"));
  });

  // SCN-SCH-006-2
  test("brackets = true merges bracketed header examples and leaves the other items as the fragment", async () => {
    p = project(true);
    await p.run("init", "--schema");
    const cfg = p.read("openspec/config.yaml");
    expect(cfg).toContain('"### Requirement: [REQ-ABC-001] Name"');
    expect(cfg).toContain('"#### Scenario: [SCN-ABC-001-1] Name"');
    expect(cfg).not.toContain('"### Requirement: REQ-ABC-001 Name"');
    expect(cfg).not.toContain('"#### Scenario: SCN-ABC-001-1 Name"');
    const frag = bundle("config-fragment.yaml");
    for (const line of frag.split("\n")) {
      if (/^\s+- /.test(line) && !/(Requirement|Scenario): (REQ|SCN)-/.test(line)) expect(cfg).toContain(line.trim());
    }
    expect(cfg).toContain("[REQ-ABC-001]\".'");
    expect(cfg).toContain(TAG);
  });

  // SCN-SCH-006-3
  for (const v of [false, null]) {
    test(`brackets ${v === null ? "absent" : "= false"} installs the bundle bytes`, async () => {
      p = project(v);
      await p.run("init", "--schema");
      for (const f of FILES) expect(p.read(`${TPL}/${f}`)).toBe(bundle(`templates/${f}`));
      const cfg = p.read("openspec/config.yaml");
      for (const line of bundle("config-fragment.yaml").split("\n")) if (/^\s+- /.test(line)) expect(cfg).toContain(line);
    });
  }
});

// Covers: REQ-SCH-007, REQ-DIST-002
describe("flip the bracket form", () => {
  const flip = (pr: Project, v: boolean): void => pr.write("spec-ctx.toml", pr.read("spec-ctx.toml").replace(/\nbrackets = \w+\n/, `\nbrackets = ${v}\n`));

  // SCN-SCH-007-1
  test("an unchanged bare template gets the bracketed form", async () => {
    p = project(false);
    await p.run("init", "--schema");
    flip(p, true);
    const r = await p.run("init", "--schema");
    expect(r.code).toBe(0);
    expect(p.read(`${TPL}/spec.md`)).toBe(bracketForm(bundle("templates/spec.md")));
    expect(r.out).toContain(`wrote ${TPL}/spec.md\n`);
    expect(r.out).not.toMatch(/^kept .*spec\.md/m);
    // and back
    flip(p, false);
    const back = await p.run("init", "--schema");
    expect(back.out).toContain(`wrote ${TPL}/spec.md\n`);
    expect(p.read(`${TPL}/spec.md`)).toBe(bundle("templates/spec.md"));
  });

  // SCN-SCH-007-2
  test("an edited template stays without --force", async () => {
    p = project(false);
    await p.run("init", "--schema");
    p.append(`${TPL}/spec.md`, "\nmy note\n");
    const mine = p.read(`${TPL}/spec.md`);
    flip(p, true);
    const r = await p.run("init", "--schema");
    expect(p.read(`${TPL}/spec.md`)).toBe(mine);
    expect(r.out).toContain(`kept ${TPL}/spec.md (other content)\n`);
    expect(r.out).toContain("next: specctx init --schema --force");
  });

  // SCN-SCH-007-3
  test("the bare header rules get the bracketed text at the same line", async () => {
    p = project(false);
    await p.run("init", "--schema");
    const before = p.read("openspec/config.yaml").split("\n");
    flip(p, true);
    const r = await p.run("init", "--schema");
    expect(r.out).toContain("merged openspec/config.yaml rules (2 replaced)\n");
    const after = p.read("openspec/config.yaml").split("\n");
    expect(after.length).toBe(before.length);
    const diff = before.map((l, i) => [l, after[i]!] as const).filter(([a, b]) => a !== b);
    expect(diff.length).toBe(2);
    for (const [a, b] of diff) expect(b).toBe(bracketForm(a));
    const cfg = after.join("\n");
    expect(cfg).not.toContain('"### Requirement: REQ-ABC-001 Name"');
    expect(cfg).not.toContain('"#### Scenario: SCN-ABC-001-1 Name"');
  });

  // SCN-SCH-007-4
  test("a second run after a flip does nothing", async () => {
    p = project(false);
    await p.run("init", "--schema");
    flip(p, true);
    await p.run("init", "--schema");
    const snap = [...FILES.map((f) => p.read(`${TPL}/${f}`)), p.read("openspec/config.yaml"), p.read("spec-ctx.toml")];
    const r = await p.run("init", "--schema");
    expect(r.out.split("\n")[0]).toBe("nothing to do");
    expect([...FILES.map((f) => p.read(`${TPL}/${f}`)), p.read("openspec/config.yaml"), p.read("spec-ctx.toml")]).toEqual(snap);
  });
});
