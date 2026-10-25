// Covers: REQ-STAT-005
import { afterEach, describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Project, REPO } from "../helpers.ts";

let p: Project;
afterEach(() => p?.cleanup());

const CLI = join(REPO, "dist/cli.js");

function runLocal(steps: string[]): { code: number; out: string } {
  mkdirSync(p.path("scripts"), { recursive: true });
  cpSync(join(REPO, "scripts/ci-local.sh"), p.path("scripts/ci-local.sh"));
  writeFileSync(p.path("steps.txt"), steps.join("\n") + "\n");
  const r = spawnSync("bash", [p.path("scripts/ci-local.sh")], {
    encoding: "utf8",
    env: { ...process.env, SPECCTX_OPENSPEC: "/bin/true", SPECCTX_CI_STEPS_FILE: p.path("steps.txt") },
  });
  return { code: r.status ?? -1, out: r.stdout + r.stderr };
}
const log = (): Record<string, unknown>[] => readFileSync(p.path(".ctx/gate-log.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));

describe("gate log through ci-local", () => {
  test("SCN-STAT-005-4 one passing ci-local run grows the log by exactly one line", () => {
    p = new Project();
    const r = runLocal(["true", `node ${CLI} gate --strict --markdown "openspec/**/*.md"`, "true"]);
    expect(r.code, r.out).toBe(0);
    expect(log()).toHaveLength(1);
    expect(log()[0]).toMatchObject({ ok: true, failed_step: null });
  });

  test("ci-local appends no line of its own", () => {
    p = new Project();
    expect(runLocal(["true", "true"]).code).toBe(0);
    expect(runLocal(["false"]).code).toBe(1);
    expect(existsSync(p.path(".ctx/gate-log.jsonl"))).toBe(false);
  });
});
