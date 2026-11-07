// Covers: REQ-QRY-028, REQ-QRY-029, REQ-QRY-030, SCN-QRY-029-2, SCN-QRY-029-3, SCN-QRY-030-2
import { mkdtempSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Project, TAG } from "../helpers.ts";

let p: Project;
const savedGuard = process.env.SPECCTX_RERUN;
const req = (n: string) => `### Requirement: REQ-AB-${n} Thing ${n}\nText ${n}.\n\n#### Scenario: SCN-AB-${n}-1 Case\n- a\n\n`;
beforeAll(async () => {
  delete process.env.SPECCTX_RERUN;
  p = new Project(null);
  p.write("openspec/specs/ab/spec.md", req("001"));
  p.write("src/a.ts", `${TAG}AB-001 tag\n`);
  p.write("src/none.ts", "const n = 1;\n");
  p.write("openspec/changes/001-x/tasks.md", "# Tasks\n\n- [ ] 1.1 Work. [REQ-AB-001] Verify: `true`\n");
  const lines = Array.from({ length: 12 }, (_, n) => `- [x] 1.${n + 1} T${n}. [REQ-AB-001] Verify: \`echo ${String(n).padStart(2, "0")}\``).join("\n");
  p.write("openspec/changes/archive/2026-10-01-000-old/tasks.md", `# Tasks\n\n${lines}\n`);
  await p.build();
});
afterAll(() => {
  if (savedGuard === undefined) delete process.env.SPECCTX_RERUN;
  else process.env.SPECCTX_RERUN = savedGuard;
  p.cleanup();
});

describe("impact command", () => {
  test("the text has the sections, the more line, and the archived line", async () => {
    const r = await p.run("impact", "src/a.ts");
    expect(r.code, r.err).toBe(0);
    const ls = r.out.trimEnd().split("\n");
    expect(ls[0]).toBe("impact src/a.ts");
    expect(ls).toContain("requirements (1)");
    expect(ls.some((l) => l.startsWith("  REQ-AB-001  unverified  implements, tag at src/a.ts:1  "))).toBe(true);
    expect(ls).toContain("tasks (1)");
    expect(ls.some((l) => l.startsWith("  001/1.1  open  no evidence  REQ-AB-001  "))).toBe(true);
    expect(ls).toContain("verify (10)");
    expect(ls).toContain("  true");
    expect(ls).toContain("3 more. Use --all.");
    expect(ls[ls.length - 1]).toBe("archived: 12 tasks, 0 Verify commands dropped. Use --archived to list the tasks.");
  });

  test("SCN-QRY-030-2 --all shows every command and --archived lists the tasks", async () => {
    const all = (await p.run("impact", "src/a.ts", "--all")).out;
    expect(all).toContain("verify (13)");
    expect(all).not.toContain("more. Use --all.");
    const arch = (await p.run("impact", "src/a.ts", "--archived")).out;
    expect(arch).toContain("tasks (13)");
    expect(arch).toContain("  000/1.1  done  no evidence  archived  REQ-AB-001  ");
    expect(arch).toContain("archived: 12 tasks listed, 0 Verify commands dropped.");
  });

  test("SCN-QRY-029-3 --json carries the same facts", async () => {
    const r = await p.run("impact", "src/a.ts", "--json");
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out);
    expect(Object.keys(j).sort()).toEqual(["archived", "file", "more", "requirements", "tasks", "verify"]);
    expect(j.file).toBe("src/a.ts");
    expect(j.requirements[0].id).toBe("REQ-AB-001");
    expect(j.tasks.map((t: any) => t.id)).toEqual(["001/1.1"]);
    expect(j.verify).toHaveLength(10);
    expect(j.more).toBe(3);
    expect(j.archived).toEqual({ tasks: 12, dropped: 0, listed: false });
  });

  test("SCN-QRY-029-2 a file with no edge prints no links and exits 0", async () => {
    const r = await p.run("impact", "src/none.ts");
    expect(r.code).toBe(0);
    expect(r.out).toBe("no links: src/none.ts\n");
  });

  test("SCN-QRY-029-2 a missing file, a directory, and an outside path exit 2 as related does", async () => {
    const out = mkdtempSync(join(tmpdir(), "specctx-out-"));
    symlinkSync(join(out), p.path("src/link"));
    for (const arg of ["src/zz.ts", "src", join(out), "src/link"]) {
      const r = await p.run("impact", arg);
      const rel = await p.run("related", arg);
      expect(r.code, arg).toBe(2);
      expect(r.err, arg).toBe(rel.err);
    }
  });

  test("it takes one file", async () => {
    expect((await p.run("impact")).code).toBe(2);
    const two = await p.run("impact", "src/a.ts", "src/none.ts");
    expect(two.code).toBe(2);
    expect(two.err).toContain("impact takes one file");
  });
});
