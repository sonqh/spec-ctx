// Covers: REQ-IDX-004
import { afterEach, describe, expect, test } from "vitest";
import { unlinkSync } from "node:fs";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

describe("stale detection", () => {
  test("SCN-IDX-004-1 an edit after build rebuilds and the answer shows the edit", async () => {
    p = new Project();
    await p.build();
    p.write("openspec/specs/alpha/spec.md", p.read("openspec/specs/alpha/spec.md").replace("Lockfile writer", "Lockfile zebra writer"));
    p.touchForward("openspec/specs/alpha/spec.md");
    const r = await p.run("query", "zebra");
    expect(r.err).toContain("index rebuilt");
    expect(r.out).toContain("REQ-AAA-001");
  });

  test("SCN-IDX-004-2 a fresh index is silent on stderr", async () => {
    p = new Project();
    await p.build();
    for (const cmd of [["query", "x"], ["status"], ["related", "REQ-AAA-001"], ["bundle", "REQ-AAA-001"], ["check"]]) {
      expect((await p.run(...cmd)).err, cmd.join(" ")).toBe("");
    }
  });

  test("a missing index and a deleted file both rebuild", async () => {
    p = new Project();
    expect((await p.run("query", "x")).err).toContain("index rebuilt");
    unlinkSync(p.path("src/a.ts"));
    const r = await p.run("related", "REQ-AAA-001");
    expect(r.err).toContain("index rebuilt");
    expect(r.out).not.toContain("src/a.ts");
  });

  test("an index in the old format rebuilds", async () => {
    p = new Project();
    p.write(".ctx/index.json", JSON.stringify({ entries: [], problems: [], scanned: { files: 1, mtime_ns: 1 } }));
    expect((await p.run("status")).err).toContain("index rebuilt");
    p.write(".ctx/index.json", "{not json");
    expect((await p.run("status")).err).toContain("index rebuilt");
  });

  test("the stale check reads no file contents", async () => {
    p = new Project();
    await p.build();
    const fs = await import("node:fs");
    const { loadConfig } = await import("../../src/config.ts");
    const { scanner, walk, scannedOf } = await import("../../src/index/scan.ts");
    const sc = scanner(p.root, loadConfig(p.root));
    // the walk and the scanned record use readdir and stat only. Unreadable files still count.
    fs.chmodSync(p.path("src/a.ts"), 0o000);
    try {
      const files = walk(sc);
      expect(files.map((f) => f.path)).toContain("src/a.ts");
      expect(scannedOf(p.root, files).count).toBe(files.length);
    } finally {
      fs.chmodSync(p.path("src/a.ts"), 0o644);
    }
  });
});
