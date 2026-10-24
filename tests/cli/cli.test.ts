// Covers: REQ-CLI-001, REQ-CLI-002
import { afterEach, describe, expect, test } from "vitest";
import { mkdirSync, readFileSync, renameSync } from "node:fs";
import { Project, REPO } from "../helpers.ts";
import { VERSION } from "../../src/version.ts";

let p: Project;
afterEach(() => p?.cleanup());

describe("commands and flags", () => {
  test("SCN-CLI-001-1 --version prints the version and a newline", async () => {
    p = new Project();
    const r = await p.run("--version");
    expect(r).toEqual({ code: 0, out: VERSION + "\n", err: "" });
    expect(VERSION).toBe(JSON.parse(readFileSync(`${REPO}/package.json`, "utf8")).version);
  });

  test("SCN-CLI-001-2 root discovery from a deep folder", async () => {
    p = new Project();
    mkdirSync(p.path("src/deep/dir"), { recursive: true });
    await p.build();
    const top = await p.run("status");
    const deep = await p.runIn(p.path("src/deep/dir"), "status");
    expect(deep).toEqual(top);
    expect(deep.out).toContain("001-x  done 1  open 1");
    const viaFlag = await p.runIn("/", "status", "--root", p.root);
    expect(viaFlag.out).toBe(top.out);
  });

  test("a folder with no project root exits 2", async () => {
    p = new Project(null);
    const r = await p.run("status");
    expect(r.code).toBe(2);
    expect(r.err).toContain("no project root");
  });

  test("status shows the active change and the uncovered count", async () => {
    p = new Project();
    const r = await p.run("status");
    expect(r.code).toBe(0);
    expect(r.out).toContain("001-x  done 1  open 1");
    expect(r.out).toContain("uncovered active REQs in main: 0");
    expect(r.out).not.toContain("no active change");
    p.write(".ctx/handoff.md", "# Handoff\n");
    expect((await p.run("status")).out).toContain("handoff: .ctx/handoff.md");
  });

  test("SCN-CLI-001-3 nothing active prints the last archived change and the open questions", async () => {
    p = new Project();
    mkdirSync(p.path("openspec/changes/archive"));
    renameSync(p.path("openspec/changes/001-x"), p.path("openspec/changes/archive/2026-10-23-001-x"));
    p.write("openspec/changes/archive/2026-10-24-002-y/tasks.md", "# Tasks\n\n- [x] 1.1 Y. [REQ-AAA-001] Verify: a test.\n");
    p.write(".ctx/handoff.md", "# Handoff\nchange: none\nopen_questions:\n- Should apply keep order?\n  It changes the golden files.\n- Add a rules section?\n");
    const lines = (await p.run("status")).out.split("\n");
    expect(lines).toContain("no active change");
    expect(lines).toContain("last archived: 002-y");
    const i = lines.indexOf("open_questions: 2");
    expect(lines.slice(i + 1, i + 3)).toEqual(["- Should apply keep order?", "- Add a rules section?"]);
    const j = JSON.parse((await p.run("status", "--json")).out);
    expect(j.last_archived).toBe("002-y");
    expect(j.open_questions).toHaveLength(2);
  });

  test("status reads only the index", async () => {
    p = new Project();
    const { utimesSync } = await import("node:fs");
    const rel = "openspec/changes/001-x/tasks.md";
    const old = new Date("2026-01-01T00:00:00Z");
    utimesSync(p.path(rel), old, old);
    await p.build();
    // same file count and mtime, so the index stays fresh and status must not parse the file
    p.write(rel, p.read(rel).replace("- [ ] 1.2", "- [x] 1.2"));
    utimesSync(p.path(rel), old, old);
    expect((await p.run("status")).out).toContain("001-x  done 1  open 1");
  });

  test("--help prints the help on stdout", async () => {
    p = new Project();
    const r = await p.run("--help");
    expect(r.code).toBe(0);
    for (const c of ["build", "status", "query", "related", "bundle", "check", "init"]) expect(r.out).toContain(`  \`${c}`);
    expect((await p.run()).code).toBe(2);
  });

  test("SCN-CLI-001-4 help groups the commands under Read, Write, and Setup", async () => {
    p = new Project();
    const lines = (await p.run("--help")).out.split("\n");
    for (const h of ["Read:", "Write:", "Setup:"]) expect(lines).toContain(h);
    const cmds = ["id new", "id retire", "task next", "task start", "task verify", "task done", "task reopen", "handoff write", "handoff ask", "handoff resolve"];
    for (const c of cmds) expect(lines.some((l) => l.startsWith(`  \`${c}`)), c).toBe(true);
  });

  test("a group command without a subcommand exits 2 and names the subcommands", async () => {
    p = new Project();
    const r = await p.run("task");
    expect(r.code).toBe(2);
    expect(r.err).toContain("task needs a subcommand: next, start, verify, done, reopen");
  });
});

describe("exit codes and output style", () => {
  test("SCN-CLI-002-1 an unknown command exits 2 and prints the command list", async () => {
    p = new Project();
    const r = await p.run("frobnicate");
    expect(r.code).toBe(2);
    const list = r.err.split("\n").find((l) => l.startsWith("commands: "))!;
    for (const c of ["build", "status", "query", "related", "bundle", "check", "gate", "id new", "id retire", "task next", "task start", "task verify", "task done", "task reopen", "handoff write", "handoff ask", "handoff resolve", "init", "adopt"]) {
      expect(list.slice("commands: ".length).split(", ")).toContain(c);
    }
  });

  test("SCN-CLI-002-2 check --json prints JSON only", async () => {
    p = new Project();
    await p.build();
    const r = await p.run("check", "--json");
    expect(r.err).toBe("");
    expect(JSON.parse(r.out)).toEqual({ count: 0, findings: [], warnings: [] });
    for (const cmd of [["build"], ["status"], ["query", "lockfile"], ["related", "REQ-AAA-001"], ["bundle", "REQ-AAA-001"]]) {
      const x = await p.run(...cmd, "--json");
      expect(() => JSON.parse(x.out), cmd.join(" ")).not.toThrow();
    }
  });

  test("usage errors exit 2 and an internal error exits 3", async () => {
    p = new Project();
    expect((await p.run("query", "--limit", "x", "a")).code).toBe(2);
    expect((await p.run("check", "--nope")).code).toBe(2);
    expect((await p.run("related")).code).toBe(2);
    const idx = await p.build();
    // a damaged index that still looks fresh makes the engine fail
    p.write(".ctx/index.json", JSON.stringify({ ...idx, entries: 7 }));
    const r = await p.run("query", "x");
    expect(r.code).toBe(3);
    expect(r.err).toContain("internal error");
  });

  test("human output has no color codes and no emoji", async () => {
    p = new Project();
    for (const cmd of [["build"], ["status"], ["query", "lockfile"], ["related", "REQ-AAA-001"], ["bundle", "REQ-AAA-001"], ["check", "--strict"]]) {
      const r = await p.run(...cmd);
      expect(r.out).not.toMatch(/\x1b\[|\p{Extended_Pictographic}/u);
    }
  });
});
