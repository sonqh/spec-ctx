// Covers: REQ-IDX-002
import { afterEach, describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { Project } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

describe("record shape", () => {
  test("SCN-IDX-002-1 two builds are byte-identical", async () => {
    p = new Project();
    await p.build();
    const a = readFileSync(p.path(".ctx/index.json"));
    await p.build();
    expect(readFileSync(p.path(".ctx/index.json")).equals(a)).toBe(true);
  });

  test("SCN-IDX-002-2 the text field holds the lower-cased body", async () => {
    p = new Project();
    p.append("openspec/specs/alpha/spec.md",
      "\n### Requirement: REQ-AAA-003 Guard\nThe hook SHALL block a Push\nto main.\n\n#### Scenario: SCN-AAA-003-1 Block\n- **WHEN** a push runs\n- **THEN** it fails\n");
    const e = (await p.build()).entries.find((x: any) => x.id === "REQ-AAA-003");
    expect(e.text).toContain("push to main");
    expect(e.text).not.toContain("Push");
  });

  test("every entry has the record fields and the file is sorted JSON", async () => {
    p = new Project();
    const raw = (await p.build(), p.read(".ctx/index.json"));
    expect(raw.endsWith("}\n")).toBe(true);
    expect(raw.split("\n")[1]).toBe('  "entries": [');
    const idx = JSON.parse(raw);
    const keys = ["id", "kind", "file", "line", "title", "text", "change", "status", "canonical", "refs"];
    for (const e of idx.entries) {
      for (const k of keys) expect(e, k).toHaveProperty(k);
      expect(["req", "scn", "adr", "decision", "task", "code", "test"]).toContain(e.kind);
      expect(["active", "modified", "removed", "archived", "done", "open"]).toContain(e.status);
      if (!["req", "scn", "decision", "task"].includes(e.kind)) expect(e.text).toBe("");
      expect(Object.keys(e)).toEqual([...Object.keys(e)].sort());
    }
    expect(Object.keys(idx.scanned).sort()).toEqual(["count", "newest_mtime_ms"]);
    expect(idx.scanned.count).toBeGreaterThan(0);
    const order = idx.entries.map((e: any) => [e.id, e.file]);
    const sorted = [...order].sort((a: string[], b: string[]) => (a[0]! < b[0]! ? -1 : a[0]! > b[0]! ? 1 : a[1]! < b[1]! ? -1 : a[1]! > b[1]! ? 1 : 0));
    expect(order).toEqual(sorted);
    const by = new Map(idx.entries.map((e: any) => [e.id, e]));
    expect((by.get("REQ-AAA-001") as any).change).toBe("main");
    expect((by.get("REQ-BBB-001") as any).change).toBe("001-x");
    expect((by.get("001/1.1") as any).status).toBe("done");
    expect((by.get("001/1.2") as any).status).toBe("open");
  });

  test("SCN-IDX-002-3 parity: the index equals the golden recorded from the Python engine", async () => {
    const { Project: P, PARITY_FIXTURE } = await import("../helpers.ts");
    const pr = new P(PARITY_FIXTURE);
    try {
      const { execFileSync } = await import("node:child_process");
      // the golden harness pins every mtime, so the scanned record matches too
      execFileSync("find", [pr.root, "-exec", "env", "TZ=UTC", "touch", "-h", "-t", "202601010000", "{}", "+"]);
      const { rmSync } = await import("node:fs");
      rmSync(pr.path(".ctx/index.json"), { force: true });
      await pr.build();
      const golden = readFileSync(new URL("../fixtures/parity-golden/index.json", import.meta.url));
      expect(readFileSync(pr.path(".ctx/index.json")).equals(golden)).toBe(true);
    } finally {
      pr.cleanup();
    }
  });
});
