// Covers: REQ-QRY-005, REQ-QRY-008, SCN-QRY-005-1, SCN-QRY-005-2, SCN-QRY-005-3, SCN-QRY-008-1, SCN-QRY-008-2, SCN-QRY-008-3, SCN-QRY-008-4
import { mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { COVERS, Project, TAG } from "../helpers.ts";

let p: Project;
const savedGuard = process.env.SPECCTX_RERUN;
beforeAll(async () => {
  delete process.env.SPECCTX_RERUN;
  p = new Project(null);
  const req = (n: string) => `### Requirement: REQ-AB-${n} Thing ${n}\nText ${n}.\n\n#### Scenario: SCN-AB-${n}-1 Case\n- a\n\n`;
  p.write("openspec/specs/ab/spec.md", req("001") + req("002"));
  p.write("src/a.ts", `${TAG}AB-001, REQ-AB-002 note\n`);
  p.write("src/b.ts", "const y = 2;\n");
  p.write("tests/a.test.ts", `// ${COVERS}REQ-AB-001\n`);
  p.write("openspec/changes/001-x/tasks.md", "# Tasks\n\n- [ ] 1.1 Edit `src/b.ts`. [REQ-AB-002] Verify: `true`\n");
  await p.build();
});
afterAll(() => {
  if (savedGuard === undefined) delete process.env.SPECCTX_RERUN;
  else process.env.SPECCTX_RERUN = savedGuard;
  p.cleanup();
});
const lines = (s: string) => s.trimEnd().split("\n").filter(Boolean);

describe("related by path", () => {
  test("SCN-QRY-005-1 lists the REQs, the scenarios, and the task, in the format of related <ID>", async () => {
    const r = await p.run("related", "src/a.ts");
    expect(r.code, r.err).toBe(0);
    const ls = lines(r.out);
    expect(ls).toContain("req  REQ-AB-001  active  openspec/specs/ab/spec.md:1  implements, tag at src/a.ts:1");
    expect(ls).toContain("req  REQ-AB-002  active  openspec/specs/ab/spec.md:7  implements, tag at src/a.ts:1");
    expect(ls.some((l) => l.startsWith("scn  SCN-AB-001-1  ") && l.endsWith("scenario of REQ-AB-001"))).toBe(true);
    expect(ls.some((l) => l.startsWith("task  001/1.1  ") && l.endsWith("task cites REQ-AB-002"))).toBe(true);
    expect(ls.some((l) => l.startsWith("code  ") || l.startsWith("test  "))).toBe(false);
    for (const l of ls) expect(l.split("  ").length, l).toBe(5);
  });

  test("a test file shows covers and a task file shows mentions", async () => {
    const t = lines((await p.run("related", "tests/a.test.ts")).out);
    expect(t).toContain("req  REQ-AB-001  active  openspec/specs/ab/spec.md:1  covers, tag at tests/a.test.ts:1");
    const m = lines((await p.run("related", "src/b.ts")).out);
    expect(m.some((l) => l.startsWith("task  001/1.1  ") && l.endsWith("mentions, in task line"))).toBe(true);
  });

  test("--depth 0 lists the direct links only and --json carries the reason", async () => {
    const d0 = lines((await p.run("related", "src/a.ts", "--depth", "0")).out);
    expect(d0.map((l) => l.split("  ")[1])).toEqual(["REQ-AB-001", "REQ-AB-002"]);
    const j = JSON.parse((await p.run("related", "src/a.ts", "--depth", "0", "--json")).out);
    expect(j.map((e: any) => e.reason)).toEqual(["implements, tag at src/a.ts:1", "implements, tag at src/a.ts:1"]);
  });

  test("SCN-QRY-005-3 an absolute path, a path from a subfolder, and ./ give the same output", async () => {
    const want = (await p.run("related", "src/a.ts")).out;
    expect((await p.run("related", p.path("src/a.ts"))).out).toBe(want);
    expect((await p.run("related", "./src/a.ts")).out).toBe(want);
    expect((await p.runIn(p.path("src"), "related", "a.ts")).out).toBe(want);
    expect((await p.runIn(p.path("src"), "related", "../src/a.ts")).out).toBe(want);
  });

  test("an ID wins over a path of the same text", async () => {
    const r = await p.run("related", "REQ-AB-001");
    expect(lines(r.out).some((l) => l.startsWith("code  src/a.ts:1  ") && l.endsWith("implements REQ-AB-001"))).toBe(true);
    expect(lines(r.out).some((l) => l.endsWith("implements, tag at src/a.ts:1"))).toBe(false);
  });
});

describe("bundle by path", () => {
  test("SCN-QRY-005-2 prints the blocks with the reason of the file", async () => {
    const r = await p.run("bundle", "src/a.ts");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toContain("-- REQ-AB-001 | openspec/specs/ab/spec.md:1 | active | implements, tag at src/a.ts:1\n### Requirement: REQ-AB-001");
    expect(r.out).toContain("-- REQ-AB-002 |");
    expect(r.out).not.toContain("| requested");
  });

  test("an ID and a path together keep the requested block", async () => {
    const r = await p.run("bundle", "src/b.ts", "REQ-AB-001");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toContain("| requested\n### Requirement: REQ-AB-001");
    expect(r.out).toContain("mentions, in task line");
  });

  test("--block rejects a path and names it", async () => {
    const r = await p.run("bundle", "src/a.ts", "--block");
    expect(r.code).toBe(2);
    expect(r.err).toBe("not a requirement: src/a.ts\n");
  });

  test("bundle of a path with no links prints no links", async () => {
    p.write("README.md", "hello\n");
    const r = await p.run("bundle", "README.md");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toBe("no links: README.md\n");
  });
});

describe("errors and no links", () => {
  test("SCN-QRY-008-1 a missing file exits 2 with one line that names it", async () => {
    for (const cmd of ["related", "bundle"]) {
      const r = await p.run(cmd, "src/none.ts");
      expect(r.code).toBe(2);
      expect(r.out).toBe("");
      expect(r.err).toBe("no such file: src/none.ts\n");
    }
  });

  test("SCN-QRY-008-2 a directory and a path outside the root exit 2", async () => {
    const dir = await p.run("related", "src");
    expect([dir.code, dir.err]).toEqual([2, "not a file: src\n"]);
    const outside = mkdtempSync(join(tmpdir(), "specctx-out-"));
    writeFileSync(join(outside, "x.ts"), "x\n");
    const abs = await p.run("related", join(outside, "x.ts"));
    expect([abs.code, abs.err]).toEqual([2, `outside the repository: ${join(outside, "x.ts")}\n`]);
    const up = await p.run("related", "../../../../../etc/hosts");
    expect(up.code).toBe(2);
    expect(up.err.trimEnd().split("\n").length).toBe(1);
    expect(up.err).toContain("etc/hosts");
  });

  test("a link inside the root that points outside it exits 2", async () => {
    const outside = mkdtempSync(join(tmpdir(), "specctx-out-"));
    writeFileSync(join(outside, "y.ts"), "y\n");
    symlinkSync(join(outside, "y.ts"), p.path("src/link.ts"));
    await p.build();
    const r = await p.run("related", "src/link.ts");
    expect([r.code, r.err]).toEqual([2, "outside the repository: src/link.ts\n"]);
  });

  test("SCN-QRY-008-3 a file with no links prints no links and exits 0", async () => {
    p.write("docs/none.md", "text\n");
    const r = await p.run("related", "docs/none.md");
    expect([r.code, r.out, r.err]).toEqual([0, "no links: docs/none.md\n", ""]);
    const j = await p.run("related", "docs/none.md", "--json");
    expect([j.code, JSON.parse(j.out)]).toEqual([0, []]);
  });

  test("SCN-QRY-008-4 an unknown ID keeps its line", async () => {
    for (const cmd of ["related", "bundle"]) {
      const r = await p.run(cmd, "REQ-NOPE-001");
      expect(r.code).toBe(2);
    }
    expect((await p.run("related", "REQ-NOPE-001")).err).toBe("unknown id REQ-NOPE-001\n");
    expect((await p.run("related", "001/9.9")).err).toBe("unknown id 001/9.9\n");
    expect((await p.run("bundle", "REQ-NOPE-001")).err).toBe("unknown id(s): REQ-NOPE-001\n");
  });

  test("related takes one input and bundle needs one", async () => {
    expect((await p.run("related", "src/a.ts", "src/b.ts")).code).toBe(2);
    expect((await p.run("related")).code).toBe(2);
    expect((await p.run("bundle")).code).toBe(2);
  });
});
