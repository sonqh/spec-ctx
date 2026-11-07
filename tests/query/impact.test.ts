// Covers: REQ-QRY-028, REQ-QRY-029, REQ-QRY-030, SCN-QRY-028-1, SCN-QRY-028-2, SCN-QRY-028-3, SCN-QRY-029-1, SCN-QRY-030-1, SCN-QRY-030-2, SCN-QRY-030-3
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { impactOf } from "../../src/graph/impact.ts";
import { COVERS, Project, TAG } from "../helpers.ts";

let p: Project;
const savedGuard = process.env.SPECCTX_RERUN;
const req = (n: string) => `### Requirement: REQ-AB-${n} Thing ${n}\nText ${n}.\n\n#### Scenario: SCN-AB-${n}-1 Case\n- a\n\n`;
const ARCH = "openspec/changes/archive/2026-10-01-000-old/tasks.md";

async function entries(q: Project): Promise<any[]> {
  return (await q.build()).entries;
}

beforeAll(async () => {
  delete process.env.SPECCTX_RERUN;
  p = new Project(null);
  p.write("openspec/specs/ab/spec.md", req("001") + req("002"));
  p.write("src/a.ts", `${TAG}AB-001 tag\n`);
  p.write("src/b.ts", "const b = 1;\n");
  p.write("src/s.ts", "const s = 1;\n");
  p.write("tests/a.test.ts", `// ${COVERS}REQ-AB-001\n`);
  p.write("tests/s.test.ts", `// ${COVERS}REQ-AB-001, SCN-AB-001-1\n`);
  p.write(
    "openspec/changes/001-x/tasks.md",
    "# Tasks\n\n- [ ] 1.1 Edit `src/b.ts`. [REQ-AB-002] Verify: `true`\n- [ ] 1.2 Tag work. [REQ-AB-001] Verify: `bun test tests/a.test.ts`\n- [ ] 1.3 Manual. [REQ-AB-001] Verify: manual check\n- [ ] 1.4 Other cwd. [REQ-AB-001] Verify: `cwd=src true`\n",
  );
  p.write(
    ARCH,
    "# Tasks\n\n- [x] 1.1 Old. [REQ-AB-001] Verify: `bun test tests/a.test.ts`\n- [x] 1.2 Gone. [REQ-AB-001] Verify: `bun test tests/gone.test.ts`\n- [x] 1.3 Npx. [REQ-AB-001] Verify: `npx -y @fission-ai/openspec@latest validate --all --strict`\n- [x] 1.4 Shared. [REQ-AB-001] Verify: `true`\n- [x] 1.5 Pinned. [REQ-AB-001] Verify: `npx spec-ctx@0.6.0 check`\n",
  );
});
afterAll(() => {
  if (savedGuard === undefined) delete process.env.SPECCTX_RERUN;
  else process.env.SPECCTX_RERUN = savedGuard;
  p.cleanup();
});

describe("impact requirements and tasks", () => {
  test("SCN-QRY-028-1 a tag and a named path give the requirements with their reasons", async () => {
    const e = await entries(p);
    const i = impactOf(p.root, e, "src/b.ts", {});
    expect(i.requirements.map((r) => [r.id, r.reason])).toEqual([["REQ-AB-002", "task names src/b.ts in 001/1.1"]]);
    expect(i.tasks.map((t) => t.id)).toEqual(["001/1.1"]);
    const a = impactOf(p.root, e, "src/a.ts", {});
    expect(a.requirements.map((r) => [r.id, r.reason])).toEqual([["REQ-AB-001", "implements, tag at src/a.ts:1"]]);
    expect(a.tasks.map((t) => t.id)).toEqual(["001/1.2", "001/1.3", "001/1.4"]);
  });

  test("SCN-QRY-028-3 a Covers line with a scenario lists the requirement once", async () => {
    const i = impactOf(p.root, await entries(p), "tests/s.test.ts", {});
    expect(i.requirements.map((r) => r.id)).toEqual(["REQ-AB-001"]);
    expect(i.requirements[0]!.reason).toMatch(/^covers, tag at tests\/s\.test\.ts:1/);
  });

  test("SCN-QRY-028-2 archived tasks are counted, and --archived lists them", async () => {
    const e = await entries(p);
    const d = impactOf(p.root, e, "src/a.ts", {});
    expect(d.tasks.some((t) => t.archived)).toBe(false);
    expect(d.archived).toEqual({ tasks: 5, dropped: 1, listed: false });
    const l = impactOf(p.root, e, "src/a.ts", { archived: true });
    expect(l.tasks.filter((t) => t.archived).map((t) => t.id)).toEqual(["000/1.1", "000/1.2", "000/1.3", "000/1.4", "000/1.5"]);
    expect(l.tasks.slice(0, 3).every((t) => !t.archived)).toBe(true);
    expect(l.archived.listed).toBe(true);
  });

  test("two runs give identical output", async () => {
    const e = await entries(p);
    const a = JSON.stringify(impactOf(p.root, e, "src/a.ts", { archived: true }));
    expect(JSON.stringify(impactOf(p.root, e, "src/a.ts", { archived: true }))).toBe(a);
  });
});

describe("impact verify plan", () => {
  test("SCN-QRY-030-1 one entry for each cwd and command, active first, no manual Verify", async () => {
    const i = impactOf(p.root, await entries(p), "src/a.ts", {});
    const plan = i.verify.map((v) => [v.cwd ?? "", v.command]);
    expect(plan).toEqual([
      ["", "bun test tests/a.test.ts"],
      ["src", "true"],
      ["", "npx -y @fission-ai/openspec@latest validate --all --strict"],
      ["", "npx spec-ctx@0.6.0 check"],
      ["", "true"],
    ]);
    const shared = i.verify.find((v) => v.command === "bun test tests/a.test.ts")!;
    expect(shared.tasks).toEqual(["000/1.1", "001/1.2"]);
    expect(i.verify.some((v) => v.tasks.includes("001/1.3"))).toBe(false);
  });

  test("SCN-QRY-030-3 a command that names a missing file drops, an npm spec stays", async () => {
    const i = impactOf(p.root, await entries(p), "src/a.ts", {});
    expect(i.verify.some((v) => v.command.includes("gone.test.ts"))).toBe(false);
    expect(i.verify.some((v) => v.command.includes("@fission-ai/openspec@latest"))).toBe(true);
    expect(i.verify.some((v) => v.command.includes("spec-ctx@0.6.0"))).toBe(true);
    expect(i.archived.dropped).toBe(1);
  });

  test("SCN-QRY-030-2 the plan shows 10 entries and --all shows every one", async () => {
    const q = new Project(null);
    try {
      q.write("openspec/specs/ab/spec.md", req("001"));
      q.write("src/a.ts", `${TAG}AB-001 tag\n`);
      const lines = Array.from({ length: 12 }, (_, n) => `- [x] 1.${n + 1} T${n}. [REQ-AB-001] Verify: \`echo ${String(n).padStart(2, "0")}\``).join("\n");
      q.write(ARCH, `# Tasks\n\n${lines}\n`);
      const e = await entries(q);
      const d = impactOf(q.root, e, "src/a.ts", {});
      expect(d.verify).toHaveLength(10);
      expect(d.more).toBe(2);
      expect(d.verify[0]!.command).toBe("echo 00");
      const all = impactOf(q.root, e, "src/a.ts", { all: true });
      expect(all.verify).toHaveLength(12);
      expect(all.more).toBe(0);
    } finally {
      q.cleanup();
    }
  });
});

describe("impact labels", () => {
  test("SCN-QRY-029-1 a stale task reads stale since the file, a requirement reads verified or unverified", async () => {
    const q = new Project(null);
    try {
      q.write("openspec/specs/ab/spec.md", req("001"));
      q.write("src/a.ts", `${TAG}AB-001 tag\n`);
      q.write("openspec/changes/001-x/tasks.md", "# Tasks\n\n- [ ] 1.1 Edit `src/a.ts`. [REQ-AB-001] Verify: `true`\n- [ ] 1.2 Later. [REQ-AB-001] Verify: `true`\n");
      await q.build();
      const before = impactOf(q.root, await entries(q), "src/a.ts", {});
      expect(before.tasks.map((t) => t.state)).toEqual(["no evidence", "no evidence"]);
      expect(before.requirements[0]!.state).toBe("unverified");
      expect((await q.run("task", "start", "001/1.1")).code).toBe(0);
      expect((await q.run("task", "done", "001/1.1")).code).toBe(0);
      const fresh = impactOf(q.root, await entries(q), "src/a.ts", {});
      expect(fresh.tasks[0]!.state).toBe("fresh");
      expect(fresh.requirements[0]!.state).toBe("verified");
      q.write("src/a.ts", `${TAG}AB-001 tag\nconst x = 2;\n`);
      q.touchForward("src/a.ts");
      const stale = impactOf(q.root, await entries(q), "src/a.ts", {});
      expect(stale.tasks[0]!.state).toBe("stale since src/a.ts");
      expect(stale.tasks[1]!.state).toBe("no evidence");
    } finally {
      q.cleanup();
    }
  });
});

describe("impact existence filter", () => {
  test("SCN-QRY-030-3 a glob and a redirect stay in the plan, a missing file still drops", async () => {
    const q = new Project(null);
    try {
      q.write("openspec/specs/ab/spec.md", req("001"));
      q.write("src/a.ts", `${TAG}AB-001 tag\n`);
      q.write("tests/a.test.ts", "const a = 1;\n");
      q.write("README.md", "x\n");
      q.write(
        ARCH,
        "# Tasks\n\n- [x] 1.1 Glob. [REQ-AB-001] Verify: `bun test tests/*.test.ts`\n- [x] 1.2 Redirect. [REQ-AB-001] Verify: `bun test tests/a.test.ts 2>/dev/null`\n" +
          "- [x] 1.3 Regex. [REQ-AB-001] Verify: `grep -q '^.ctx/x.json$' README.md || true`\n- [x] 1.4 Gone. [REQ-AB-001] Verify: `bun test tests/gone.test.ts`\n",
      );
      const i = impactOf(q.root, await entries(q), "src/a.ts", {});
      expect(i.verify.map((v) => v.command)).toEqual([
        "bun test tests/*.test.ts",
        "bun test tests/a.test.ts 2>/dev/null",
        "grep -q '^.ctx/x.json$' README.md || true",
      ]);
      expect(i.archived.dropped).toBe(1);
    } finally {
      q.cleanup();
    }
  });
});
