import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readLock } from "../../src/apply/lockfile.ts";
import { driftStatus, executePlan, makePlan } from "../../src/apply/pipeline.ts";
import { main } from "../../src/cli/main.ts";
import { AGENTRC_VERSION } from "../../src/version.ts";
import { cleanup, envOf, preparedHome, testIo } from "../helpers.ts";

describe("lockfile and status", () => {
  let home: string;
  beforeEach(() => {
    home = preparedHome();
    const env = envOf(home);
    executePlan(makePlan(env), env, new Date("2026-10-23T10:00:00Z"));
  });
  afterEach(() => cleanup(home));

  // Covers: REQ-APPLY-005
  it("the lockfile holds the profile digest, artifact digests, adapter versions, and the agentrc version", () => {
    const lock = readLock(join(home, ".agentrc"))!;
    expect(lock.profile_digest).toMatch(/^[0-9a-f]{64}$/);
    expect(lock.agentrc).toBe(AGENTRC_VERSION);
    expect(Object.keys(lock.adapters).sort()).toEqual(["claude-code", "codex"]);
    expect(lock.artifacts.length).toBeGreaterThan(3);
    for (const a of lock.artifacts) expect(a.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(lock.catalog).toEqual([]);
  });

  // Covers: REQ-APPLY-005
  it("SCN-APPLY-005-1 a hand edit inside the managed block is drifted", () => {
    const p = join(home, ".claude/CLAUDE.md");
    expect(driftStatus(join(home, ".agentrc")).items.every((i) => i.state === "ok")).toBe(true);
    writeFileSync(p, readFileSync(p, "utf8").replace("Keep replies short.", "Write long replies."));
    const st = driftStatus(join(home, ".agentrc")).items.find((i) => i.path === p)!;
    expect(st.state).toBe("drifted");
  });

  // Covers: REQ-APPLY-005, REQ-CLI-003
  it("SCN-CLI-003-1 status exits 1 on drift and names the path", async () => {
    const p = join(home, ".codex/AGENTS.md");
    writeFileSync(p, readFileSync(p, "utf8").replace("Keep replies short.", "x"));
    const io = testIo(home);
    expect(await main(["status"], io)).toBe(1);
    expect(io.stdout).toContain(`drifted   codex       ${p}`);
  });

  // Covers: REQ-APPLY-005
  it("text outside the block and foreign JSON keys are not drift. A missing file is.", async () => {
    const md = join(home, ".claude/CLAUDE.md");
    writeFileSync(md, "my notes\n\n" + readFileSync(md, "utf8"));
    const s = join(home, ".claude/settings.json");
    const j = JSON.parse(readFileSync(s, "utf8"));
    j.cleanupPeriodDays = 9;
    writeFileSync(s, JSON.stringify(j));
    const io = testIo(home);
    expect(await main(["status"], io)).toBe(0);
    rmSync(join(home, ".claude/rules/lang-python.md"));
    expect(driftStatus(join(home, ".agentrc")).items.find((i) => i.path.endsWith("lang-python.md"))?.state).toBe("missing");
  });
});
