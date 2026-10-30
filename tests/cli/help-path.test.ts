// Covers: REQ-QRY-005, REQ-CLI-006
import { describe, expect, test } from "vitest";
import { commandPage, TABLE } from "../../src/cli/help.ts";
import { lintSte } from "../../src/lint/ste.ts";
import { Project } from "../helpers.ts";

describe("help of related and bundle", () => {
  test("both pages take an ID or a path and name the path error", async () => {
    const p = new Project(null);
    try {
      for (const cmd of ["related", "bundle"]) {
        const r = await p.run(cmd, "--help");
        expect(r.code).toBe(0);
        expect(r.out).toContain("<ID|path");
        expect(r.out).toContain("path");
        expect(r.out.split("\n").some((l) => l.includes("`2`") && l.includes("path"))).toBe(true);
      }
    } finally {
      p.cleanup();
    }
  });

  test("both pages pass lint ste with no disable", () => {
    for (const cmd of ["related", "bundle"]) {
      const c = TABLE.find((x) => x.name === cmd)!;
      const hard = lintSte(commandPage(c)).findings.filter((f) => f.level === "advisory-free");
      expect(hard, cmd).toEqual([]);
    }
  });
});
