import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { executePlan, makePlan } from "../../src/apply/pipeline.ts";
import { cleanup, envOf, preparedHome, snapshot, walk } from "../helpers.ts";

describe("plan", () => {
  let home: string;
  beforeEach(() => (home = preparedHome()));
  afterEach(() => cleanup(home));

  // Covers: REQ-APPLY-001
  it("SCN-APPLY-001-1 nothing on disk: every artifact is create and plan writes nothing", () => {
    const before = snapshot(home);
    const dirsBefore = walk(home);
    const plan = makePlan(envOf(home));
    expect(plan.items.length).toBeGreaterThan(0);
    expect(plan.items.every((i) => i.action === "create")).toBe(true);
    expect(snapshot(home)).toEqual(before);
    expect(walk(home)).toEqual(dirsBefore);
  });

  // Covers: REQ-APPLY-001, REQ-ADPT-003
  it("SCN-ADPT-003-2 an agent that is not installed is listed as skip with a notice", () => {
    const h = preparedHome("valid-senior-ts.yaml", [".claude"]);
    try {
      const plan = makePlan(envOf(h));
      const codex = plan.items.filter((i) => i.agent === "codex");
      expect(codex.length).toBeGreaterThan(0);
      expect(codex.every((i) => i.action === "skip")).toBe(true);
      expect(plan.agents.find((a) => a.id === "codex")?.notice).toMatch(/not installed/);
    } finally {
      cleanup(h);
    }
  });

  // Covers: REQ-APPLY-001
  it("an enabled agent without an adapter is a skip line", () => {
    const h = preparedHome("valid-all-agents.yaml");
    try {
      const plan = makePlan(envOf(h));
      expect(plan.items.find((i) => i.agent === "cursor")?.action).toBe("skip");
    } finally {
      cleanup(h);
    }
  });

  // Covers: REQ-APPLY-001
  it("SCN-APPLY-001-2 a dropped language makes plan list its rule file as remove", () => {
    executePlan(makePlan(envOf(home)), envOf(home), new Date("2026-10-23T10:00:00Z"));
    const prof = join(home, ".agentrc/profile.yaml");
    writeFileSync(prof, readFileSync(prof, "utf8").replace("languages: [typescript, python]", "languages: [typescript]"));
    const before = snapshot(home);
    const plan = makePlan(envOf(home));
    const py = plan.items.filter((i) => i.path.endsWith("rules/lang-python.md"));
    expect(py.map((i) => [i.agent, i.action])).toEqual([["claude-code", "remove"]]);
    expect(snapshot(home)).toEqual(before);
  });
});
