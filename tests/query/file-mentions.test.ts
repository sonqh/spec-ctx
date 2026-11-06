// Covers: REQ-QRY-021, SCN-QRY-021-4
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Project } from "../helpers.ts";

let p: Project;
const savedGuard = process.env.SPECCTX_RERUN;
beforeAll(async () => {
  delete process.env.SPECCTX_RERUN;
  p = new Project(null);
  p.write("openspec/specs/ab/spec.md", "### Requirement: REQ-AB-001 Thing\nText.\n");
  p.write("src/a.ts", "const x = 1;\n");
  p.write("openspec/changes/001-x/tasks.md", "# Tasks\n\n- [ ] 1.1 Edit `src/a.ts`. [REQ-AB-001] Verify: `true`\n");
  p.write(
    "openspec/changes/archive/2026-10-30-000-old/tasks.md",
    "# Tasks\n\n- [x] 1.1 Edit `src/a.ts`. [REQ-AB-001] Verify: `true`\n",
  );
  await p.build();
});
afterAll(() => {
  if (savedGuard === undefined) delete process.env.SPECCTX_RERUN;
  else process.env.SPECCTX_RERUN = savedGuard;
  p.cleanup();
});

describe("mentions of a file", () => {
  test("SCN-QRY-021-4 only an active task is a mention", async () => {
    const r = await p.run("related", "src/a.ts");
    expect(r.code, r.err).toBe(0);
    const tasks = r.out.split("\n").filter((l) => l.startsWith("task  "));
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toContain("001/1.1");
    expect(tasks[0]).toContain("mentions, in task line");
  });
});
